// Aggiunge un servizio a prezzo fisso al catalogo.
// Uso:  TITLE="…" DESCRIPTION="…" PRICE=20 STOCK=10 npx hardhat run scripts/add-service.js --network fuji
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const { contracts } = require(`../deployments/${hre.network.name}.json`);
  const [signer] = await ethers.getSigners();
  const market = await ethers.getContractAt("WelfareMarketplace", contracts.WelfareMarketplace);
  const stock = Number(process.env.STOCK || 0);

  const tx = await market.listService({
    vendor: process.env.VENDOR || signer.address,
    title: process.env.TITLE,
    description: process.env.DESCRIPTION || "",
    kind: 0,
    active: true,
    variableAmount: false,
    limitedStock: stock > 0,
    stock,
    price: ethers.parseEther(process.env.PRICE || "0"),
    monthlyCap: 0,
    maxCoverageBps: 0,
    minNoticeDays: 0,
  });
  await tx.wait();
  console.log(`Servizio #${Number(await market.servicesCount()) - 1} aggiunto · tx ${tx.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
