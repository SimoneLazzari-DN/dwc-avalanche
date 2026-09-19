"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WORDS = ["Regole eque", "Emissione automatica", "Circuito chiuso", "AI + Avalanche", "Zero fogli Excel", "Tutto verificabile"];
const GRID = 32; // 32 × 32 = 1024 frammenti (quelli trasparenti si scartano)

type Piece = { sx: number; sy: number; hx: number; hy: number; dx: number; dy: number; spin: number; delay: number };

/// Schermata d'ingresso su fondo bianco. Il gettone si compone da ~1000 frammenti; con «Entra» esplode
/// e lo sfondo svanisce sull'app. Si vede una sola volta per sessione; un tocco qualsiasi la salta.
export function Splash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "leaving">("hidden");
  const [coinReady, setCoinReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const coin = useRef<HTMLImageElement>(null);
  const raf = useRef(0);
  const pieces = useRef<Piece[]>([]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("dwc-splash") === "seen") return;
    } catch {}
    setPhase("show");
  }, []);

  /// Taglia il gettone in tessere e assegna a ognuna una traiettoria.
  const build = useCallback(() => {
    const img = coin.current;
    const cv = canvas.current;
    if (!img || !cv || !img.naturalWidth) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = window.innerWidth * dpr;
    cv.height = window.innerHeight * dpr;
    cv.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const probe = document.createElement("canvas");
    probe.width = probe.height = GRID;
    const pctx = probe.getContext("2d", { willReadFrequently: true })!;
    pctx.drawImage(img, 0, 0, GRID, GRID);
    const alpha = pctx.getImageData(0, 0, GRID, GRID).data;

    const r = img.getBoundingClientRect();
    const tile = r.width / GRID;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const reach = Math.max(window.innerWidth, window.innerHeight) * 0.75;
    const list: Piece[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (alpha[(y * GRID + x) * 4 + 3] < 24) continue;
        const hx = r.left + (x + 0.5) * tile;
        const hy = r.top + (y + 0.5) * tile;
        const a = Math.atan2(hy - cy, hx - cx) + (Math.random() - 0.5) * 1.1;
        const d = reach * (0.35 + Math.random() * 0.9);
        list.push({ sx: x, sy: y, hx, hy, dx: Math.cos(a) * d, dy: Math.sin(a) * d, spin: (Math.random() - 0.5) * 14, delay: Math.random() * 0.25 });
      }
    }
    pieces.current = list;
    return true;
  }, []);

  /// t = 0 → gettone composto · t = 1 → frammenti lontani e trasparenti
  const draw = useCallback((t: number, gravity: number) => {
    const img = coin.current;
    const cv = canvas.current;
    if (!img || !cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const src = img.naturalWidth / GRID;
    const size = img.getBoundingClientRect().width / GRID;
    for (const p of pieces.current) {
      const k = Math.min(1, Math.max(0, (t - p.delay) / (1 - p.delay)));
      if (k >= 1) continue;
      const e = 1 - Math.pow(1 - k, 3);
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.translate(p.hx + p.dx * e, p.hy + p.dy * e + gravity * k * k);
      ctx.rotate(p.spin * e);
      const s = size * (1 + k * 1.4) + 0.6;
      ctx.drawImage(img, p.sx * src, p.sy * src, src, src, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }, []);

  const animate = useCallback(
    (from: number, to: number, ms: number, gravity: number, done: () => void) => {
      cancelAnimationFrame(raf.current);
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / ms);
        draw(from + (to - from) * k, gravity);
        if (k < 1) raf.current = requestAnimationFrame(step);
        else done();
      };
      raf.current = requestAnimationFrame(step);
    },
    [draw],
  );

  // Ingresso: i frammenti convergono e compongono il gettone.
  const assemble = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !build()) {
      setCoinReady(true);
      return;
    }
    animate(1, 0, 1700, 0, () => {
      setCoinReady(true);
      canvas.current?.getContext("2d")?.clearRect(0, 0, window.innerWidth, window.innerHeight);
    });
  }, [animate, build]);

  // Se l'immagine era già in memoria, onLoad non scatta: parto da qui.
  const started = useRef(false);
  const startOnce = useCallback(() => {
    if (started.current) return;
    started.current = true;
    assemble();
  }, [assemble]);
  useEffect(() => {
    if (phase === "show" && coin.current?.complete) startOnce();
  }, [phase, startOnce]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function enter() {
    if (phase !== "show") return;
    try {
      sessionStorage.setItem("dwc-splash", "seen");
    } catch {}
    setPhase("leaving");
    if (build()) {
      setCoinReady(false);
      animate(0, 1, 1100, 260, () => setPhase("hidden"));
    } else {
      setTimeout(() => setPhase("hidden"), 700);
    }
  }

  if (phase === "hidden") return null;

  return (
    <div className={`splash ${phase === "leaving" ? "splash-leave" : ""}`} onClick={enter} role="dialog" aria-label="Benvenuto in DWC">
      <header className="splash-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dreamnet-logo.png" alt="DreamNet Soc. Coop." />
        <span>Avalanche · Fuji · 2026</span>
      </header>

      <div className="splash-center">
        <div className="splash-stage">
          <svg className="splash-ring" viewBox="0 0 300 300" aria-hidden>
            <defs>
              <path id="splash-circle" d="M150,150 m-128,0 a128,128 0 1,1 256,0 a128,128 0 1,1 -256,0" />
            </defs>
            <circle cx="150" cy="150" r="146" className="splash-ring-line" />
            <text>
              <textPath href="#splash-circle">DREAMNET WELFARE COIN · LE REGOLE SONO IL CONTRATTO · DREAMNET WELFARE COIN · B-CHAINERS LABS ·</textPath>
            </text>
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={coin} src="/brand/dwc-coin.png" alt="DWC" className="splash-coin" style={{ opacity: coinReady ? 1 : 0 }} onLoad={startOnce} />
        </div>

        <h1 className="splash-title" aria-label="DWC">
          <span><b>D</b></span>
          <span><b>W</b></span>
          <span><b>C</b></span>
        </h1>
        <p className="splash-tagline">
          Il welfare della cooperativa,
          <br />
          con le regole su <em>blockchain</em>
        </p>

        <button className="splash-enter" onClick={enter}>
          Entra <span aria-hidden>→</span>
        </button>
      </div>

      <div className="splash-marquee" aria-hidden>
        <div>
          {[...WORDS, ...WORDS, ...WORDS].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      <canvas ref={canvas} className="splash-canvas" aria-hidden />
    </div>
  );
}
