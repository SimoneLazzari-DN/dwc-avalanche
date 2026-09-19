// Lettura dei contratti lato server. Nessuna chiave: solo dati pubblici della catena.
import { ethers } from "ethers";
import deployment from "@/contracts/deployment.json";
import abis from "@/contracts/abis.json";

const RPC =
  process.env.RPC_URL ??
  (deployment.chainId === 43113 ? "https://api.avax-test.network/ext/bc/C/rpc" : "http://127.0.0.1:8545");

export const provider = new ethers.JsonRpcProvider(RPC, deployment.chainId, { staticNetwork: true });

export const contracts = {
  token: new ethers.Contract(deployment.contracts.DWCToken, abis.DWCToken, provider),
  rules: new ethers.Contract(deployment.contracts.WelfareRules, abis.WelfareRules, provider),
  market: new ethers.Contract(deployment.contracts.WelfareMarketplace, abis.WelfareMarketplace, provider),
};
export type ContractKey = keyof typeof contracts;

const fmt = (v: bigint) => Number(ethers.formatEther(v));
const b32 = (v: string) => {
  try {
    return v === ethers.ZeroHash ? "" : ethers.decodeBytes32String(v);
  } catch {
    return v;
  }
};

const MEMBER_STATUS = ["non_membro", "attivo", "uscito"] as const;
export const ORDER_STATUS = ["", "richiesto", "preventivato", "in_lavorazione", "erogato", "rifiutato", "annullato"] as const;
const CREDIT_KIND = ["Credito base soci", "Credito ruolo", "Attività extra", "Bonus commerciale", "Altro bonus"];

export const monthIndexNow = () => {
  const d = new Date();
  return d.getUTCFullYear() * 12 + d.getUTCMonth() + 1;
};

export async function getCatalog() {
  const services = await contracts.market.getServices();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return services.map((s: any, id: number) => ({
    id,
    vendor: s.vendor as string,
    title: s.title as string,
    description: s.description as string,
    kind: Number(s.kind) === 0 ? "prezzo_fisso" : "su_preventivo",
    active: s.active as boolean,
    variableAmount: s.variableAmount as boolean,
    limitedStock: s.limitedStock as boolean,
    stock: Number(s.stock),
    priceDwc: fmt(s.price),
    monthlyCapDwc: fmt(s.monthlyCap),
    maxCoveragePct: Number(s.maxCoverageBps) / 100,
    minNoticeDays: Number(s.minNoticeDays),
  }));
}

export async function getOrders() {
  const orders = await contracts.market.getOrders();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return orders.map((o: any, id: number) => ({
    id,
    serviceId: Number(o.serviceId),
    member: o.member as string,
    status: ORDER_STATUS[Number(o.status)],
    quantity: Number(o.quantity),
    createdAt: Number(o.createdAt),
    serviceDate: Number(o.serviceDate),
    amountDwc: fmt(o.amount),
    receiptEur: fmt(o.receiptAmount),
    details: o.details as string,
    note: o.note as string,
  }));
}

export async function getMember(address: string) {
  const [info, balance, profile, canSpend] = await Promise.all([
    contracts.token.memberInfo(address),
    contracts.token.balanceOf(address),
    contracts.rules.getProfile(address),
    contracts.token.canSpend(address),
  ]);
  return {
    address,
    status: MEMBER_STATUS[Number(info.status)],
    exitedAt: Number(info.exitedAt),
    balanceExpiresAt: Number(info.exitedAt) ? Number(info.exitedAt) + 180 * 86400 : 0,
    canSpend: canSpend as boolean,
    balanceDwc: fmt(balance),
    profile: profile.exists
      ? {
          isSocio: profile.isSocio as boolean,
          partTime: profile.partTime as boolean,
          bonusSuspended: profile.bonusSuspended as boolean,
          startDate: Number(profile.startDate),
          level: b32(profile.level),
          roles: (profile.roles as string[]).map(b32),
        }
      : null,
  };
}

export async function getMembers() {
  const n = Number(await contracts.token.memberCount());
  const addresses: string[] = await Promise.all([...Array(n).keys()].map((i) => contracts.token.memberAt(i)));
  return Promise.all(addresses.map(getMember));
}

