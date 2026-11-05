import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { utilisateurConnecte } from "@/lib/auth";
import { origine, stravaConfigure, urlAutorisation } from "@/lib/strava";

/** Démarre la connexion Strava (redirection vers la page d'autorisation Strava). */
export async function GET() {
  const u = await utilisateurConnecte();
  if (!u) return Response.redirect(new URL("/connexion", await origine()), 302);
  if (!stravaConfigure()) return Response.redirect(new URL("/reglages?strava=non-configure", await origine()), 302);
  const etat = randomBytes(16).toString("hex");
  (await cookies()).set("mu_strava", etat, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.MUSCU_INSECURE_COOKIES !== "1", path: "/", maxAge: 600 });
  return Response.redirect(urlAutorisation(await origine(), etat), 302);
}
