import { ErreurMetier } from "@/lib/auth";
import { genererSeance } from "@/lib/coach";
import { optionsCoach } from "@/lib/cycle-serveur";
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
    const options = (date: number) => ({ rir: u.reglages.rir, echauffement: u.reglages.echauffement, cycle: optionsCoach(u, date).cycle ?? null });
    if (cible === "libre") return Response.json({ cible, plan: [], options: options(typeof avant === "string" ? Date.parse(avant) || Date.now() : Date.now()) });
    if (!(cible in CIBLES)) throw new ErreurMetier("Cible inconnue.");
    let h = historique(u.id);
    let date = Date.now();
    if (typeof avant === "string" && !Number.isNaN(Date.parse(avant))) {
      h = h.filter((s) => s.debut < avant);
      date = Date.parse(avant);
    }
    return Response.json({ cible, plan: genererSeance(cible as CibleId, h, optionsCoach(u, date)), options: options(date) });
  }, { ecriture: true });
}