export async function getRegolamento() {
  const count = Number(await contracts.rules.versionsCount());
  const current = Number(await contracts.rules.currentVersion());
  const versions = [];
  for (let v = 1; v <= count; v++) {
    const [meta, base, keys, prizes] = await Promise.all([
      contracts.rules.getVersion(v),
      contracts.rules.baseCredit(v),
      contracts.rules.roleKeys(v),
      contracts.rules.prizes(v),
    ]);
    const roles = await Promise.all(
      (keys as string[]).map(async (k) => {
        const r = await contracts.rules.getRole(v, k);
        return {
          key: b32(k),
          label: r.label as string,
          creditSocio: Number(r.creditSocio),
          creditNonSocio: Number(r.creditNonSocio),
          halvedIfPartTime: r.halvedIfPartTime as boolean,
        };
      }),
    );
    const hourly = await Promise.all(
      ["SENIOR", "JUNIOR", "STAGISTA"].map(async (l) => {
        const r = await contracts.rules.hourlyRate(v, ethers.encodeBytes32String(l));
        return { level: l, socio: Number(r.socio), nonSocio: Number(r.nonSocio) };
      }),
    );
    versions.push({
      version: v,
      inVigore: v === current,
      name: meta.name as string,
      effectiveFrom: Number(meta.effectiveFrom),
      documentHash: meta.documentHash as string,
      baseSocio: Number(base[0]),
      baseNonSocio: Number(base[1]),
      roles,
      hourly,
      quarterlyPrizes: (prizes[0] as bigint[]).map(Number),
      annualPrizes: (prizes[1] as bigint[]).map(Number),
    });
  }
  return { current, versions };
}

// ───────────── Storico movimenti: scansione incrementale degli eventi, tenuta in memoria ─────────────

type Movement = {
  kind: "base" | "ruolo" | "extra" | "commerciale" | "bonus" | "acquisto" | "rimborso" | "scambio" | "azzeramento";
  block: number;
  tx: string;
  member: string;
  direction: "entrata" | "uscita";
  amountDwc: number;
  label: string;
};

const KINDS = ["base", "ruolo", "extra", "commerciale", "bonus"] as const;
const cache = { next: (deployment as { fromBlock?: number }).fromBlock ?? 0, movements: [] as Movement[], burnedByMarket: 0 };
let scanning: Promise<void> | null = null;

async function scan() {
  const latest = await provider.getBlockNumber();
  const marketAddr = deployment.contracts.WelfareMarketplace.toLowerCase();
  const STEP = 2000;
  while (cache.next <= latest) {
    const to = Math.min(cache.next + STEP - 1, latest);
    const [credited, transfers] = await Promise.all([
      contracts.rules.queryFilter(contracts.rules.filters.Credited(), cache.next, to),
      contracts.token.queryFilter(contracts.token.filters.Transfer(), cache.next, to),
    ]);
    for (const e of credited as ethers.EventLog[]) {
      cache.movements.push({
        kind: KINDS[Number(e.args.kind)],
        block: e.blockNumber,
        tx: e.transactionHash,
        member: e.args.member,
        direction: "entrata",
        amountDwc: fmt(e.args.amount),
        label: `${CREDIT_KIND[Number(e.args.kind)]} — ${e.args.memo} (regolamento v${e.args.version})`,
      });
    }
    for (const e of transfers as ethers.EventLog[]) {
      const { from, to: dest, value } = e.args;
      if (from === ethers.ZeroAddress) continue; // emissioni: già coperte da Credited
      const base = { block: e.blockNumber, tx: e.transactionHash, amountDwc: fmt(value) };
      if (dest === ethers.ZeroAddress) {
        if (from.toLowerCase() === marketAddr) cache.burnedByMarket += base.amountDwc; // servizio erogato
        else cache.movements.push({ ...base, kind: "azzeramento", member: from, direction: "uscita", label: "Saldo azzerato dopo 6 mesi dall'uscita" });
      } else if (dest.toLowerCase() === marketAddr) {
        cache.movements.push({ ...base, kind: "acquisto", member: from, direction: "uscita", label: "Acquisto nel marketplace" });
      } else if (from.toLowerCase() === marketAddr) {
        cache.movements.push({ ...base, kind: "rimborso", member: dest, direction: "entrata", label: "Rimborso ordine annullato" });
      } else {
        cache.movements.push({ ...base, kind: "scambio", member: from, direction: "uscita", label: `Scambio verso ${dest}` });
        cache.movements.push({ ...base, kind: "scambio", member: dest, direction: "entrata", label: `Scambio da ${from}` });
      }
    }
    cache.next = to + 1;
  }
}

