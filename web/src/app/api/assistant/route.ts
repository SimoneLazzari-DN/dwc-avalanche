// Assistente welfare: dalla richiesta in parole semplici all'operazione su Avalanche.
// L'AI non firma e non muove nulla: prepara l'operazione, la fa simulare sul contratto
// e la propone. A firmare è sempre la persona, dal suo portafoglio.
import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import { actions, type ActionName, type Call } from "@/lib/actions";
import { contracts, getState, getRegolamento, provider } from "@/lib/chain";
import { readDirectory } from "@/lib/directory";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const client = new Anthropic();

const SYSTEM = `Sei l'assistente welfare di una cooperativa. I soci e i collaboratori hanno un saldo in DWC (Dreamnet Welfare Coin, 1 DWC = 1 € di valore d'acquisto) su Avalanche, regolato da smart contract: un token che circola solo tra i membri, un regolamento a versioni che decide gli accrediti, un marketplace di benefit.

Il tuo compito: capire cosa vuole la persona e trasformarlo nell'operazione giusta sul contratto, usando gli strumenti. Tu non firmi nulla: ogni strumento prepara l'operazione e la simula sul contratto. Se la simulazione riesce, la persona vede un pulsante per confermare e firmare; se il contratto la rifiuterebbe, ricevi il motivo e lo spieghi, proponendo un'alternativa concreta quando esiste (per esempio un importo più basso che rientra nel tetto).

Chi ti scrive non è un tecnico. Rispondi in italiano semplice, breve, senza gergo blockchain: niente "transazione", "wallet", "smart contract" se non servono — parla di saldo, buoni, richieste, conferme. Non mostrare indirizzi 0x: usa i nomi della rubrica. Negli strumenti invece passa sempre l'indirizzo, ricavandolo dalla rubrica.

A ogni messaggio ricevi in <stato> la fotografia aggiornata letta dalla catena: saldo, profilo, catalogo con le sue regole (tetto mensile, quota massima dello scontrino, preavviso, posti), ordini, e la rubrica. È la fonte di verità: non inventare servizi, prezzi o saldi che non ci sono. Le date sono in secondi Unix; oggi è indicato nello stato.

Prima di preparare un'operazione assicurati di avere i dati che servono (quale servizio, quanto, quando, per chi); se manca qualcosa di essenziale chiedilo, una domanda sola. Se la richiesta è chiara, procedi senza chiedere conferma: la conferma è il pulsante di firma. Per i servizi su preventivo spiega che HR o il fornitore fisseranno il prezzo e che i DWC si scalano solo quando la persona accetta.

Gli strumenti riservati a Risorse Umane compaiono solo se chi scrive ha quel ruolo sul contratto.`;

type ToolDef = Anthropic.Tool & { name: ActionName };

const str = { type: "string" } as const;
const int = { type: "integer" } as const;
const num = { type: "number" } as const;
const address = { type: "string", description: "Indirizzo 0x della persona, preso dalla rubrica nello stato" } as const;
const date = { type: "string", description: "Data nel formato AAAA-MM-GG" } as const;

const tool = (name: ActionName, description: string, properties: Record<string, unknown>, required: string[]): ToolDef => ({
  name,
  description,
  input_schema: { type: "object", properties, required },
});

const MEMBER_TOOLS: ToolDef[] = [
  tool(
    "riscatta_servizio",
    "Riscatta un servizio a prezzo fisso del catalogo. Per i servizi a importo libero (buoni) indica importo_dwc; per quelli a unità indica quantita. Se il servizio ha una quota massima dello scontrino serve importo_scontrino_eur; se richiede preavviso serve data_servizio.",
    { service_id: int, quantita: int, importo_dwc: num, importo_scontrino_eur: num, data_servizio: date, dettagli: str },
    ["service_id"],
  ),
  tool(
    "richiedi_preventivo",
    "Invia una richiesta per un servizio su preventivo. In dettagli metti ciò che serve a chi deve valutarla (struttura, date, numero di persone…).",
    { service_id: int, quantita: int, data_servizio: date, dettagli: str },
    ["service_id", "dettagli"],
  ),
  tool("accetta_preventivo", "Accetta il prezzo fissato per una propria richiesta: i DWC vengono scalati.", { order_id: int }, ["order_id"]),
  tool("ritira_richiesta", "Ritira una propria richiesta non ancora pagata.", { order_id: int }, ["order_id"]),
  tool(
    "trasferisci_dwc",
    "Scambia DWC con un altro membro attivo del network.",
    { destinatario: address, importo_dwc: num },
    ["destinatario", "importo_dwc"],
  ),
];

const STAFF_TOOLS: ToolDef[] = [
  tool("fissa_preventivo", "Fissa il prezzo in DWC di una richiesta su preventivo.", { order_id: int, importo_dwc: num, nota: str }, ["order_id", "importo_dwc"]),
  tool("rifiuta_richiesta", "Rifiuta una richiesta non ancora pagata, con motivazione.", { order_id: int, nota: str }, ["order_id"]),
  tool("conferma_erogazione", "Conferma che un servizio pagato è stato erogato.", { order_id: int }, ["order_id"]),
];

