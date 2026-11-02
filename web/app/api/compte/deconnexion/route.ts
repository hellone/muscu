import { cookies } from "next/headers";
import { COOKIE_SESSION, fermerSession, origineValide } from "@/lib/auth";
import { erreur } from "@/lib/api";

export async function POST() {
  if (!(await origineValide())) return erreur("Origine refusée.", 403);
  const c = await cookies();
  fermerSession(c.get(COOKIE_SESSION)?.value);
  c.delete(COOKIE_SESSION);
  return Response.json({ ok: true });
}
