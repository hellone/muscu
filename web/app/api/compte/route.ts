import { db } from "@/lib/db";
import { ErreurMetier } from "@/lib/auth";
import { EQUIPEMENTS } from "@/lib/exercices";
import { lireJson, route } from "@/lib/api";

export async function GET() {
  return route((u) => Response.json(u));
}

export async function PATCH(req: Request) {
  return route(async (u) => {
    const { equipement, nom } = await lireJson(req);
    if (equipement !== undefined) {
      if (!Array.isArray(equipement) || equipement.some((x) => typeof x !== "string" || !(x in EQUIPEMENTS))) throw new ErreurMetier("Matériel inconnu.");
      // "" = rien coché (poids du corps seulement) ; on évite la valeur vide qui voudrait dire « salle »
      db().prepare("UPDATE utilisateurs SET materiel = ? WHERE id = ?").run(equipement.length ? [...new Set(equipement)].join(",") : "aucun", u.id);
    }
    if (typeof nom === "string" && nom.trim()) db().prepare("UPDATE utilisateurs SET nom = ? WHERE id = ?").run(nom.trim().slice(0, 40), u.id);
    return Response.json({ ok: true });
  }, { ecriture: true });
}
