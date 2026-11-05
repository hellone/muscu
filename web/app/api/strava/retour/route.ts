import { cookies } from "next/headers";
import { utilisateurConnecte } from "@/lib/auth";
import { connecterStrava, origine } from "@/lib/strava";

/** Retour de Strava après autorisation. */
export async function GET(req: Request) {
  const base = await origine();
  const p = new URL(req.url).searchParams;
  const c = await cookies();
  const etat = c.get("mu_strava")?.value;
  c.delete("mu_strava");
  const u = await utilisateurConnecte();
  if (!u) return Response.redirect(new URL("/connexion", base), 302);
  if (p.get("error") || !p.get("code") || !etat || etat !== p.get("state")) return Response.redirect(new URL("/reglages?strava=refuse", base), 302);
  if (!(p.get("scope") ?? "").includes("activity:write")) return Response.redirect(new URL("/reglages?strava=droits", base), 302);
  try {
    await connecterStrava(u.id, p.get("code")!);
    return Response.redirect(new URL("/reglages?strava=ok", base), 302);
  } catch (e) {
    console.error(e);
    return Response.redirect(new URL("/reglages?strava=erreur", base), 302);
  }
}
