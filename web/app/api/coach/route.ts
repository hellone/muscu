import { recuperation, suggestions } from "@/lib/coach";
import { historique } from "@/lib/seances";
import { route } from "@/lib/api";

/** Récupération de chaque muscle et cibles proposées aujourd'hui. */
export async function GET() {
  return route((u) => {
    const h = historique(u.id);
    return Response.json({ recuperation: recuperation(h), suggestions: suggestions(h, Date.now(), 7), nbSeances: h.length });
  });
}
