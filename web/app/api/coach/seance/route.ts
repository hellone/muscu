import { ErreurMetier } from "@/lib/auth";
import { genererSeance } from "@/lib/coach";
import { CIBLES, type CibleId } from "@/lib/muscles";
import { historique } from "@/lib/seances";
import { lireJson, route } from "@/lib/api";

/**
 * Construit la séance pour une cible.
 * `avant` (date ISO, facultatif) : séance saisie après coup — seul l'historique antérieur à cette date est pris en compte.
 * cible "libre" : séance vide, l'utilisateur ajoute ses exercices.
 */
export async function POST(req: Request) {
  return route(async (u) => {
    const { cible, avant } = await lireJson(req);
    if (cible === "libre") return Response.json({ cible, plan: [] });
    if (!(cible in CIBLES)) throw new ErreurMetier("Cible inconnue.");
    let h = historique(u.id);
    if (typeof avant === "string" && !Number.isNaN(Date.parse(avant))) h = h.filter((s) => s.debut < avant);
    return Response.json({ cible, plan: genererSeance(cible as CibleId, h, u.equipement) });
  }, { ecriture: true });
}
