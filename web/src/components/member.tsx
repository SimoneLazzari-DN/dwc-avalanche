"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { actions, type Call } from "@/lib/actions";
import { explorerTx } from "@/lib/web3";
import { fmtDate, fmtDwc, useApp } from "./app-context";

const STATUS_LABEL: Record<string, string> = {
  richiesto: "In attesa del prezzo",
  preventivato: "Prezzo fissato: da accettare",
  in_lavorazione: "Pagato · in lavorazione",
  erogato: "Erogato",
  rifiutato: "Rifiutato",
  annullato: "Annullato",
};

// ───────────────────────────── Assistente AI ─────────────────────────────

type Proposal = Call & { id: string; done?: string | null };
type Msg = { role: "user" | "assistant"; content: string; proposals?: Proposal[] };

const SUGGESTIONS_MEMBER = [
  "Quanto ho di saldo e cosa posso farci?",
  "Vorrei 30 € di buoni pasto Edenred",
  "Ho uno scontrino Sigma da 80 €, quanto posso coprire con i DWC?",
  "Vorrei un weekend a Le Silve dal 17 al 19 ottobre, siamo in due",
];
const SUGGESTIONS_HR = [
  "Accredita 3 ore di baratto ad Anna per il sito del partner",
  "Fai l'accredito annuale a tutti i membri che non l'hanno ancora ricevuto",
  "Ci sono preventivi da prezzare?",
];

