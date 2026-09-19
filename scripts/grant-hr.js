// Dà il ruolo HR (e di approvazione del regolamento) a un indirizzo, es. quello creato con l'accesso via email.
// Uso:  HR_ADDRESS=0x... npx hardhat run scripts/grant-hr.js --network fuji
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const who = process.env.HR_ADDRESS;
  if (!ethers.isAddress(who)) throw new Error("Imposta HR_ADDRESS con un indirizzo valido");
  const { contracts } = require(`../deployments/${hre.network.name}.json`);

  for (const [name, address] of Object.entries(contracts)) {
    const c = await ethers.getContractAt(name, address);
    await (await c.grantRole(await c.HR_ROLE(), who)).wait();
    if (name === "WelfareRules") await (await c.grantRole(await c.RULES_ADMIN_ROLE(), who)).wait();
    console.log(`HR su ${name}: ok`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
