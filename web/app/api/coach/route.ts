import { objectifSeries, recuperation, regularite, semaineCycle, suggestions, volumeSemaine } from "@/lib/coach";
import { LISTE_MUSCLES } from "@/lib/muscles";
import { historique } from "@/lib/seances";
import { route } from "@/lib/api";

/** Tableau de bord : récupération, cibles du jour, volume de la semaine, régularité, semaine du cycle. */
export async function GET() {
  return route((u) => {
    const h = historique(u.id);
    const r = u.reglages;
    return Response.json({
      recuperation: recuperation(h),
      suggestions: suggestions(h, Date.now(), 7, r.priorites),
      nbSeances: h.length,
      volume: volumeSemaine(h),
      objectifs: Object.fromEntries(LISTE_MUSCLES.map((m) => [m, objectifSeries(m, r.priorites)])),
      priorites: r.priorites,
      regularite: regularite(h, r.objectifSemaine),
      cycle: r.cycle ? semaineCycle(r.cycle.debut, r.cycle.semaines) : null,
    });
  });
}
