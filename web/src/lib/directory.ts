// Rubrica nome ↔ indirizzo. Vive FUORI dalla catena (qui un file locale, in produzione il database
// del gestionale): sulla blockchain ci sono solo indirizzi, mai nomi.
import { promises as fs } from "fs";
import path from "path";

export type Person = { address: string; name: string; kind: "membro" | "fornitore" | "hr" };

const FILE = path.join(process.cwd(), "data", "directory.json");

export async function readDirectory(): Promise<Person[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function upsertPerson(p: Person) {
  const list = (await readDirectory()).filter((x) => x.address.toLowerCase() !== p.address.toLowerCase());
  list.push(p);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2));
  return list;
}
