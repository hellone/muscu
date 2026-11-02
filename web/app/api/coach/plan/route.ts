import { planPour } from "@/lib/coach";
import { EXERCICES_PAR_ID } from "@/lib/exercices";
import { historique } from "@/lib/seances";
import { erreur, route } from "@/lib/api";

/** Charge proposée et dernière perf pour un exercice ajouté à la main. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const e = EXERCICES_PAR_ID[p.get("exo") ?? ""];
  if (!e) return erreur("Exercice inconnu.", 404);
  const avant = (p.get("dans") ?? "").split(",").map((id) => EXERCICES_PAR_ID[id]).filter(Boolean);
  return route((u) => Response.json(planPour(e, historique(u.id), avant.length, avant)));
}
