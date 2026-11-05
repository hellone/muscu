import { enregistrer, listeSeances } from "@/lib/seances";
import { envoyerSurStrava } from "@/lib/strava";
import { lireJson, route } from "@/lib/api";

export async function GET() {
  return route((u) => Response.json(listeSeances(u.id)));
}

export async function POST(req: Request) {
  return route(async (u) => {
    const s = await lireJson(req);
    const { nouvelle } = enregistrer(u.id, s);
    // envoi Strava en arrière-plan (nouvelle séance seulement, pas une correction)
    if (nouvelle) void envoyerSurStrava(u.id, s);
    return Response.json({ ok: true });
  }, { ecriture: true });
}
