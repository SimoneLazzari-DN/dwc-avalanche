"use client";

import { useState } from "react";
import { ConnectButton } from "thirdweb/react";
import { AppProvider, fmtDwc, useApp } from "@/components/app-context";
import { Assistant, Marketplace, MyWelfare } from "@/components/member";
import { Overview } from "@/components/overview";
import { Hr, Regolamento, Vendor } from "@/components/staff";
import { chain, client, explorerAddress, wallets } from "@/lib/web3";

const TABS = [
  { id: "assistente", label: "Assistente" },
  { id: "welfare", label: "Il mio welfare" },
  { id: "marketplace", label: "Marketplace" },
  { id: "fornitore", label: "Fornitore", only: "vendor" },
  { id: "panoramica", label: "Panoramica HR", only: "hr" },
  { id: "hr", label: "Gestione HR", only: "hr" },
  { id: "regolamento", label: "Regolamento" },
] as const;

function Shell() {
  const { state, address, canSign } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("assistente");
  const me = state?.me;
  const tabs = TABS.filter((t) => !("only" in t) || (t.only === "hr" ? me?.isHr : me?.isVendor));

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/dreamnet-logo.png" alt="DreamNet Soc. Coop." className="h-9 w-auto sm:h-12" />
          <div className="hidden border-l border-line pl-4 sm:block">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">Welfare · B-Chainers Labs · Avalanche Fuji</p>
            <h1 className="text-xl font-semibold tracking-tight">DWC — il welfare della cooperativa, con le regole su blockchain</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {me && (
            <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/dwc-coin.png" alt="" className="h-6 w-6" />
              {fmtDwc(me.balanceDwc)}
            </span>
          )}
          {client ? (
            <ConnectButton
              client={client}
              chain={chain}
              wallets={wallets}
              connectButton={{ label: "Accedi con la tua email" }}
              connectModal={{ title: "Accedi al tuo welfare", size: "compact" }}
            />
          ) : (
            <span className="rounded-xl bg-accent-soft px-3 py-2 text-sm">Manca il Client ID thirdweb in web/.env.local</span>
          )}
        </div>
      </header>

      {address && !canSign && <p className="mt-3 break-all rounded-xl bg-accent-soft px-3 py-2 text-sm">Modalità sola lettura: stai guardando l&apos;app come {address}.</p>}

      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] sm:mt-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="mt-6">
        {state?.error && <p className="card text-sm">Non riesco a leggere la blockchain: {state.error}</p>}
        {tab === "assistente" && <Assistant />}
        {tab === "welfare" && <MyWelfare />}
        {tab === "marketplace" && <Marketplace />}
        {tab === "fornitore" && <Vendor />}
        {tab === "panoramica" && <Overview />}
        {tab === "hr" && <Hr />}
        {tab === "regolamento" && <Regolamento />}
      </main>

      {state?.deployment && (
        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <span>Contratti ({state.deployment.network}):</span>
          {Object.entries(state.deployment.contracts as Record<string, string>).map(([name, addr]) => (
            <a key={name} className="underline" href={explorerAddress(addr)} target="_blank" rel="noreferrer">
              {name}
            </a>
          ))}
        </footer>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
