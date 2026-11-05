import { db } from "@/lib/db";
import { lireJson, route } from "@/lib/api";

/** Activer / couper l'envoi automatique. */
export async function PATCH(req: Request) {
  return route(async (u) => {
    const { auto } = await lireJson(req);
    db().prepare("UPDATE strava SET auto = ? WHERE utilisateur_id = ?").run(auto ? 1 : 0, u.id);
    return Response.json({ ok: true });
  }, { ecriture: true });
}

/** Déconnecter Strava. */
export async function DELETE() {
  return route((u) => {
    db().prepare("DELETE FROM strava WHERE utilisateur_id = ?").run(u.id);
    return Response.json({ ok: true });
  }, { ecriture: true });
}
