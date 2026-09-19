// Pubblica i tre contratti, carica le due versioni del regolamento e il catalogo di esempio.
// Uso:  npx hardhat run scripts/deploy.js --network fuji
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { publishRegolamento } = require("./lib/regolamento");

const { ethers } = hre;
const dwc = (n) => ethers.parseEther(String(n));

// Catalogo benefit del regolamento. Fornitore iniziale = HR; si riassegna dal back-office.
const catalog = (vendor) => [
  {
    title: "Buoni pasto Edenred",
    description: "Buoni Ticket Restaurant. Massimo 50 DWC al mese a persona.",
    kind: 0, variableAmount: true, price: 0, monthlyCap: dwc(50),
  },
  {
    title: "Buoni spesa Sigma",
    description: "I DWC coprono al massimo il 50% dello scontrino.",
    kind: 0, variableAmount: true, price: 0, maxCoverageBps: 5000,
  },
  {
    title: "Biglietti Vero Volley",
    description: "Biglietto partita per amici e parenti. Posti limitati, 7 giorni di preavviso: chi prima arriva.",
    kind: 0, price: dwc(15), limitedStock: true, stock: 10, minNoticeDays: 7,
  },
  {
    title: "Veinclinic — trattamento Bemer / Pressoterapia",
    description: "Seduta singola presso Veinclinic.",
    kind: 0, price: dwc(40),
  },
  {
    title: "Veinclinic — visita medica specialistica",
    description: "Su preventivo: il costo dipende dalla visita. Soggetto a disponibilità.",
    kind: 1, price: 0,
  },
  {
    title: "Circuito InLire — vacanze e soggiorni",
    description: "Su preventivo: indica struttura e date (es. pernottamento a Le Silve). 7 giorni di preavviso.",
    kind: 1, price: 0, minNoticeDays: 7,
  },
].map((s) => ({
  vendor, active: true, variableAmount: false, limitedStock: false, stock: 0,
  monthlyCap: 0, maxCoverageBps: 0, minNoticeDays: 0, ...s,
}));

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Rete: ${hre.network.name} · deployer ${deployer.address} · saldo ${ethers.formatEther(balance)} AVAX`);

  const token = await ethers.deployContract("DWCToken", [deployer.address]);
  await token.waitForDeployment();
  const rules = await ethers.deployContract("WelfareRules", [token.target, deployer.address]);
  await rules.waitForDeployment();
  const market = await ethers.deployContract("WelfareMarketplace", [token.target, deployer.address]);
  await market.waitForDeployment();
  console.log("DWCToken          ", token.target);
  console.log("WelfareRules      ", rules.target);
  console.log("WelfareMarketplace", market.target);

  await (await token.grantRole(await token.MINTER_ROLE(), rules.target)).wait();
  await (await token.grantRole(await token.OPERATOR_ROLE(), market.target)).wait();

  console.log("Pubblico il regolamento (v1 marzo, v2 luglio)…");
  await publishRegolamento(rules);

  console.log("Carico il catalogo…");
  for (const s of catalog(deployer.address)) await (await market.listService(s)).wait();

  const out = {
    network: hre.network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: { DWCToken: token.target, WelfareRules: rules.target, WelfareMarketplace: market.target },
  };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(`deployments/${hre.network.name}.json`, JSON.stringify(out, null, 2));

  // Indirizzi e ABI per l'app web
  const webDir = path.join("web", "src", "contracts");
  fs.mkdirSync(webDir, { recursive: true });
  const abis = {};
  for (const name of Object.keys(out.contracts)) abis[name] = (await hre.artifacts.readArtifact(name)).abi;
  fs.writeFileSync(path.join(webDir, "deployment.json"), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(webDir, "abis.json"), JSON.stringify(abis));
  console.log("Fatto. Indirizzi in deployments/ e web/src/contracts/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
