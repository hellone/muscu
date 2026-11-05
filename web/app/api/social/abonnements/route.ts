import { suivre } from "@/lib/social";
import { lireJson, route } from "@/lib/api";
/** { identifiant, suivre: true | false } */
export async function POST(req: Request) {
  return route(async (u) => {
    const b = await lireJson(req);
    suivre(u.id, String(b.identifiant ?? ""), b.suivre !== false);
    return Response.json({ ok: true });
  }, { ecriture: true });
}
