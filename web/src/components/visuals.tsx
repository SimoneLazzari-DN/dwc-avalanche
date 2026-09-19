"use client";

import { useState } from "react";
import { useApp } from "./app-context";

// ───────────────────────────── Persone: foto o iniziali ─────────────────────────────
// Le foto NON stanno nella repo: si mettono in web/public/people/<nome>.jpg (es. sarah.jpg), cartella esclusa da git.

export function Avatar({ address, size = 40 }: { address?: string; size?: number }) {
  const { nameOf } = useApp();
  const [loaded, setLoaded] = useState(false);
  const name = nameOf(address);
  const known = Boolean(name) && !name.startsWith("0x");
  const initials = known ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  const file = known ? name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "") : "";
  const style = { width: size, height: size, fontSize: size * 0.36 };

  return (
    <div style={style} className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink font-semibold text-white">
      {initials}
      {file && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/people/${file}.jpg`} alt={name} onLoad={() => setLoaded(true)} className={`absolute inset-0 h-full w-full object-cover ${loaded ? "" : "hidden"}`} />
      )}
    </div>
  );
}

// ───────────────────────────── Catalogo: immagine del servizio ─────────────────────────────
// Se esiste web/public/catalog/<id>.jpg viene usata quella foto; altrimenti un'illustrazione in bianco e nero.

const S = { fill: "none", stroke: "#1c1b19", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Illustration({ title }: { title: string }) {
  const t = title.toLowerCase();
  let art: React.ReactNode;
  if (t.includes("cappello")) {
    art = (
      <g {...S}>
        <path d="M100 104c0-36 26-60 60-60s60 24 60 60" fill="#1c1b19" />
        <path d="M96 104h128c22 0 44 8 56 20-40-6-120-8-184-4z" fill="#fff" />
        <circle cx="160" cy="44" r="5" fill="#fff" />
        <path d="M160 49v55M132 56c-8 14-12 30-12 48M188 56c8 14 12 30 12 48" stroke="#fff" strokeWidth="2" />
      </g>
    );
  } else if (t.includes("socks") || t.includes("calze")) {
    art = (
      <g {...S}>
        <path d="M120 28h40v62l-34 30c-8 8-22 8-30 0s-6-20 2-26l22-18z" fill="#fff" />
        <path d="M120 44h40M120 56h40" />
        <path d="M188 28h40v62l-34 30c-8 8-22 8-30 0s-6-20 2-26l22-18z" fill="#1c1b19" />
        <path d="M188 44h40M188 56h40" stroke="#fff" />
      </g>
    );
  } else if (t.includes("sardegna")) {
    art = (
      <g {...S}>
        <circle cx="236" cy="48" r="18" fill="#1c1b19" />
        <path d="M70 118l44-70 44 70M114 48v76" />
        <path d="M82 100c10-8 22-8 32 0 10-8 22-8 32 0" />
        <path d="M40 132c16-10 32-10 48 0s32 10 48 0 32-10 48 0 32 10 48 0 32-10 48 0" />
        <path d="M60 148c16-10 32-10 48 0s32 10 48 0 32-10 48 0 32 10 48 0" opacity=".45" />
      </g>
    );
  } else if (t.includes("umbria")) {
    art = (
      <g {...S}>
        <circle cx="232" cy="46" r="16" />
        <path d="M30 128c40-44 80-44 120-6 36-40 84-40 140 6" fill="#fff" />
        <path d="M30 140c50-24 100-24 150-4 40-18 80-16 110 4" />
        <path d="M96 116c-7-18-7-40 0-62 7 22 7 44 0 62zM122 120c-5-14-5-32 0-48 5 16 5 34 0 48z" fill="#1c1b19" />
        <path d="M176 112v-22l18-12 18 12v22zM190 112v-12h8v12" fill="#fff" />
      </g>
    );
  } else if (t.includes("edenred") || t.includes("pasto")) {
    art = (
      <g {...S}>
        <circle cx="160" cy="84" r="44" fill="#fff" />
        <circle cx="160" cy="84" r="26" />
        <path d="M84 36v36c0 8 6 12 12 12v48M84 36v30M96 36v30M108 36v36c0 8-6 12-12 12" />
        <path d="M232 132V36c-12 8-18 24-18 44 0 8 6 12 18 12" />
      </g>
    );
  } else if (t.includes("sigma") || t.includes("spesa")) {
    art = (
      <g {...S}>
        <path d="M84 44h20l18 62h84l16-46H112" fill="#fff" />
        <circle cx="134" cy="126" r="8" fill="#1c1b19" />
        <circle cx="194" cy="126" r="8" fill="#1c1b19" />
        <path d="M132 76h70M136 90h60" />
      </g>
    );
  } else if (t.includes("volley") || t.includes("bigliett")) {
    art = (
      <g {...S}>
        <circle cx="120" cy="84" r="40" fill="#fff" />
        <path d="M120 44c10 22 10 58 0 80M82 72c24 4 54 4 78-8M86 106c22-10 48-12 72 0" />
        <path d="M184 60h68v16a8 8 0 0 0 0 16v16h-68V92a8 8 0 0 0 0-16z" fill="#1c1b19" />
        <path d="M204 66v36" stroke="#fff" strokeDasharray="3 6" />
      </g>
    );
  } else {
    art = (
      <g {...S}>
        <path d="M160 128s-52-30-52-66c0-16 12-28 27-28 11 0 20 6 25 16 5-10 14-16 25-16 15 0 27 12 27 28 0 36-52 66-52 66z" fill="#fff" />
        <path d="M120 80h22l8-16 12 32 8-16h30" />
      </g>
    );
  }
  return (
    <svg viewBox="0 0 320 164" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label={title}>
      <defs>
        <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#d8d3c7" />
        </pattern>
      </defs>
      <rect width="320" height="164" fill="#efece4" />
      <rect width="320" height="164" fill="url(#dots)" />
      {art}
    </svg>
  );
}

export function ServiceArt({ id, title }: { id: number; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative -mx-5 -mt-5 mb-4 h-36 overflow-hidden rounded-t-2xl border-b border-line">
      <Illustration title={title} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/catalog/${id}.jpg`} alt={title} onLoad={() => setLoaded(true)} className={`absolute inset-0 h-full w-full object-cover ${loaded ? "" : "hidden"}`} />
    </div>
  );
}
