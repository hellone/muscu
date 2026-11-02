import { enregistrer, listeSeances } from "@/lib/seances";
import { lireJson, route } from "@/lib/api";

export async function GET() {
  return route((u) => Response.json(listeSeances(u.id)));
}

export async function POST(req: Request) {
  return route(async (u) => {
    enregistrer(u.id, await lireJson(req));
    return Response.json({ ok: true });
  }, { ecriture: true });
}
