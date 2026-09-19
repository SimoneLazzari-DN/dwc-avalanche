// Rubrica nome ↔ indirizzo. Vive FUORI dalla catena (qui un file locale, in produzione il database
// del gestionale): sulla blockchain ci sono solo indirizzi, mai nomi.
// Su hosting senza disco scrivibile (Vercel) la base arriva dalla variabile DIRECTORY_JSON, privata,
// e le aggiunte fatte dall'interfaccia finiscono in una cartella temporanea.
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export type Person = { address: string; name: string; kind: "membro" | "fornitore" | "hr" };

const FILE = process.env.VERCEL ? path.join(os.tmpdir(), "dwc-directory.json") : path.join(process.cwd(), "data", "directory.json");

function fromEnv(): Person[] {
  try {
    return JSON.parse(process.env.DIRECTORY_JSON ?? "[]");
  } catch {
    return [];
  }
}

async function fromFile(): Promise<Person[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function readDirectory(): Promise<Person[]> {
  const merged = new Map<string, Person>();
  for (const p of [...fromEnv(), ...(await fromFile())]) merged.set(p.address.toLowerCase(), p);
  return [...merged.values()];
}

export async function upsertPerson(p: Person) {
  const list = (await fromFile()).filter((x) => x.address.toLowerCase() !== p.address.toLowerCase());
  list.push(p);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2));
  return readDirectory();
}
