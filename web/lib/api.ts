import "server-only";
import { ErreurMetier, origineValide, utilisateurConnecte, type Utilisateur } from "./auth";

export const erreur = (message: string, status = 400) => Response.json({ erreur: message }, { status });

/** Enveloppe une route protégée : vérifie l'origine (écriture), la session, et convertit les erreurs métier. */
export async function route(fn: (u: Utilisateur) => Promise<Response> | Response, { ecriture = false } = {}): Promise<Response> {
  if (ecriture && !(await origineValide())) return erreur("Origine refusée.", 403);
  const u = await utilisateurConnecte();
  if (!u) return erreur("Non connecté.", 401);
  try {
    return await fn(u);
  } catch (e) {
    if (e instanceof ErreurMetier) return erreur(e.message, 400);
    console.error(e);
    return erreur("Erreur serveur.", 500);
  }
}

export async function lireJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}
