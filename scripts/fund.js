// Piano B: manda un po' di AVAX di prova a un indirizzo, per pagare i costi di rete.
// Uso:  TO=0x... AMOUNT=0.05 npx hardhat run scripts/fund.js --network fuji
const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  const amount = process.env.AMOUNT || "0.05";
  if (!ethers.isAddress(process.env.TO)) throw new Error("Imposta TO con un indirizzo valido");
  const tx = await signer.sendTransaction({ to: process.env.TO, value: ethers.parseEther(amount) });
  await tx.wait();
  console.log(`Inviati ${amount} AVAX a ${process.env.TO} · tx ${tx.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
