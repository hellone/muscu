import { cookies, headers } from "next/headers";
import { COOKIE_SESSION, ErreurMetier, creerCompte, ipDe, noterEchec, optionsCookie, origineValide, ouvrirSession, tropDEssais } from "@/lib/auth";
import { erreur, lireJson } from "@/lib/api";

export async function POST(req: Request) {
  if (!(await origineValide())) return erreur("Origine refusée.", 403);
  const { identifiant, nom, mdp, code } = await lireJson(req);
  if (typeof identifiant !== "string" || typeof nom !== "string" || typeof mdp !== "string") return erreur("Champs manquants.");
  const h = await headers();
  const cle = `inscription:${ipDe(h)}`;
  if (tropDEssais(cle)) return erreur("Trop d'essais. Réessaie dans 15 minutes.", 429);
  try {
    const u = creerCompte(identifiant, nom, mdp, typeof code === "string" ? code : undefined);
    (await cookies()).set(COOKIE_SESSION, ouvrirSession(u.id, h.get("user-agent") ?? undefined), optionsCookie());
    return Response.json({ nom: u.nom });
  } catch (e) {
    if (e instanceof ErreurMetier) { noterEchec(cle); return erreur(e.message); }
    throw e;
  }
}
