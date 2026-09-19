// Aggiornamento del catalogo del 19/09: le vacanze diventano due servizi su preventivo, arrivano le calze.
// Uso:  npx hardhat run scripts/catalog-update.js --network fuji
const hre = require("hardhat");
const { ethers } = hre;

const base = { active: true, variableAmount: false, limitedStock: false, stock: 0, price: 0n, monthlyCap: 0, maxCoverageBps: 0, minNoticeDays: 0 };

async function main() {
  const { contracts } = require(`../deployments/${hre.network.name}.json`);
  const [signer] = await ethers.getSigners();
  const market = await ethers.getContractAt("WelfareMarketplace", contracts.WelfareMarketplace);
  const services = await market.getServices();
  const titles = services.map((s) => s.title);

  const sardegna = {
    ...base, vendor: signer.address, kind: 1, minNoticeDays: 7,
    title: "Vacanze Sardegna — Hotel Il Querceto",
    description: "Soggiorno in Sardegna all'Hotel Il Querceto, tramite circuito InLire. Su preventivo: indica date e numero di persone. 7 giorni di preavviso.",
  };
  const umbria = {
    ...base, vendor: signer.address, kind: 1, minNoticeDays: 7,
    title: "Vacanze Umbria — Resort Le Silve di Armezzano",
    description: "Soggiorno in Umbria al Resort Le Silve di Armezzano, tramite circuito InLire. Su preventivo: indica date e numero di persone. 7 giorni di preavviso.",
  };
  const socks = {
    ...base, vendor: signer.address, kind: 0, price: ethers.parseEther("10"), limitedStock: true, stock: 20,
    title: "Blockchain Beach Socks",
    description: "Le calze ufficiali di Blockchain Beach. Pezzi limitati: chi prima arriva. Si ritirano al banco dell'evento.",
  };

  const old = titles.findIndex((t) => t.startsWith("Circuito InLire"));
  if (old >= 0) { await (await market.updateService(old, sardegna)).wait(); console.log(`#${old} → ${sardegna.title}`); }
  for (const s of [umbria, socks]) {
    if (titles.includes(s.title)) continue;
    await (await market.listService(s)).wait();
    console.log(`#${Number(await market.servicesCount()) - 1} → ${s.title}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
