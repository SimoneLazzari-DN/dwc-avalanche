"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { explorerAddress, explorerTx } from "@/lib/web3";
import { fmtDate, fmtDwc, short, useApp } from "./app-context";
import { Avatar } from "./visuals";

const num = (n: number) => (n ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);

const STATUS_LABEL: Record<string, string> = {
  richiesto: "In attesa del prezzo",
  preventivato: "Prezzo fissato",
  in_lavorazione: "Pagato · da consegnare",
  erogato: "Consegnato",
  rifiutato: "Rifiutato",
  annullato: "Annullato",
};

const KIND_LABEL: Record<string, string> = {
  base: "Credito base soci",
  ruolo: "Credito ruolo",
  extra: "Attività extra",
  commerciale: "Bonus commerciali",
  bonus: "Altri bonus HR",
};

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/// Barre orizzontali a una sola tinta: la grandezza si legge dalla lunghezza, il valore è scritto accanto.
function Bars({ rows, unit = "DWC", empty }: { rows: { label: string; value: number; note?: string }[]; unit?: string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.some((r) => r.value > 0)) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${num(r.value)} ${unit}${r.note ? ` · ${r.note}` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {num(r.value)} {unit}
              {r.note && <span className="ml-2 font-normal text-muted">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded bg-background">
            <div className="h-2.5 rounded bg-ink" style={{ width: `${Math.max(r.value > 0 ? 1.5 : 0, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/// Quota di DWC ricevuti già usata (nero) rispetto a quella ancora disponibile (grigio).
function UsedBar({ received, spent }: { received: number; spent: number }) {
  const pct = received > 0 ? Math.min(100, (spent / received) * 100) : 0;
  return (
    <div className="flex items-center gap-2" title={`Usato il ${pct.toFixed(0)}% dei DWC ricevuti`}>
      <div className="flex h-2.5 w-28 gap-0.5 overflow-hidden rounded bg-background">
        <div className="h-2.5 bg-ink" style={{ width: `${pct}%` }} />
        <div className="h-2.5 flex-1 bg-[#c9c4b8]" />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted">{pct.toFixed(0)}%</span>
    </div>
  );
}

function PersonCard({ person, onClose }: { person: any; onClose: () => void }) {
  const { state, nameOf } = useApp();
  const hr = state.hr;
  const a = person.address.toLowerCase();
  const orders = hr.orders.filter((o: any) => o.member.toLowerCase() === a).reverse();
  const movements = hr.movements.filter((m: any) => m.member.toLowerCase() === a);
  const byKind = Object.entries(KIND_LABEL).map(([kind, label]) => ({
    label,
    value: movements.filter((m: any) => m.kind === kind).reduce((t: number, m: any) => t + m.amountDwc, 0),
  }));
  const name = nameOf(person.address);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar address={person.address} size={64} />
            <div>
              <h2 className="text-xl font-semibold">{name}</h2>
              <a className="font-mono text-xs text-muted underline" href={explorerAddress(person.address)} target="_blank" rel="noreferrer">
                {short(person.address)} · vedi sulla blockchain ↗
              </a>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose}>Chiudi ✕</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip">{person.status === "attivo" ? "Membro attivo" : person.status === "uscito" ? `Uscito · saldo valido fino al ${fmtDate(person.balanceExpiresAt)}` : person.status}</span>
          {person.profile ? (
            <>
              <span className="chip">{person.profile.isSocio ? "Socio" : "Non socio"}</span>
              {person.profile.partTime && <span className="chip">Part-time</span>}
              <span className="chip">Livello {person.profile.level || "—"}</span>
              <span className="chip">Dal {fmtDate(person.profile.startDate)}</span>
              {person.profile.roles.map((r: string) => <span key={r} className="chip">{r}</span>)}
              {person.profile.bonusSuspended && <span className="chip">Bonus variabili sospesi</span>}
            </>
          ) : (
            <span className="chip">Profilo mancante</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Tile label="Saldo" value={num(person.balanceDwc)} hint="DWC disponibili" />
          <Tile label="Ricevuti" value={num(person.receivedDwc)} hint="dal regolamento" />
          <Tile label="Usati" value={num(person.spentDwc)} hint={person.ordersCount === 1 ? "1 ordine" : `${person.ordersCount} ordini`} />
        </div>

        <div className="card mt-4">
          <p className="label">Da dove arrivano i suoi DWC</p>
          <Bars rows={byKind.filter((r) => r.value > 0)} empty="Nessun accredito ancora." />
        </div>

        <div className="card mt-4">
          <p className="label">Acquisti e richieste</p>
          {orders.length ? (
            <ul className="divide-y divide-line">
              {orders.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{state.catalog[o.serviceId]?.title ?? `Servizio #${o.serviceId}`}</p>
                    <p className="text-xs text-muted">
                      Ordine #{o.id} · {fmtDate(o.createdAt)}{o.quantity > 1 ? ` · ${o.quantity} pezzi` : ""}{o.details ? ` · «${o.details}»` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums">{o.amountDwc ? fmtDwc(o.amountDwc) : "—"}</p>
                    <p className="text-xs text-muted">{STATUS_LABEL[o.status]}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nessun acquisto ancora.</p>
          )}
        </div>

        <div className="card mt-4">
          <p className="label">Tutti i movimenti · ognuno con la sua prova</p>
          {movements.length ? (
            <ul className="divide-y divide-line">
              {movements.map((m: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>{m.label.replace(/0x[a-fA-F0-9]{40}/g, (x: string) => nameOf(x))}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <b className="tabular-nums">{m.direction === "entrata" ? "+" : "−"}{num(m.amountDwc)}</b>
                    <a className="text-xs text-muted underline" href={explorerTx(m.tx)} target="_blank" rel="noreferrer">prova ↗</a>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nessun movimento.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

export function Overview() {
  const { state, nameOf } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const hr = state?.hr;
  if (!hr) return <p className="text-muted">Questa sezione è riservata a Risorse Umane.</p>;
  const st = hr.stats;
  const people = [...hr.members].sort((a: any, b: any) => b.balanceDwc - a.balanceDwc);
  const person = selected && people.find((p: any) => p.address === selected);
  const usedPct = st.mintedDwc > 0 ? ((st.mintedDwc - st.circulatingDwc) / st.mintedDwc) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Tile label="Persone nel network" value={num(st.activeMembers)} hint={st.exitedMembers ? `${st.exitedMembers} uscite (saldo a scadenza)` : "tutte attive"} />
        <Tile label="DWC emessi" value={num(st.mintedDwc)} hint="creati dal regolamento, mai a mano" />
        <Tile label="DWC disponibili" value={num(st.circulatingDwc)} hint={`${usedPct.toFixed(1)}% già utilizzato`} />
        <Tile label="In custodia" value={num(st.escrowDwc)} hint="pagati, servizio da consegnare" />
        <Tile label="Consumati" value={num(st.burnedDwc)} hint={`servizi consegnati · ${st.ordersTotal} ordini, ${st.ordersOpen} aperti`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="label">Da dove nascono i DWC</p>
          <p className="mb-4 text-sm text-muted">Ogni emissione è calcolata dal contratto secondo il regolamento in vigore.</p>
          <Bars rows={st.byCreditKind.map((r: any) => ({ label: r.label, value: r.dwc }))} empty="Ancora nessuna emissione." />
        </div>
        <div className="card">
          <p className="label">Dove vengono spesi</p>
          <p className="mb-4 text-sm text-muted">DWC pagati nel marketplace, per servizio.</p>
          <Bars rows={st.byService.map((r: any) => ({ label: r.label, value: r.dwc, note: `${r.orders} ${r.orders === 1 ? "ordine" : "ordini"}` }))} empty="Ancora nessun acquisto." />
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="label">Persone</p>
            <p className="text-sm text-muted">Tocca una persona per aprire la sua scheda: profilo, acquisti e movimenti.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-4 rounded bg-ink" /> usati</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-4 rounded bg-[#c9c4b8]" /> disponibili</span>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Persona</th>
                <th>Profilo</th>
                <th className="text-right">Ricevuti</th>
                <th className="text-right">Usati</th>
                <th className="text-right">Saldo</th>
                <th className="pl-4">Utilizzo</th>
                <th className="text-right">Ordini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {people.map((p: any) => (
                <tr key={p.address} className="cursor-pointer hover:bg-background" onClick={() => setSelected(p.address)}>
                  <td className="flex items-center gap-3 py-3 font-medium"><Avatar address={p.address} size={36} />{nameOf(p.address)}{p.status !== "attivo" && <span className="chip ml-2">{p.status}</span>}</td>
                  <td className="text-muted">{p.profile ? `${p.profile.isSocio ? "Socio" : "Non socio"} · ${p.profile.roles.join(", ") || "—"}` : "profilo mancante"}</td>
                  <td className="text-right tabular-nums">{num(p.receivedDwc)}</td>
                  <td className="text-right tabular-nums">{num(p.spentDwc)}</td>
                  <td className="text-right font-semibold tabular-nums">{num(p.balanceDwc)}</td>
                  <td className="pl-4"><UsedBar received={p.receivedDwc} spent={p.spentDwc} /></td>
                  <td className="text-right tabular-nums">{p.ordersCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {person && <PersonCard person={person} onClose={() => setSelected(null)} />}
    </div>
  );
}
