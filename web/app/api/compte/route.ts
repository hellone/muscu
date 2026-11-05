import { db } from "@/lib/db";
import { ErreurMetier } from "@/lib/auth";
import { EQUIPEMENTS } from "@/lib/exercices";
import { lireReglages } from "@/lib/reglages";
import { etatStrava } from "@/lib/strava";
import { lireJson, route } from "@/lib/api";

export async function GET() {
  return route((u) => Response.json({ ...u, strava: etatStrava(u.id) }));
}

export async function PATCH(req: Request) {
  return route(async (u) => {
    const { equipement, nom, reglages } = await lireJson(req);
    if (equipement !== undefined) {
      if (!Array.isArray(equipement) || equipement.some((x) => typeof x !== "string" || !(x in EQUIPEMENTS))) throw new ErreurMetier("Matériel inconnu.");
      // "aucun" = rien coché (poids du corps seulement) ; la valeur vide voudrait dire « salle »
      db().prepare("UPDATE utilisateurs SET materiel = ? WHERE id = ?").run(equipement.length ? [...new Set(equipement)].join(",") : "aucun", u.id);
    }
    if (reglages !== undefined) {
      const fusion = lireReglages({ ...u.reglages, ...(typeof reglages === "object" && reglages ? reglages : {}) });
      db().prepare("UPDATE utilisateurs SET reglages = ? WHERE id = ?").run(JSON.stringify(fusion), u.id);
    }
    if (typeof nom === "string" && nom.trim()) db().prepare("UPDATE utilisateurs SET nom = ? WHERE id = ?").run(nom.trim().slice(0, 40), u.id);
    return Response.json({ ok: true });
  }, { ecriture: true });
}