const HR_TOOLS: ToolDef[] = [
  tool("accredito_annuale", "Accredito annuale (credito base soci + credito ruolo, riproporzionato) calcolato dal regolamento in vigore.", { membro: address, anno: int }, ["membro", "anno"]),
  tool(
    "accredita_attivita_extra",
    "Accredita ore di attività extra-lavorative (baratto sociale o progetti interni): la tariffa oraria la decide il regolamento in base a livello e status di socio. Ammesso solo per attività senza compenso in euro alla cooperativa.",
    { membro: address, minuti: int, progetto: str },
    ["membro", "minuti", "progetto"],
  ),
  tool(
    "accredita_classifica",
    "Premi della classifica commerciale. trimestre 1-4, oppure 0 per la classifica annuale. Usa l'indirizzo 0x0000000000000000000000000000000000000000 per una posizione vuota.",
    { anno: int, trimestre: int, primo: address, secondo: address, terzo: address },
    ["anno", "trimestre", "primo", "secondo", "terzo"],
  ),
  tool("accredita_bonus", "Bonus deciso da HR (produttività, sfide ed eventi interni).", { membro: address, importo_dwc: num, motivo: str }, ["membro", "importo_dwc", "motivo"]),
  tool("sospendi_bonus", "Sospende o riattiva i bonus variabili di una persona (sanzione disciplinare).", { membro: address, sospeso: { type: "boolean" } }, ["membro", "sospeso"]),
  tool("registra_uscita", "Registra l'uscita di un membro: il saldo resta spendibile 6 mesi, poi si azzera.", { membro: address }, ["membro"]),
  tool("annulla_ordine_pagato", "Annulla un ordine già pagato restituendo i DWC.", { order_id: int, nota: str }, ["order_id"]),
];

/// Traduce in parole il rifiuto del contratto.
function explainRevert(contractKey: Call["contract"], error: unknown): string {
  const data = (error as { data?: string })?.data;
  if (typeof data === "string" && data.length >= 10) {
    for (const c of Object.values(contracts)) {
      try {
        const parsed = c.interface.parseError(data);
        if (parsed) {
          const args = parsed.args.map((a: unknown) => (typeof a === "bigint" && a > BigInt(1e15) ? `${ethers.formatEther(a)} DWC` : String(a)));
          return `${parsed.name}(${args.join(", ")})`;
        }
      } catch {}
    }
  }
  return (error as Error)?.message?.slice(0, 300) ?? `Rifiutato da ${contractKey}`;
}

async function simulate(call: Call, from: string) {
  const c = contracts[call.contract];
  const data = c.interface.encodeFunctionData(call.fn, call.args);
  await provider.call({ from, to: await c.getAddress(), data });
}

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const { address: who, messages: history } = (await request.json()) as { address: string; messages: ChatTurn[] };
  if (!ethers.isAddress(who) || !Array.isArray(history) || history.length === 0) {
    return Response.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const [state, directory, regolamento] = await Promise.all([getState(who), readDirectory(), getRegolamento()]);
  const isHr = Boolean(state.me?.isHr);
  const isStaff = isHr || Boolean(state.me?.isVendor);
  const tools = [...MEMBER_TOOLS, ...(isStaff ? STAFF_TOOLS : []), ...(isHr ? HR_TOOLS : [])];

  const snapshot = {
    oggi: new Date().toISOString().slice(0, 10),
    chi_scrive: state.me,
    i_miei_ordini: state.myOrders,
    ordini_da_gestire_come_fornitore: state.vendorOrders,
    catalogo: state.catalog,
    rubrica: directory,
    regolamento_in_vigore: regolamento.versions.find((v) => v.inVigore),
    ...(isHr ? { risorse_umane: state.hr } : {}),
  };

  const last = history[history.length - 1];
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `<stato>\n${JSON.stringify(snapshot)}\n</stato>\n\n${last.content}` },
  ];

  const proposals: (Call & { id: string })[] = [];
  let text = "";

  try {
    for (let turn = 0; turn < 6; turn++) {
      const response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 16000,
        output_config: { effort: "low" },
        system: SYSTEM,
        tools,
        messages,
      });

      text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (response.stop_reason === "refusal") {
        text = "Non posso aiutarti con questa richiesta.";
        break;
      }
      if (response.stop_reason !== "tool_use") break;

      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const allowed = tools.some((t) => t.name === block.name);
        const build = actions[block.name as ActionName] as ((p: never) => Call) | undefined;
        if (!allowed || !build) {
          results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "Strumento non disponibile per questa persona." });
          continue;
        }
        try {
          const call = build(block.input as never);
          await simulate(call, who);
          proposals.push({ ...call, id: block.id });
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Simulazione sul contratto riuscita. L'operazione è pronta: la persona vede ora il pulsante per confermare e firmare. Non è ancora stata eseguita.",
          });
        } catch (e) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content: `Il contratto rifiuterebbe questa operazione: ${explainRevert("market", e)}. Nulla è stato eseguito.`,
          });
        }
      }
      messages.push({ role: "user", content: results });
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Chiave API Anthropic mancante o non valida (web/.env.local)." }, { status: 500 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Troppe richieste all'assistente: riprova tra poco." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return Response.json({ error: `Errore dell'assistente (${e.status}): ${e.message}` }, { status: 502 });
    }
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  return Response.json({ text, proposals });
}
