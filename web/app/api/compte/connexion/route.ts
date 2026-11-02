import { cookies, headers } from "next/headers";
import { COOKIE_SESSION, connecter, effacerEchecs, ipDe, noterEchec, optionsCookie, origineValide, ouvrirSession, tropDEssais } from "@/lib/auth";
import { erreur, lireJson } from "@/lib/api";

export async function POST(req: Request) {
  if (!(await origineValide())) return erreur("Origine refusée.", 403);
  const { identifiant, mdp } = await lireJson(req);
  if (typeof identifiant !== "string" || typeof mdp !== "string") return erreur("Identifiant et mot de passe requis.");
  const h = await headers();
  const cle = `${ipDe(h)}:${identifiant.toLowerCase()}`;
  if (tropDEssais(cle)) return erreur("Trop d'essais. Réessaie dans 15 minutes.", 429);
  const u = connecter(identifiant, mdp);
  if (!u) { noterEchec(cle); return erreur("Identifiant ou mot de passe incorrect.", 401); }
  effacerEchecs(cle);
  (await cookies()).set(COOKIE_SESSION, ouvrirSession(u.id, h.get("user-agent") ?? undefined), optionsCookie());
  return Response.json({ nom: u.nom });
}
