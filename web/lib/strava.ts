// Envoi des séances sur Strava (activité « Musculation »).
// Configuration serveur : STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET (créés sur https://www.strava.com/settings/api).
import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { EXERCICES_PAR_ID } from "./exercices";
import { CIBLES, type CibleId } from "./muscles";
import type { SeanceRecue } from "./seances";

const API = "https://www.strava.com";
export const stravaConfigure = () => !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

interface LigneStrava { utilisateur_id: number; athlete_id: string | null; nom: string | null; access_token: string; refresh_token: string; expire_le: number; auto: number }

export function etatStrava(utilisateurId: number) {
  const l = db().prepare("SELECT nom, auto FROM strava WHERE utilisateur_id = ?").get(utilisateurId) as { nom: string | null; auto: number } | undefined;
  return { configure: stravaConfigure(), connecte: !!l, nom: l?.nom ?? null, auto: l ? !!l.auto : false };
}

export function urlAutorisation(origine: string, etat: string): string {
  const p = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${origine}/api/strava/retour`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:write",
    state: etat,
  });
  return `${API}/oauth/authorize?${p}`;
}

async function jetons(corps: Record<string, string>) {
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...corps }),
  });
  if (!r.ok) throw new Error(`Strava ${r.status}`);
  return r.json() as Promise<{ access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number; firstname?: string; lastname?: string } }>;
}

export async function connecterStrava(utilisateurId: number, code: string) {
  const j = await jetons({ code, grant_type: "authorization_code" });
  const nom = j.athlete ? `${j.athlete.firstname ?? ""} ${j.athlete.lastname ?? ""}`.trim() : null;
  db().prepare(
    `INSERT INTO strava (utilisateur_id, athlete_id, nom, access_token, refresh_token, expire_le) VALUES (?,?,?,?,?,?)
     ON CONFLICT(utilisateur_id) DO UPDATE SET athlete_id = excluded.athlete_id, nom = excluded.nom, access_token = excluded.access_token,
       refresh_token = excluded.refresh_token, expire_le = excluded.expire_le`,
  ).run(utilisateurId, j.athlete ? String(j.athlete.id) : null, nom, j.access_token, j.refresh_token, j.expires_at);
}

async function jetonValide(utilisateurId: number): Promise<string | null> {
  const l = db().prepare("SELECT * FROM strava WHERE utilisateur_id = ?").get(utilisateurId) as LigneStrava | undefined;
  if (!l) return null;
  if (l.expire_le > Date.now() / 1000 + 120) return l.access_token;
  const j = await jetons({ refresh_token: l.refresh_token, grant_type: "refresh_token" });
  db().prepare("UPDATE strava SET access_token = ?, refresh_token = ?, expire_le = ? WHERE utilisateur_id = ?").run(j.access_token, j.refresh_token, j.expires_at, utilisateurId);
  return j.access_token;
}

/** Envoie une séance terminée sur Strava (une seule fois par séance). N'interrompt jamais l'enregistrement en cas d'erreur. */
export async function envoyerSurStrava(utilisateurId: number, s: SeanceRecue): Promise<void> {
  try {
    if (!stravaConfigure()) return;
    const etat = db().prepare("SELECT auto FROM strava WHERE utilisateur_id = ?").get(utilisateurId) as { auto: number } | undefined;
    if (!etat?.auto) return;
    const deja = db().prepare("SELECT strava_id FROM seances WHERE id = ?").get(s.id) as { strava_id: string | null } | undefined;
    if (deja?.strava_id) return;
    const token = await jetonValide(utilisateurId);
    if (!token) return;
    const travail = s.exercices.map((e) => ({ e, series: e.series.filter((x) => x.type !== "echauffement" && x.reps > 0) })).filter((x) => x.series.length);
    const duree = s.fin ? Math.max(60, Math.round((Date.parse(s.fin) - Date.parse(s.debut)) / 1000)) : Math.max(1200, travail.reduce((t, x) => t + x.series.length, 0) * 150);
    const tonnage = Math.round(travail.reduce((t, x) => t + x.series.reduce((u, y) => u + (y.poids ?? 0) * y.reps, 0), 0));
    const description = [
      ...travail.map(({ e, series }) => `${EXERCICES_PAR_ID[e.exerciceId]?.nom ?? e.exerciceId} : ${series.map((y) => (y.poids ? `${y.poids}×${y.reps}` : `${y.reps}`)).join(", ")}`),
      "", `${travail.reduce((t, x) => t + x.series.length, 0)} séries · ${tonnage.toLocaleString("fr-FR")} kg soulevés`, "via Muscu",
    ].join("\n");
    const r = await fetch(`${API}/api/v3/activities`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: `Muscu – ${CIBLES[s.cible as CibleId]?.nom ?? "Séance libre"}`,
        sport_type: "WeightTraining",
        start_date_local: new Date(Date.parse(s.debut) - new Date(s.debut).getTimezoneOffset() * 60_000).toISOString().slice(0, 19),
        elapsed_time: duree,
        description,
      }),
    });
    if (!r.ok) { console.error("Strava : envoi refusé", r.status, await r.text().catch(() => "")); return; }
    const a = (await r.json()) as { id: number };
    db().prepare("UPDATE seances SET strava_id = ? WHERE id = ?").run(String(a.id), s.id);
  } catch (e) {
    console.error("Strava : erreur", e);
  }
}

/** Adresse publique du site (derrière Traefik). */
export async function origine() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}
