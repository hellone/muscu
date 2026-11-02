import { changerMdp } from "@/lib/auth";
import { lireJson, route } from "@/lib/api";

export async function POST(req: Request) {
  return route(async (u) => {
    const { ancien, nouveau } = await lireJson(req);
    changerMdp(u.id, String(ancien ?? ""), String(nouveau ?? ""));
    return Response.json({ ok: true });
  }, { ecriture: true });
}
