"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { actions } from "@/lib/actions";
import { explorerAddress } from "@/lib/web3";
import { fmtDate, fmtDwc, short, useApp } from "./app-context";

const ZERO = "0x0000000000000000000000000000000000000000";

// ───────────────────────────── Ordini da gestire (HR e fornitore) ─────────────────────────────

function OrdersToHandle({ orders }: { orders: any[] }) {
  const { state, sign, busy, nameOf } = useApp();
  const [price, setPrice] = useState<Record<number, string>>({});
  const open = orders.filter((o) => ["richiesto", "preventivato", "in_lavorazione"].includes(o.status));
  if (!open.length) return <p className="text-sm text-muted">Niente da gestire.</p>;
  return (
    <ul className="divide-y divide-line">
      {open.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div>
            <p className="font-medium">#{o.id} · {state.catalog[o.serviceId]?.title} · {nameOf(o.member)}</p>
            <p className="text-muted">
              {o.status.replace("_", " ")}{o.amountDwc ? ` · ${fmtDwc(o.amountDwc)}` : ""}{o.serviceDate ? ` · per il ${fmtDate(o.serviceDate)}` : ""}
              {o.details ? ` · «${o.details}»` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(o.status === "richiesto" || o.status === "preventivato") && (
              <>
                <input className="input w-24" type="number" placeholder="DWC" value={price[o.id] ?? ""} onChange={(e) => setPrice({ ...price, [o.id]: e.target.value })} />
                <button className="btn" disabled={busy || !Number(price[o.id])} onClick={() => sign(actions.fissa_preventivo({ order_id: o.id, importo_dwc: Number(price[o.id]), nota: "Disponibile" }))}>
                  Fissa il prezzo
                </button>
                <button className="btn-ghost" disabled={busy} onClick={() => sign(actions.rifiuta_richiesta({ order_id: o.id, nota: "Non disponibile" }))}>
                  Rifiuta
                </button>
              </>
            )}
            {o.status === "in_lavorazione" && (
              <button className="btn-accent" disabled={busy} onClick={() => sign(actions.conferma_erogazione({ order_id: o.id }))}>
                Conferma erogazione
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Vendor() {
  const { state } = useApp();
  return (
    <div className="card">
      <p className="label">Ordini dei miei servizi</p>
      <p className="mb-3 text-sm text-muted">Quando confermi l&apos;erogazione, i DWC in custodia vengono bruciati: il servizio è stato reso, il punto welfare è consumato.</p>
      <OrdersToHandle orders={state?.vendorOrders ?? []} />
    </div>
  );
}

// ───────────────────────────── Back-office HR ─────────────────────────────

export function Hr() {
  const { state, sign, busy, nameOf, refresh } = useApp();
  const hr = state?.hr;
  const rules = state?.regolamento?.versions?.find((v: any) => v.inVigore);
  const year = new Date().getUTCFullYear();

  const [form, setForm] = useState({ name: "", address: "", kind: "membro", socio: false, partTime: false, start: `${year}-01-01`, level: "SENIOR", roles: [] as string[] });
  const [target, setTarget] = useState("");
  const [minutes, setMinutes] = useState("");
  const [project, setProject] = useState("");
  const [bonus, setBonus] = useState("");
  const [reason, setReason] = useState("");
  const [rank, setRank] = useState({ quarter: "3", first: "", second: "", third: "" });
  const [vendorFor, setVendorFor] = useState({ service: "0", address: "" });

  if (!hr) return <p className="text-muted">Questa sezione è riservata a Risorse Umane.</p>;

  async function saveDirectory() {
    await fetch("/api/directory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: form.address, name: form.name, kind: form.kind }) });
    await refresh();
  }

  const members: any[] = hr.members;
  const isMember = members.some((m) => m.address.toLowerCase() === form.address.toLowerCase());
  const people = (state.directory ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="label">Membri del network</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr><th className="py-2">Persona</th><th>Stato</th><th>Profilo</th><th className="text-right">Saldo</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => (
                <tr key={m.address}>
                  <td className="py-2.5">
                    <b>{nameOf(m.address)}</b>{" "}
                    <a className="font-mono text-xs text-muted underline" href={explorerAddress(m.address)} target="_blank" rel="noreferrer">{short(m.address)}</a>
                  </td>
                  <td>{m.status}{m.status === "uscito" ? ` · scade il ${fmtDate(m.balanceExpiresAt)}` : ""}</td>
                  <td className="text-muted">
                    {m.profile ? `${m.profile.isSocio ? "Socio" : "Non socio"}${m.profile.partTime ? " · part-time" : ""} · ${m.profile.roles.join(", ") || "—"}` : "profilo mancante"}
                    {m.profile?.bonusSuspended ? " · bonus sospesi" : ""}
                  </td>
                  <td className="text-right font-medium">{fmtDwc(m.balanceDwc)}</td>
                  <td className="space-x-1 text-right">
                    {m.status === "attivo" && m.profile && (
                      <button className="btn-ghost" disabled={busy} onClick={() => sign({ ...actions.accredito_annuale({ membro: m.address, anno: year }), summary: `Accredito annuale ${year} a ${nameOf(m.address)}` })}>
                        Accredito {year}
                      </button>
                    )}
                    {m.status === "attivo" && (
                      <button className="btn-ghost" disabled={busy} onClick={() => sign({ ...actions.registra_uscita({ membro: m.address }), summary: `Uscita di ${nameOf(m.address)}` })}>
                        Registra uscita
                      </button>
                    )}
                    {m.status === "uscito" && m.balanceExpiresAt * 1000 < Date.now() && (
                      <button className="btn-ghost" disabled={busy} onClick={() => sign(actions.azzera_saldo_scaduto({ membro: m.address }))}>Azzera saldo</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <p className="label">Nuova persona · profilo</p>
          <p className="text-sm text-muted">Il nome resta nella rubrica interna, fuori dalla blockchain. Sulla catena va solo l&apos;indirizzo.</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Nome (rubrica interna)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="membro">Membro</option><option value="fornitore">Fornitore</option><option value="hr">HR</option>
            </select>
            <input className="input col-span-2 font-mono text-xs" placeholder="Indirizzo 0x… (lo vede la persona dopo l'accesso)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value.trim() })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={!form.name || form.address.length !== 42} onClick={saveDirectory}>1 · Salva in rubrica</button>
            <button className="btn-ghost" disabled={busy || form.address.length !== 42 || isMember || form.kind !== "membro"} onClick={() => sign({ ...actions.aggiungi_membro({ membro: form.address }), summary: `Nuovo membro: ${form.name || short(form.address)}` })}>
              2 · Aggiungi al network
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.socio} onChange={(e) => setForm({ ...form, socio: e.target.checked })} /> Socio lavoratore / sovventore</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.partTime} onChange={(e) => setForm({ ...form, partTime: e.target.checked })} /> Part-time</label>
            <div><span className="label">Data di ingresso</span><input className="input" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div><span className="label">Livello (tariffa oraria)</span>
              <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option>SENIOR</option><option>JUNIOR</option><option>STAGISTA</option>
              </select>
            </div>
            <div className="col-span-2">
              <span className="label">Ruoli (i crediti si sommano)</span>
              <div className="flex flex-wrap gap-2">
                {rules?.roles.map((r: any) => (
                  <label key={r.key} className="chip cursor-pointer gap-1.5">
                    <input type="checkbox" checked={form.roles.includes(r.key)} onChange={(e) => setForm({ ...form, roles: e.target.checked ? [...form.roles, r.key] : form.roles.filter((x) => x !== r.key) })} />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button
            className="btn"
            disabled={busy || !isMember}
            onClick={() => sign({ ...actions.imposta_profilo({ membro: form.address, socio: form.socio, part_time: form.partTime, data_ingresso: form.start, livello: form.level, ruoli: form.roles }), summary: `Profilo di ${form.name || short(form.address)}` })}
          >
            3 · Salva il profilo sul contratto
          </button>
        </div>

        <div className="card space-y-3">
          <p className="label">Accrediti</p>
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Scegli la persona…</option>
            {members.filter((m) => m.status === "attivo").map((m) => <option key={m.address} value={m.address}>{nameOf(m.address)}</option>)}
          </select>

          <div className="rounded-xl bg-background p-3">
            <p className="text-sm font-medium">Attività extra (baratto sociale)</p>
            <p className="text-xs text-muted">La tariffa oraria la decide il regolamento: tu indichi solo il tempo.</p>
            <div className="mt-2 flex gap-2">
              <input className="input w-28" type="number" placeholder="Minuti" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <input className="input" placeholder="Progetto" value={project} onChange={(e) => setProject(e.target.value)} />
              <button className="btn" disabled={busy || !target || !Number(minutes) || !project} onClick={() => sign({ ...actions.accredita_attivita_extra({ membro: target, minuti: Number(minutes), progetto: project }), summary: `Attività extra: ${minutes} min a ${nameOf(target)}` })}>Accredita</button>
            </div>
          </div>

          <div className="rounded-xl bg-background p-3">
            <p className="text-sm font-medium">Bonus HR · sanzioni</p>
            <div className="mt-2 flex gap-2">
              <input className="input w-28" type="number" placeholder="DWC" value={bonus} onChange={(e) => setBonus(e.target.value)} />
              <input className="input" placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="btn" disabled={busy || !target || !Number(bonus) || !reason} onClick={() => sign({ ...actions.accredita_bonus({ membro: target, importo_dwc: Number(bonus), motivo: reason }), summary: `Bonus di ${bonus} DWC a ${nameOf(target)}` })}>Accredita</button>
            </div>
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost" disabled={busy || !target} onClick={() => sign({ ...actions.sospendi_bonus({ membro: target, sospeso: true }), summary: `Bonus variabili sospesi per ${nameOf(target)}` })}>Sospendi bonus variabili</button>
              <button className="btn-ghost" disabled={busy || !target} onClick={() => sign({ ...actions.sospendi_bonus({ membro: target, sospeso: false }), summary: `Bonus variabili riattivati per ${nameOf(target)}` })}>Riattiva</button>
            </div>
          </div>

          <div className="rounded-xl bg-background p-3">
            <p className="text-sm font-medium">Classifica commerciale</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <select className="input" value={rank.quarter} onChange={(e) => setRank({ ...rank, quarter: e.target.value })}>
                <option value="1">T1</option><option value="2">T2</option><option value="3">T3</option><option value="4">T4</option><option value="0">Annuale</option>
              </select>
              {(["first", "second", "third"] as const).map((k, i) => (
                <select key={k} className="input" value={rank[k]} onChange={(e) => setRank({ ...rank, [k]: e.target.value })}>
                  <option value="">{i + 1}° —</option>
                  {members.filter((m) => m.status === "attivo").map((m) => <option key={m.address} value={m.address}>{nameOf(m.address)}</option>)}
                </select>
              ))}
            </div>
            <button className="btn mt-2" disabled={busy || !rank.first} onClick={() => sign(actions.accredita_classifica({ anno: year, trimestre: Number(rank.quarter), primo: rank.first || ZERO, secondo: rank.second || ZERO, terzo: rank.third || ZERO }))}>
              Accredita i premi
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="label">Preventivi e ordini da gestire</p>
        <OrdersToHandle orders={hr.orders} />
      </div>

      <div className="card">
        <p className="label">Assegna un fornitore a un servizio</p>
        <div className="flex flex-wrap gap-2">
          <select className="input max-w-xs" value={vendorFor.service} onChange={(e) => setVendorFor({ ...vendorFor, service: e.target.value })}>
            {state.catalog.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <select className="input max-w-xs" value={vendorFor.address} onChange={(e) => setVendorFor({ ...vendorFor, address: e.target.value })}>
            <option value="">Scegli dalla rubrica…</option>
            {people.filter((p) => p.kind === "fornitore").map((p) => <option key={p.address} value={p.address}>{p.name}</option>)}
          </select>
          <button className="btn" disabled={busy || !vendorFor.address} onClick={() => sign({ ...actions.assegna_fornitore({ service_id: Number(vendorFor.service), fornitore: vendorFor.address }), summary: `Fornitore: ${nameOf(vendorFor.address)}` })}>Assegna</button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Regolamento ─────────────────────────────

export function Regolamento() {
  const { state } = useApp();
  const versions: any[] = state?.regolamento?.versions ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Ogni versione approvata del regolamento è scritta nel contratto e non si può più modificare: per cambiare le regole se ne pubblica una nuova. Ogni accredito ricorda con quale versione è stato calcolato.
      </p>
      {[...versions].reverse().map((v) => (
        <div key={v.version} className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">v{v.version} · {v.name}</h3>
            <span className={`chip ${v.inVigore ? "!border-ok !bg-ok-soft !text-ok" : ""}`}>{v.inVigore ? "In vigore" : "Storica"} · dal {fmtDate(v.effectiveFrom)}</span>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div>
              <p className="label">Credito base annuale</p>
              <p className="text-sm">Socio: <b>{v.baseSocio}</b> · Non socio: <b>{v.baseNonSocio}</b></p>
              <p className="label mt-3">Classifiche commerciali</p>
              <p className="text-sm">Trimestrale: {v.quarterlyPrizes.join(" / ")}<br />Annuale: {v.annualPrizes.join(" / ")}</p>
            </div>
            <div>
              <p className="label">Credito ruolo (socio / non socio)</p>
              <ul className="text-sm">
                {v.roles.map((r: any) => <li key={r.key}>{r.label}: <b>{r.creditSocio}</b> / <b>{r.creditNonSocio}</b>{r.halvedIfPartTime ? " · ½ part-time" : ""}</li>)}
              </ul>
            </div>
            <div>
              <p className="label">Attività extra, DWC/ora (socio / non socio)</p>
              <ul className="text-sm">
                {v.hourly.map((h: any) => <li key={h.level}>{h.level}: <b>{h.socio}</b> / <b>{h.nonSocio}</b></li>)}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