async function allMovements() {
  scanning ??= scan().finally(() => (scanning = null));
  await scanning;
  return cache.movements;
}

export async function getMovements(address: string) {
  await allMovements();
  const a = address.toLowerCase();
  return cache.movements.filter((m) => m.member.toLowerCase() === a).sort((x, y) => y.block - x.block);
}

/// Fotografia completa per una persona: è la stessa che vede l'interfaccia e che riceve l'assistente AI.
export async function getState(address?: string) {
  const [catalog, orders] = await Promise.all([getCatalog(), getOrders()]);
  if (!address || !ethers.isAddress(address)) return { deployment, catalog, me: null };

  const hrRole = await contracts.rules.HR_ROLE();
  const [me, isHr, movements] = await Promise.all([
    getMember(address),
    contracts.rules.hasRole(hrRole, address) as Promise<boolean>,
    getMovements(address),
  ]);
  const a = address.toLowerCase();
  const month = monthIndexNow();
  const spentThisMonth = Object.fromEntries(
    await Promise.all(
      catalog
        .filter((s: { monthlyCapDwc: number }) => s.monthlyCapDwc > 0)
        .map(async (s: { id: number }) => [s.id, fmt(await contracts.market.spentInMonth(address, s.id, month))]),
    ),
  );
  const vendorServiceIds = catalog.filter((s: { vendor: string }) => s.vendor.toLowerCase() === a).map((s: { id: number }) => s.id);

  return {
    deployment,
    catalog,
    me: { ...me, isHr, isVendor: vendorServiceIds.length > 0, spentThisMonth, movements },
    myOrders: orders.filter((o: { member: string }) => o.member.toLowerCase() === a),
    vendorOrders: orders.filter((o: { serviceId: number }) => vendorServiceIds.includes(o.serviceId)),
    hr: isHr ? await getHrView(orders, catalog) : null,
  };
}

const CREDIT_LABELS: Record<string, string> = {
  base: "Credito base soci",
  ruolo: "Credito ruolo",
  extra: "Attività extra (baratto sociale)",
  commerciale: "Bonus commerciali",
  bonus: "Altri bonus HR",
};

/// Vista d'insieme per Risorse Umane: persone, ordini, movimenti e statistiche dell'intero network.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getHrView(orders: any[], catalog: any[]) {
  const [members, movements, escrow] = await Promise.all([
    getMembers(),
    allMovements(),
    contracts.token.balanceOf(deployment.contracts.WelfareMarketplace),
  ]);
  const sum = (list: Movement[]) => list.reduce((t, m) => t + m.amountDwc, 0);
  const credits = movements.filter((m) => m.kind in CREDIT_LABELS);
  const paid = orders.filter((o) => o.status === "in_lavorazione" || o.status === "erogato");

  const people = members.map((m) => {
    const mine = movements.filter((x) => x.member.toLowerCase() === m.address.toLowerCase());
    const myOrders = orders.filter((o) => o.member.toLowerCase() === m.address.toLowerCase());
    return {
      ...m,
      receivedDwc: sum(mine.filter((x) => x.kind in CREDIT_LABELS)),
      spentDwc: sum(mine.filter((x) => x.kind === "acquisto")) - sum(mine.filter((x) => x.kind === "rimborso")),
      ordersCount: myOrders.length,
    };
  });

  return {
    members: people,
    orders,
    movements: [...movements].sort((a, b) => b.block - a.block),
    stats: {
      activeMembers: members.filter((m) => m.status === "attivo").length,
      exitedMembers: members.filter((m) => m.status === "uscito").length,
      mintedDwc: sum(credits),
      circulatingDwc: members.reduce((t, m) => t + m.balanceDwc, 0),
      escrowDwc: fmt(escrow),
      burnedDwc: cache.burnedByMarket,
      ordersTotal: orders.length,
      ordersOpen: orders.filter((o) => ["richiesto", "preventivato", "in_lavorazione"].includes(o.status)).length,
      byCreditKind: Object.entries(CREDIT_LABELS).map(([kind, label]) => ({ label, dwc: sum(credits.filter((m) => m.kind === kind)) })),
      byService: catalog
        .map((s) => ({ label: s.title as string, dwc: paid.filter((o) => o.serviceId === s.id).reduce((t: number, o) => t + o.amountDwc, 0), orders: paid.filter((o) => o.serviceId === s.id).length }))
        .filter((s) => s.orders > 0)
        .sort((a, b) => b.dwc - a.dwc),
    },
  };
}
