import { getState, getRegolamento } from "@/lib/chain";
import { readDirectory } from "@/lib/directory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const [state, directory] = await Promise.all([getState(searchParams.get("address") ?? undefined), readDirectory()]);
    const regolamento = searchParams.get("regolamento") ? await getRegolamento() : undefined;
    return Response.json({ ...state, directory, regolamento });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
