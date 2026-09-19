// Le due versioni del Regolamento Piano Welfare, tradotte in parametri per WelfareRules.
// v1 = marzo 2026 (storica) · v2 = 9 luglio 2026 (in vigore).
// Luglio aggiorna marzo: ciò che luglio non cambia (pro-rata, part-time, premi delle classifiche) resta valido.
const { ethers } = require("ethers");

const key = (s) => ethers.encodeBytes32String(s);

const ROLES = {
  // v1
  PRESIDENTE: key("PRESIDENTE"),
  VICE_PRESIDENTE: key("VICE_PRESIDENTE"),
  SOCIO: key("SOCIO"),
  RESP_AREA: key("RESP_AREA"),
  DIP_SENIOR: key("DIP_SENIOR"),
  DIP_JUNIOR: key("DIP_JUNIOR"),
  // v1 + v2
  AMMINISTRATORE: key("AMMINISTRATORE"),
  STAGISTA: key("STAGISTA"),
  // v2
  RESP_SEZIONE: key("RESP_SEZIONE"),
  OP_SENIOR: key("OP_SENIOR"),
  OP_JUNIOR: key("OP_JUNIOR"),
};

const LEVELS = {
  SENIOR: key("SENIOR"),
  JUNIOR: key("JUNIOR"),
  STAGISTA: key("STAGISTA"),
  NONE: ethers.ZeroHash,
};

const PRIZES = { quarterly: [250, 150, 50], annual: [500, 250, 150] };

const VERSIONS = [
  {
    name: "Regolamento Welfare Aziendale DWC — marzo 2026",
    effectiveFrom: Date.UTC(2026, 2, 1) / 1000,
    base: { socio: 0, nonSocio: 0 },
    // [chiave, etichetta, credito socio, credito non socio, si dimezza col part-time]
    roles: [
      [ROLES.PRESIDENTE, "Presidente", 1500, 1500, false],
      [ROLES.VICE_PRESIDENTE, "Vice Presidente", 1000, 1000, false],
      [ROLES.AMMINISTRATORE, "Amministratore", 850, 850, false],
      [ROLES.SOCIO, "Socio", 500, 500, false],
      [ROLES.RESP_AREA, "Responsabile Area", 1000, 1000, true],
      [ROLES.DIP_SENIOR, "Dipendente Senior", 850, 850, true],
      [ROLES.DIP_JUNIOR, "Dipendente Junior", 650, 650, true],
      [ROLES.STAGISTA, "Stagista", 450, 450, true],
    ],
    // [livello, DWC/ora socio, DWC/ora non socio]
    hourly: [
      [LEVELS.SENIOR, 50, 50],
      [LEVELS.JUNIOR, 25, 25],
      [LEVELS.STAGISTA, 10, 10],
    ],
  },
  {
    name: "Regolamento Piano Welfare a Crediti — 9 luglio 2026",
    effectiveFrom: Date.UTC(2026, 6, 9) / 1000,
    base: { socio: 500, nonSocio: 0 },
    roles: [
      [ROLES.AMMINISTRATORE, "Amministratore / Dirigente", 1000, 0, false],
      [ROLES.RESP_SEZIONE, "Responsabile di Sezione", 700, 350, true],
      [ROLES.OP_SENIOR, "Operatore Senior", 500, 250, true],
      [ROLES.OP_JUNIOR, "Operatore Junior", 250, 125, true],
      [ROLES.STAGISTA, "Operatore Stagista", 0, 50, true],
    ],
    hourly: [
      [LEVELS.SENIOR, 70, 35],
      [LEVELS.JUNIOR, 30, 15],
      [LEVELS.STAGISTA, 0, 10],
    ],
  },
];

/// Crea e pubblica, in ordine, tutte le versioni. L'ultima resta quella in vigore.
async function publishRegolamento(rules, { documentHashes = [], documentURIs = [] } = {}) {
  for (let i = 0; i < VERSIONS.length; i++) {
    const v = VERSIONS[i];
    const id = i + 1;
    await (await rules.createVersion(v.name, documentURIs[i] || "", documentHashes[i] || ethers.ZeroHash, v.effectiveFrom)).wait();
    await (await rules.setBaseCredit(id, v.base.socio, v.base.nonSocio)).wait();
    for (const r of v.roles) await (await rules.setRole(id, ...r)).wait();
    for (const h of v.hourly) await (await rules.setHourlyRate(id, ...h)).wait();
    await (await rules.setPrizes(id, PRIZES.quarterly, PRIZES.annual)).wait();
    await (await rules.publish(id)).wait();
  }
}

module.exports = { ROLES, LEVELS, PRIZES, VERSIONS, publishRegolamento, key };
