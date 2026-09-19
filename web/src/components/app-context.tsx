"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import type { Call } from "@/lib/actions";
import { explainError } from "@/lib/errors";
import { explorerTx, prepare } from "@/lib/web3";

type Notice = { kind: "ok" | "error" | "pending"; text: string; hash?: string };

type Ctx = {
  state: any;
  address?: string;
  canSign: boolean;
  busy: boolean;
  notice: Notice | null;
  sign: (call: Call) => Promise<string | null>;
  nameOf: (address?: string) => string;
  refresh: () => Promise<void>;
  notify: (text: string, kind?: Notice["kind"]) => void;
};

const AppContext = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppContext)!;

export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const fmtDwc = (n?: number) => `${(n ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 2 })} DWC`;
export const fmtDate = (ts?: number) => (ts ? new Date(ts * 1000).toLocaleDateString("it-IT") : "—");

export function AppProvider({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const { mutateAsync } = useSendAndConfirmTransaction();
  const [viewAs, setViewAs] = useState<string>();
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Solo lettura, per le prove: ?as=0x… mostra l'app come la vede quell'indirizzo.
  useEffect(() => {
    setViewAs(new URLSearchParams(window.location.search).get("as") ?? undefined);
  }, []);
  const address = account?.address ?? viewAs;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/state?regolamento=1${address ? `&address=${address}` : ""}`);
    setState(await res.json());
  }, [address]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const nameOf = useCallback(
    (a?: string) => {
      if (!a) return "";
      const p = state?.directory?.find((x: any) => x.address.toLowerCase() === a.toLowerCase());
      return p?.name ?? short(a);
    },
    [state],
  );

  const sign = useCallback(
    async (call: Call) => {
      setBusy(true);
      setNotice({ kind: "pending", text: `${call.summary}: in attesa della firma e della conferma su Avalanche…` });
      try {
        const receipt = await mutateAsync(prepare(call));
        setNotice({ kind: "ok", text: `${call.summary}: registrato su Avalanche.`, hash: receipt.transactionHash });
        await refresh();
        // la rete pubblica a volte risponde con un attimo di ritardo: rileggo ancora
        setTimeout(refresh, 2500);
        setTimeout(refresh, 6000);
        return receipt.transactionHash;
      } catch (e: any) {
        setNotice({ kind: "error", text: `${call.summary}: non riuscito. ${explainError(e)}` });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [mutateAsync, refresh],
  );

  const notify = useCallback((text: string, kind: Notice["kind"] = "ok") => setNotice({ kind, text }), []);

  const value = useMemo(
    () => ({ state, address, canSign: Boolean(account), busy, notice, sign, nameOf, refresh, notify }),
    [state, address, account, busy, notice, sign, nameOf, refresh, notify],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      {notice && (
        <div
          className={`fixed bottom-4 left-1/2 z-50 w-[min(92vw,640px)] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            notice.kind === "ok" ? "border-ok bg-ok-soft" : notice.kind === "error" ? "border-accent bg-accent-soft" : "border-line bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p>
              {notice.text}{" "}
              {notice.hash && (
                <a className="font-medium underline" href={explorerTx(notice.hash)} target="_blank" rel="noreferrer">
                  Vedi la prova sull&apos;explorer ↗
                </a>
              )}
            </p>
            <button className="text-muted" onClick={() => setNotice(null)} aria-label="Chiudi">
              ✕
            </button>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}
