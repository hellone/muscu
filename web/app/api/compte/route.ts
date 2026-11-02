import { db } from "@/lib/db";
import { ErreurMetier } from "@/lib/auth";
import { PROFILS_MATERIEL } from "@/lib/exercices";
import { lireJson, route } from "@/lib/api";

export async function GET() {
  return route((u) => Response.json(u));
}

export async function PATCH(req: Request) {
  return route(async (u) => {
    const { materiel, nom } = await lireJson(req);
    if (materiel !== undefined) {
      if (!(materiel in PROFILS_MATERIEL)) throw new ErreurMetier("Matériel inconnu.");
      db().prepare("UPDATE utilisateurs SET materiel = ? WHERE id = ?").run(materiel, u.id);
    }
    if (typeof nom === "string" && nom.trim()) db().prepare("UPDATE utilisateurs SET nom = ? WHERE id = ?").run(nom.trim().slice(0, 40), u.id);
    return Response.json({ ok: true });
  }, { ecriture: true });
}
