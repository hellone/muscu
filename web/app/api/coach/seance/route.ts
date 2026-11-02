import { ErreurMetier } from "@/lib/auth";
import { genererSeance } from "@/lib/coach";
import { PROFILS_MATERIEL } from "@/lib/exercices";
import { CIBLES, type CibleId } from "@/lib/muscles";
import { historique } from "@/lib/seances";
import { lireJson, route } from "@/lib/api";

/** Construit la séance du jour pour une cible. */
export async function POST(req: Request) {
  return route(async (u) => {
    const { cible } = await lireJson(req);
    if (!(cible in CIBLES)) throw new ErreurMetier("Cible inconnue.");
    const plan = genererSeance(cible as CibleId, historique(u.id), PROFILS_MATERIEL[u.materiel]?.materiel ?? PROFILS_MATERIEL.salle.materiel);
    return Response.json({ cible, plan });
  }, { ecriture: true });
}
