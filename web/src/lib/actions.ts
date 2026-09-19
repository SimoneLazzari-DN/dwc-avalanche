// Le operazioni che una persona può firmare, descritte una volta sola:
// le usano sia i pulsanti dell'interfaccia sia l'assistente AI.
import { parseEther, encodeBytes32String } from "ethers";

export type ContractKey = "token" | "rules" | "market";

/// Chiamata pronta da firmare. Gli interi grandi viaggiano come stringhe (JSON non li regge).
export type Call = {
  contract: ContractKey;
  fn: string;
  args: unknown[];
  summary: string;
};

const dwc = (n: number | string | undefined) => parseEther(String(n ?? 0)).toString();
const day = (iso?: string) => (iso ? String(Math.floor(new Date(`${iso}T12:00:00Z`).getTime() / 1000)) : "0");

export const actions = {
  // ── membro ──
  riscatta_servizio: (p: {
    service_id: number;
    quantita?: number;
    importo_dwc?: number;
    importo_scontrino_eur?: number;
    data_servizio?: string;
    dettagli?: string;
  }): Call => ({
    contract: "market",
    fn: "redeem",
    args: [p.service_id, p.quantita ?? 1, dwc(p.importo_dwc), dwc(p.importo_scontrino_eur), day(p.data_servizio), p.dettagli ?? ""],
    summary: `Riscatto del servizio #${p.service_id}`,
  }),
  richiedi_preventivo: (p: { service_id: number; quantita?: number; data_servizio?: string; dettagli: string }): Call => ({
    contract: "market",
    fn: "requestQuote",
    args: [p.service_id, p.quantita ?? 1, day(p.data_servizio), p.dettagli],
    summary: `Richiesta di preventivo per il servizio #${p.service_id}`,
  }),
  accetta_preventivo: (p: { order_id: number }): Call => ({
    contract: "market",
    fn: "acceptQuote",
    args: [p.order_id],
    summary: `Accettazione del preventivo dell'ordine #${p.order_id}`,
  }),
  ritira_richiesta: (p: { order_id: number }): Call => ({
    contract: "market",
    fn: "withdrawRequest",
    args: [p.order_id],
    summary: `Ritiro della richiesta #${p.order_id}`,
  }),
  trasferisci_dwc: (p: { destinatario: string; importo_dwc: number }): Call => ({
    contract: "token",
    fn: "transfer",
    args: [p.destinatario, dwc(p.importo_dwc)],
    summary: `Scambio di ${p.importo_dwc} DWC verso ${p.destinatario}`,
  }),

  // ── HR ──
  aggiungi_membro: (p: { membro: string }): Call => ({
    contract: "token",
    fn: "addMember",
    args: [p.membro],
    summary: `Nuovo membro ${p.membro}`,
  }),
  imposta_profilo: (p: {
    membro: string;
    socio: boolean;
    part_time: boolean;
    data_ingresso: string;
    livello: string;
    ruoli: string[];
  }): Call => ({
    contract: "rules",
    fn: "setProfile",
    args: [
      p.membro,
      p.socio,
      p.part_time,
      day(p.data_ingresso),
      p.livello ? encodeBytes32String(p.livello) : "0x" + "0".repeat(64),
      p.ruoli.map((r) => encodeBytes32String(r)),
    ],
    summary: `Profilo di ${p.membro}`,
  }),
  accredito_annuale: (p: { membro: string; anno: number }): Call => ({
    contract: "rules",
    fn: "accrueAnnual",
    args: [p.membro, p.anno],
    summary: `Accredito annuale ${p.anno} a ${p.membro}`,
  }),
  // il contratto conta in minuti (per gestire le mezz'ore); alle persone si chiede in ore
  accredita_attivita_extra: (p: { membro: string; ore: number; progetto: string }): Call => ({
    contract: "rules",
    fn: "creditExtraActivity",
    args: [p.membro, Math.round(Number(p.ore) * 60), p.progetto],
    summary: `Attività extra: ${p.ore} ore a ${p.membro} (${p.progetto})`,
  }),
  accredita_classifica: (p: { anno: number; trimestre: number; primo: string; secondo: string; terzo: string }): Call => ({
    contract: "rules",
    fn: "creditRanking",
    args: [p.anno, p.trimestre, [p.primo, p.secondo, p.terzo]],
    summary: p.trimestre ? `Classifica commerciale T${p.trimestre} ${p.anno}` : `Classifica commerciale annuale ${p.anno}`,
  }),
  accredita_bonus: (p: { membro: string; importo_dwc: number; motivo: string }): Call => ({
    contract: "rules",
    fn: "creditBonus",
    args: [p.membro, dwc(p.importo_dwc), p.motivo],
    summary: `Bonus di ${p.importo_dwc} DWC a ${p.membro} (${p.motivo})`,
  }),
  sospendi_bonus: (p: { membro: string; sospeso: boolean }): Call => ({
    contract: "rules",
    fn: "setBonusSuspended",
    args: [p.membro, p.sospeso],
    summary: `${p.sospeso ? "Sospensione" : "Riattivazione"} dei bonus variabili di ${p.membro}`,
  }),
  registra_uscita: (p: { membro: string }): Call => ({
    contract: "token",
    fn: "markExit",
    args: [p.membro],
    summary: `Uscita di ${p.membro}: saldo valido ancora 6 mesi`,
  }),
  azzera_saldo_scaduto: (p: { membro: string }): Call => ({
    contract: "token",
    fn: "sweepExited",
    args: [p.membro],
    summary: `Azzeramento del saldo scaduto di ${p.membro}`,
  }),

  // ── HR o fornitore ──
  fissa_preventivo: (p: { order_id: number; importo_dwc: number; nota?: string }): Call => ({
    contract: "market",
    fn: "setQuote",
    args: [p.order_id, dwc(p.importo_dwc), p.nota ?? ""],
    summary: `Preventivo di ${p.importo_dwc} DWC per l'ordine #${p.order_id}`,
  }),
  rifiuta_richiesta: (p: { order_id: number; nota?: string }): Call => ({
    contract: "market",
    fn: "rejectRequest",
    args: [p.order_id, p.nota ?? ""],
    summary: `Rifiuto della richiesta #${p.order_id}`,
  }),
  conferma_erogazione: (p: { order_id: number }): Call => ({
    contract: "market",
    fn: "markFulfilled",
    args: [p.order_id],
    summary: `Servizio erogato: ordine #${p.order_id}`,
  }),
  annulla_ordine_pagato: (p: { order_id: number; nota?: string }): Call => ({
    contract: "market",
    fn: "cancelPaid",
    args: [p.order_id, p.nota ?? ""],
    summary: `Annullamento con rimborso dell'ordine #${p.order_id}`,
  }),
  assegna_fornitore: (p: { service_id: number; fornitore: string }): Call => ({
    contract: "market",
    fn: "setVendor",
    args: [p.service_id, p.fornitore],
    summary: `Fornitore del servizio #${p.service_id}: ${p.fornitore}`,
  }),
};

export type ActionName = keyof typeof actions;
