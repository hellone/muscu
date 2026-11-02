import { unRM } from "@/lib/coach";
import { EXERCICES_PAR_ID } from "@/lib/exercices";
import { historique } from "@/lib/seances";
import { erreur, route } from "@/lib/api";

/** Historique d'un exercice : chaque séance où il a été fait, avec la meilleure série et le 1RM estimé. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!EXERCICES_PAR_ID[id]) return erreur("Exercice inconnu.", 404);
  return route((u) => {
    const points = historique(u.id)
      .flatMap((s) => s.exercices.filter((e) => e.exerciceId === id).map((e) => ({ date: s.debut, series: e.series })))
      .map((p) => {
        const meilleure = p.series.reduce((m, x) => (unRM(x.poids ?? 0, x.reps) > unRM(m.poids ?? 0, m.reps) ? x : m), p.series[0]);
        return { ...p, meilleure, unRM: Math.round(unRM(meilleure.poids ?? 0, meilleure.reps) * 10) / 10 };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    return Response.json(points);
  });
}
