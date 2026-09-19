import { isAddress } from "ethers";
import { readDirectory, upsertPerson } from "@/lib/directory";

export async function GET() {
  return Response.json(await readDirectory());
}

// Prototipo: nessun controllo d'accesso sulla rubrica. In produzione passa dal backend del gestionale.
export async function POST(request: Request) {
  const { address, name, kind } = await request.json();
  if (!isAddress(address) || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Indirizzo o nome non validi" }, { status: 400 });
  }
  return Response.json(await upsertPerson({ address, name: name.trim(), kind: kind ?? "membro" }));
}
