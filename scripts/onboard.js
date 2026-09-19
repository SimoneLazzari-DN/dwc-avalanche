// Registra una persona: membro del network → profilo → accredito annuale. Sulla catena va solo l'indirizzo.
// Uso:  ADDRESS=0x... SOCIO=false PART_TIME=false LEVEL=SENIOR ROLES=OP_SENIOR START=2024-01-01 \
//       npx hardhat run scripts/onboard.js --network fuji
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const { contracts } = require(`../deployments/${hre.network.name}.json`);
  const who = process.env.ADDRESS;
  if (!ethers.isAddress(who)) throw new Error("Imposta ADDRESS con un indirizzo valido");
  const token = await ethers.getContractAt("DWCToken", contracts.DWCToken);
  const rules = await ethers.getContractAt("WelfareRules", contracts.WelfareRules);
  const year = new Date().getUTCFullYear();

  if (!(await token.isActive(who))) await (await token.addMember(who)).wait();
  const roles = (process.env.ROLES || "").split(",").filter(Boolean).map((r) => ethers.encodeBytes32String(r));
  const start = Math.floor(new Date(`${process.env.START || `${year}-01-01`}T12:00:00Z`).getTime() / 1000);
  await (await rules.setProfile(who, process.env.SOCIO === "true", process.env.PART_TIME === "true", start, ethers.encodeBytes32String(process.env.LEVEL || "JUNIOR"), roles)).wait();
  if (!(await rules.annualAccrued(who, year))) {
    const tx = await rules.accrueAnnual(who, year);
    await tx.wait();
    console.log("accredito annuale:", tx.hash);
  }
  console.log(who, "→ saldo", ethers.formatEther(await token.balanceOf(who)), "DWC");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
