// Lecture / écriture des séances en base.
import "server-only";
import { db, transaction } from "./db";
import { ErreurMetier } from "./auth";
import { EXERCICES_PAR_ID } from "./exercices";
import { CIBLES, type CibleId } from "./muscles";
import type { SeanceHisto, SerieFaite } from "./coach";

export function historique(utilisateurId: number): SeanceHisto[] {
  const seances = db().prepare("SELECT id, cible, debut FROM seances WHERE utilisateur_id = ? ORDER BY debut DESC").all(utilisateurId) as any[];
  if (!seances.length) return [];
  const exos = db().prepare(
    `SELECT e.seance_id, e.exercice_id, e.series FROM seance_exos e JOIN seances s ON s.id = e.seance_id
     WHERE s.utilisateur_id = ? ORDER BY e.seance_id, e.ordre`,
  ).all(utilisateurId) as any[];
  const parSeance = new Map<string, SeanceHisto>(seances.map((s) => [s.id, { id: s.id, cible: s.cible, debut: s.debut, exercices: [] }]));
  for (const e of exos) parSeance.get(e.seance_id)?.exercices.push({ exerciceId: e.exercice_id, series: JSON.parse(e.series) });
  return [...parSeance.values()];
}

export interface SeanceRecue { id: string; cible: string; debut: string; fin?: string; exercices: { exerciceId: string; series: SerieFaite[] }[] }

const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

/** Enregistre (ou remplace) une séance envoyée par le téléphone. Idempotent grâce à l'id créé côté téléphone. */
export function enregistrer(utilisateurId: number, s: SeanceRecue) {
  if (typeof s?.id !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(s.id)) throw new ErreurMetier("Séance invalide.");
  if (!(s.cible in CIBLES) && s.cible !== "libre") throw new ErreurMetier("Cible inconnue.");
  if (typeof s.debut !== "string" || !ISO.test(s.debut)) throw new ErreurMetier("Date invalide.");
  if (Date.parse(s.debut) > Date.now() + 86400_000) throw new ErreurMetier("La date de la séance est dans le futur.");
  if (!Array.isArray(s.exercices) || s.exercices.length > 40) throw new ErreurMetier("Exercices invalides.");
  const exos = s.exercices
    .filter((e) => EXERCICES_PAR_ID[e?.exerciceId])
    .map((e) => ({
      exerciceId: e.exerciceId,
      series: (Array.isArray(e.series) ? e.series : []).slice(0, 20)
        .map((x) => ({ poids: typeof x?.poids === "number" && isFinite(x.poids) && x.poids >= 0 && x.poids < 1000 ? Math.round(x.poids * 100) / 100 : null, reps: Math.max(0, Math.min(999, Math.round(Number(x?.reps) || 0))) }))
        .filter((x) => x.reps > 0),
    }))
    .filter((e) => e.series.length > 0);
  if (!exos.length) throw new ErreurMetier("Aucune série validée dans cette séance.");
  const existant = db().prepare("SELECT utilisateur_id FROM seances WHERE id = ?").get(s.id) as { utilisateur_id: number } | undefined;
  if (existant && existant.utilisateur_id !== utilisateurId) throw new ErreurMetier("Séance invalide.");
  transaction(() => {
    db().prepare(
      `INSERT INTO seances (id, utilisateur_id, cible, debut, fin) VALUES (?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET cible = excluded.cible, debut = excluded.debut, fin = excluded.fin, maj_le = datetime('now')`,
    ).run(s.id, utilisateurId, s.cible, s.debut, typeof s.fin === "string" && ISO.test(s.fin) ? s.fin : null);
    db().prepare("DELETE FROM seance_exos WHERE seance_id = ?").run(s.id);
    const ins = db().prepare("INSERT INTO seance_exos (seance_id, ordre, exercice_id, series) VALUES (?,?,?,?)");
    exos.forEach((e, i) => ins.run(s.id, i, e.exerciceId, JSON.stringify(e.series)));
  });
}

export interface ResumeSeance { id: string; cible: string; nomCible: string; debut: string; fin: string | null; nbExos: number; nbSeries: number; tonnage: number }

export function listeSeances(utilisateurId: number): ResumeSeance[] {
  return historiqueAvecFin(utilisateurId).map(({ s, fin }) => {
    const series = s.exercices.flatMap((e) => e.series);
    return {
      id: s.id, cible: s.cible, nomCible: CIBLES[s.cible as CibleId]?.nom ?? "Séance libre", debut: s.debut, fin,
      nbExos: s.exercices.length, nbSeries: series.length,
      tonnage: Math.round(series.reduce((t, x) => t + (x.poids ?? 0) * x.reps, 0)),
    };
  });
}

function historiqueAvecFin(utilisateurId: number) {
  const fins = new Map((db().prepare("SELECT id, fin FROM seances WHERE utilisateur_id = ?").all(utilisateurId) as any[]).map((r) => [r.id, r.fin]));
  return historique(utilisateurId).map((s) => ({ s, fin: (fins.get(s.id) as string | null) ?? null }));
}

export function supprimer(utilisateurId: number, id: string) {
  db().prepare("DELETE FROM seances WHERE id = ? AND utilisateur_id = ?").run(id, utilisateurId);
}
