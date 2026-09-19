"use client";

import { useEffect, useState } from "react";

/// Schermata d'ingresso: il gettone DWC che si accende, poi «Entra».
/// Si vede una sola volta per sessione del browser; un tocco qualsiasi la salta.
export function Splash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "leaving">("hidden");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("dwc-splash") === "seen") return;
    } catch {}
    setPhase("show");
  }, []);

  function enter() {
    try {
      sessionStorage.setItem("dwc-splash", "seen");
    } catch {}
    setPhase("leaving");
    setTimeout(() => setPhase("hidden"), 650);
  }

  if (phase === "hidden") return null;

  return (
    <div className={`splash ${phase === "leaving" ? "splash-leave" : ""}`} onClick={enter} role="dialog" aria-label="Benvenuto in DWC">
      <div className="splash-grid" aria-hidden />
      <div className="splash-stage">
        <div className="splash-rings" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dwc-coin.png" alt="DWC" className="splash-coin" />
      </div>

      <h1 className="splash-title" aria-label="DWC">
        <span>D</span>
        <span>W</span>
        <span>C</span>
      </h1>
      <p className="splash-tagline">Il welfare della cooperativa, con le regole su blockchain</p>

      <button className="splash-enter" onClick={enter}>
        Entra
      </button>

      <div className="splash-foot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dreamnet-logo.png" alt="DreamNet Soc. Coop." />
        <span>B-Chainers Labs · Avalanche</span>
      </div>
    </div>
  );
}