export function Assistant() {
  const { address, state, sign, busy, canSign } = useApp();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    if (!text.trim() || !address || thinking) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        { role: "assistant", content: data.error ? `⚠️ ${data.error}` : data.text || "Ecco l'operazione pronta da confermare.", proposals: data.proposals },
      ]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `⚠️ ${e?.message ?? e}` }]);
    } finally {
      setThinking(false);
    }
  }

  async function confirm(mi: number, pi: number) {
    const p = messages[mi].proposals![pi];
    const hash = await sign(p);
    setMessages((ms) =>
      ms.map((m, i) => (i !== mi ? m : { ...m, proposals: m.proposals!.map((x, j) => (j === pi ? { ...x, done: hash } : x)) })),
    );
    if (hash) {
      // l'assistente deve sapere che l'operazione è stata davvero eseguita
      setMessages((ms) => [...ms, { role: "assistant", content: `✅ Fatto: ${p.summary}. È registrato su Avalanche.` }]);
    }
  }

  const suggestions = [...SUGGESTIONS_MEMBER, ...(state?.me?.isHr ? SUGGESTIONS_HR : [])];

  return (
    <div className="card flex h-[70vh] flex-col p-0">
      <div className="border-b border-line px-5 py-3">
        <h2 className="font-semibold">Assistente welfare</h2>
        <p className="text-sm text-muted">Scrivi cosa ti serve. L&apos;assistente controlla le regole sul contratto e prepara l&apos;operazione: tu confermi e firmi.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} className="btn-ghost text-left" onClick={() => send(s)} disabled={!address}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, mi) => (
          <div key={mi} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-ink text-white" : "bg-background"}`}>
              {m.content}
              {m.proposals?.map((p, pi) => (
                <div key={p.id} className="mt-3 rounded-xl border border-line bg-white p-3 text-ink">
                  <p className="text-xs uppercase tracking-wide text-muted">Operazione pronta · verificata sul contratto</p>
                  <p className="mt-1 font-medium">{p.summary}</p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {p.contract}.{p.fn}()
                  </p>
                  {p.done ? (
                    <a className="mt-2 inline-block text-sm font-medium text-ok underline" href={explorerTx(p.done)} target="_blank" rel="noreferrer">
                      Registrata su Avalanche — vedi la prova ↗
                    </a>
                  ) : (
                    <button className="btn-accent mt-2" disabled={busy || !canSign} onClick={() => confirm(mi, pi)}>
                      {canSign ? "Conferma e firma" : "Accedi per firmare"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {thinking && <p className="text-sm text-muted">Sto controllando saldo e regole sul contratto…</p>}
        <div ref={end} />
      </div>

      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="input"
          placeholder={address ? "Es. «vorrei 20 € di buoni pasto»" : "Accedi con la tua email per iniziare"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!address}
        />
        <button className="btn" disabled={!address || thinking || !input.trim()}>
          Invia
        </button>
      </form>
    </div>
  );
}

// ───────────────────────────── Il mio welfare ─────────────────────────────

export function MyWelfare() {
  const { state, sign, busy, nameOf, address } = useApp();
  const me = state?.me;
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  if (!me) return <p className="text-muted">Accedi con la tua email per vedere il tuo welfare.</p>;

  const colleagues = (state.directory ?? []).filter((p: any) => p.kind === "membro" && p.address.toLowerCase() !== address?.toLowerCase());

  const myName = nameOf(address);
  const initials = myName.startsWith("0x") ? "?" : myName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const earned = (me.movements ?? []).filter((m: any) => m.direction === "entrata").reduce((t: number, m: any) => t + m.amountDwc, 0);
  const spentTotal = (me.movements ?? []).filter((m: any) => m.direction === "uscita").reduce((t: number, m: any) => t + m.amountDwc, 0);
  const caps = (state.catalog ?? []).filter((s: any) => s.monthlyCapDwc > 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card md:col-span-3 flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-semibold text-white">{initials}</div>
        <div className="mr-auto">
          <p className="text-xl font-semibold">Ciao{myName.startsWith("0x") ? "" : `, ${myName.split(" ")[0]}`} 👋</p>
          <p className="text-sm text-muted">Questo è il tuo welfare: ogni movimento che vedi è registrato su Avalanche e verificabile.</p>
        </div>
        <div className="text-right"><p className="label">Ricevuti</p><p className="font-semibold text-ok">+{fmtDwc(earned)}</p></div>
        <div className="text-right"><p className="label">Usati</p><p className="font-semibold text-accent">−{fmtDwc(spentTotal)}</p></div>
      </div>

      <div className="card md:col-span-1">
        <p className="label">Il mio saldo</p>
        <p className="text-4xl font-semibold tracking-tight">{fmtDwc(me.balanceDwc)}</p>
        <p className="mt-1 text-sm text-muted">1 DWC = 1 € di valore d&apos;acquisto nel catalogo</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="chip">{me.status === "attivo" ? "Membro attivo" : me.status === "uscito" ? "Uscito" : "Non ancora membro"}</span>
          {me.profile?.isSocio && <span className="chip">Socio</span>}
          {me.profile?.partTime && <span className="chip">Part-time</span>}
          {me.profile?.roles?.map((r: string) => <span key={r} className="chip">{r}</span>)}
          {me.profile?.bonusSuspended && <span className="chip">Bonus variabili sospesi</span>}
        </div>
        {me.status === "uscito" && (
          <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm">
            Il saldo resta spendibile nel marketplace fino al <b>{fmtDate(me.balanceExpiresAt)}</b>, poi si azzera.
          </p>
        )}
        {me.status === "non_membro" && (
          <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm">
            Questo indirizzo non è ancora nel registro dei membri. Comunicalo a Risorse Umane: <span className="font-mono text-xs break-all">{address}</span>
          </p>
        )}

        {caps.map((c: any) => {
          const used = me.spentThisMonth?.[c.id] ?? 0;
          return (
            <div key={c.id} className="mt-4">
              <div className="flex justify-between text-xs text-muted"><span>{c.title} · questo mese</span><span>{used} / {c.monthlyCapDwc}</span></div>
              <div className="mt-1 h-2 rounded-full bg-background"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, (used / c.monthlyCapDwc) * 100)}%` }} /></div>
            </div>
          );
        })}

        <div className="mt-6 border-t border-line pt-4">
          <p className="label">Scambia con un collega</p>
          <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Scegli…</option>
            {colleagues.map((p: any) => (
              <option key={p.address} value={p.address}>{p.name}</option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input className="input" type="number" min="0" placeholder="DWC" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button
              className="btn"
              disabled={busy || !to || !Number(amount)}
              onClick={() => sign({ ...actions.trasferisci_dwc({ destinatario: to, importo_dwc: Number(amount) }), summary: `Scambio di ${amount} DWC verso ${nameOf(to)}` })}
            >
              Invia
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">I DWC circolano solo tra i membri del network: il contratto blocca qualsiasi altro destinatario.</p>
        </div>
      </div>

      <div className="card md:col-span-2">
        <p className="label">Entrate e uscite</p>
        {me.movements?.length ? (
          <ul className="divide-y divide-line">
            {me.movements.map((m: any, i: number) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{m.label.replace(/0x[a-fA-F0-9]{40}/g, (a: string) => nameOf(a))}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <b className={m.direction === "entrata" ? "text-ok" : "text-accent"}>
                    {m.direction === "entrata" ? "+" : "−"}{fmtDwc(m.amountDwc)}
                  </b>
                  <a className="text-xs text-muted underline" href={explorerTx(m.tx)} target="_blank" rel="noreferrer">prova ↗</a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Ancora nessun movimento.</p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Marketplace ─────────────────────────────

function ServiceCard({ s }: { s: any }) {
  const { state, sign, busy, canSign, nameOf } = useApp();
  const [qty, setQty] = useState("1");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState("");
  const [date, setDate] = useState("");
  const [details, setDetails] = useState("");
  const spent = state?.me?.spentThisMonth?.[s.id] ?? 0;
  const isQuote = s.kind === "su_preventivo";

  const call = isQuote
    ? actions.richiedi_preventivo({ service_id: s.id, quantita: Number(qty) || 1, data_servizio: date || undefined, dettagli: details })
    : actions.riscatta_servizio({
        service_id: s.id,
        quantita: Number(qty) || 1,
        importo_dwc: Number(amount) || 0,
        importo_scontrino_eur: Number(receipt) || 0,
        data_servizio: date || undefined,
        dettagli: details,
      });

  return (
    <div className="card flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">{s.title}</h3>
        <span className="chip shrink-0">{isQuote ? "Su preventivo" : s.variableAmount ? "Importo libero" : fmtDwc(s.priceDwc)}</span>
      </div>
      <p className="mt-1 text-sm text-muted">{s.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {s.monthlyCapDwc > 0 && <span className="chip">Tetto {s.monthlyCapDwc}/mese · usati {spent}</span>}
        {s.maxCoveragePct > 0 && <span className="chip">Max {s.maxCoveragePct}% dello scontrino</span>}
        {s.minNoticeDays > 0 && <span className="chip">{s.minNoticeDays} giorni di preavviso</span>}
        {s.limitedStock && <span className="chip">{s.stock} posti rimasti</span>}
        <span className="chip">Fornitore: {nameOf(s.vendor)}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {!isQuote && s.variableAmount && (
          <input className="input" type="number" min="0" placeholder="DWC da usare" value={amount} onChange={(e) => setAmount(e.target.value)} />
        )}
        {(!s.variableAmount || isQuote) && (
          <input className="input" type="number" min="1" placeholder="Quantità" value={qty} onChange={(e) => setQty(e.target.value)} />
        )}
        {s.maxCoveragePct > 0 && (
          <input className="input" type="number" min="0" placeholder="Scontrino €" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
        )}
        {(s.minNoticeDays > 0 || isQuote) && <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        {isQuote && (
          <input className="input col-span-2" placeholder="Cosa ti serve? (struttura, date, persone…)" value={details} onChange={(e) => setDetails(e.target.value)} />
        )}
      </div>
      <button
        className="btn mt-3"
        disabled={busy || !canSign || !s.active || (isQuote && !details.trim())}
        onClick={() => sign({ ...call, summary: `${isQuote ? "Richiesta di preventivo" : "Riscatto"}: ${s.title}` })}
      >
        {isQuote ? "Chiedi il preventivo" : "Riscatta"}
      </button>
    </div>
  );
}

export function Marketplace() {
  const { state, sign, busy } = useApp();
  const title = (id: number) => state?.catalog?.[id]?.title ?? `#${id}`;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state?.catalog?.map((s: any) => <ServiceCard key={s.id} s={s} />)}
      </div>

      <div className="card">
        <p className="label">I miei ordini</p>
        {state?.myOrders?.length ? (
          <ul className="divide-y divide-line">
            {[...state.myOrders].reverse().map((o: any) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">#{o.id} · {title(o.serviceId)}</p>
                  <p className="text-muted">
                    {STATUS_LABEL[o.status]}{o.amountDwc ? ` · ${fmtDwc(o.amountDwc)}` : ""}{o.serviceDate ? ` · per il ${fmtDate(o.serviceDate)}` : ""}
                    {o.details ? ` · «${o.details}»` : ""}{o.note ? ` · nota: ${o.note}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {o.status === "preventivato" && (
                    <button className="btn-accent" disabled={busy} onClick={() => sign({ ...actions.accetta_preventivo({ order_id: o.id }), summary: `Accetto ${fmtDwc(o.amountDwc)} per ${title(o.serviceId)}` })}>
                      Accetta {fmtDwc(o.amountDwc)}
                    </button>
                  )}
                  {(o.status === "richiesto" || o.status === "preventivato") && (
                    <button className="btn-ghost" disabled={busy} onClick={() => sign(actions.ritira_richiesta({ order_id: o.id }))}>
                      Ritira
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nessun ordine.</p>
        )}
      </div>
    </div>
  );
}
