import { alternatives, planPour } from "@/lib/coach";
import { EXERCICES_PAR_ID } from "@/lib/exercices";
import { historique } from "@/lib/seances";
import { optionsCoach } from "@/lib/cycle-serveur";
import { route } from "@/lib/api";

/** Exercices de remplacement (même muscle), avec la charge proposée pour chacun. */
export async function GET(req: Request) {
  return route((u) => {
    const p = new URL(req.url).searchParams;
    const exo = p.get("exo") ?? "";
    const dans = (p.get("dans") ?? "").split(",").filter(Boolean);
    const h = historique(u.id);
    const autres = dans.filter((id) => id !== exo).map((id) => EXERCICES_PAR_ID[id]).filter(Boolean);
    return Response.json(alternatives(exo, dans, u.equipement).slice(0, 8).map((e) => planPour(e, h, autres.length, autres, optionsCoach(u).cycle ?? null)));
  });
}
