// Réglages d'entraînement de l'utilisateur (colonne JSON utilisateurs.reglages). Partagé client + serveur.
import type { Muscle } from "./muscles";
import { LISTE_MUSCLES } from "./muscles";

export interface Reglages {
  /** Regrouper automatiquement les isolations de muscles opposés (biceps/triceps…). */
  supersets: boolean;
  /** Séries d'approche avant les mouvements lourds + échauffement articulaire. */
  echauffement: boolean;
  /** Saisir les reps en réserve (RIR) sur chaque série. */
  rir: boolean;
  /** Cycle d'entraînement : date de début (ISO) et durée en semaines (dont 1 de décharge). null = pas de cycle. */
  cycle: { debut: string; semaines: number } | null;
  /** Jusqu'à 3 muscles à développer en priorité. */
  priorites: Muscle[];
  /** Objectif de séances par semaine (pour la série de semaines). */
  objectifSemaine: number;
  /** Montrer mes séances aux personnes qui me suivent. */
  partage: boolean;
}

export const REGLAGES_DEFAUT: Reglages = {
  supersets: true, echauffement: true, rir: false, cycle: null, priorites: [], objectifSemaine: 3, partage: true,
};

/** Lit et nettoie des réglages (en base ou envoyés par le téléphone). */
export function lireReglages(brut: unknown): Reglages {
  let o: any = {};
  if (typeof brut === "string") { try { o = JSON.parse(brut); } catch { o = {}; } }
  else if (brut && typeof brut === "object") o = brut;
  const r: Reglages = { ...REGLAGES_DEFAUT };
  for (const k of ["supersets", "echauffement", "rir", "partage"] as const) if (typeof o[k] === "boolean") r[k] = o[k];
  if (Number.isInteger(o.objectifSemaine) && o.objectifSemaine >= 1 && o.objectifSemaine <= 7) r.objectifSemaine = o.objectifSemaine;
  if (Array.isArray(o.priorites)) r.priorites = o.priorites.filter((m: unknown): m is Muscle => LISTE_MUSCLES.includes(m as Muscle)).slice(0, 3);
  if (o.cycle && typeof o.cycle.debut === "string" && !Number.isNaN(Date.parse(o.cycle.debut)) && [4, 5, 6, 8].includes(o.cycle.semaines))
    r.cycle = { debut: o.cycle.debut, semaines: o.cycle.semaines };
  return r;
}
