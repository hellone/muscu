// Le « coach » : récupération par muscle, cibles du jour, construction et ordre de la séance, charges proposées.
// Fonctions pures (pas d'accès base) : testées dans tests/coach.test.ts.
import { CIBLES, LISTE_CIBLES, LISTE_MUSCLES, MUSCLES, type CibleId, type Muscle } from "./muscles.ts";
import { EXERCICES, EXERCICES_PAR_ID, type Exercice, type Materiel } from "./exercices.ts";

// ------------------------------------------------------------------ types

export interface SerieFaite { poids: number | null; reps: number }
export interface ExoFait { exerciceId: string; series: SerieFaite[] }
export interface SeanceHisto { id: string; debut: string; cible: string; exercices: ExoFait[] }

export interface EtatMuscle { pct: number; derniere: string | null; series: number }
export type Recuperation = Record<Muscle, EtatMuscle>;

export interface Suggestion { cible: CibleId; nom: string; pret: boolean; recup: number; raison: string }

export interface SeriePrevue { poids: number | null; reps: number }
export interface PlanExo {
  exerciceId: string;
  raison: string;
  series: SeriePrevue[];
  derniere: { date: string; series: SerieFaite[] } | null;
  objectif: string;
  repos: number;
}

const H = 3600_000;
const JOUR = 24 * H;

// ------------------------------------------------------------------ récupération

/** Séries « effectives » par muscle dans une séance : 1 pour un muscle principal, 0,5 pour un secondaire. */
export function seriesParMuscle(s: SeanceHisto): Map<Muscle, number> {
  const m = new Map<Muscle, number>();
  for (const ex of s.exercices) {
    const e = EXERCICES_PAR_ID[ex.exerciceId];
    if (!e) continue;
    const n = ex.series.filter((x) => x.reps > 0).length;
    for (const p of e.principaux) m.set(p, (m.get(p) ?? 0) + n);
    for (const p of e.secondaires) m.set(p, (m.get(p) ?? 0) + n * 0.5);
  }
  return m;
}

/**
 * Pourcentage de récupération de chaque muscle.
 * Seule la dernière séance qui a vraiment sollicité le muscle (≥ 2 séries effectives) compte ;
 * plus le volume est gros, plus la récupération est longue (de ×0,6 à ×1,3).
 */
export function recuperation(historique: SeanceHisto[], maintenant = Date.now()): Recuperation {
  const tri = [...historique].sort((a, b) => b.debut.localeCompare(a.debut));
  const res = {} as Recuperation;
  for (const m of LISTE_MUSCLES) res[m] = { pct: 100, derniere: null, series: 0 };
  const vus = new Set<Muscle>();
  for (const s of tri) {
    const t = Date.parse(s.debut);
    for (const [m, n] of seriesParMuscle(s)) {
      if (vus.has(m) || n < 2) continue;
      vus.add(m);
      const facteur = Math.min(1.3, Math.max(0.6, 0.5 + (0.5 * n) / 8));
      const besoin = MUSCLES[m].recup * facteur * H;
      const pct = Math.max(0, Math.min(100, Math.round(((maintenant - t) / besoin) * 100)));
      res[m] = { pct, derniere: s.debut, series: n };
    }
    if (vus.size === LISTE_MUSCLES.length) break;
  }
  return res;
}

// ------------------------------------------------------------------ cibles du jour

const joursDepuis = (iso: string | null, maintenant: number) => (iso ? (maintenant - Date.parse(iso)) / JOUR : null);

export function formatJours(j: number): string {
  if (j < 1) return "aujourd'hui";
  const n = Math.floor(j);
  return n === 1 ? "hier" : `il y a ${n} j`;
}

/** Les 3 cibles les plus pertinentes aujourd'hui (muscles récupérés et travaillés il y a le plus longtemps). */
export function suggestions(historique: SeanceHisto[], maintenant = Date.now(), nb = 3): Suggestion[] {
  const recup = recuperation(historique, maintenant);
  const classiques = new Set<CibleId>(["pecs_triceps", "dos_biceps", "jambes", "epaules_abdos"]);
  const notes = LISTE_CIBLES.map((c) => {
    const ms = c.plan.map(([m]) => m);
    const principaux = c.plan.filter(([, n]) => n >= Math.max(...c.plan.map(([, k]) => k)) - 1).map(([m]) => m);
    const min = Math.min(...principaux.map((m) => recup[m].pct));
    const moy = Math.round(ms.reduce((t, m) => t + recup[m].pct, 0) / ms.length);
    const jours = ms.map((m) => joursDepuis(recup[m].derniere, maintenant));
    const connus = jours.filter((j): j is number => j !== null);
    const plusRecent = connus.length ? Math.min(...connus) : null;
    const jamais = connus.length === 0;
    const pret = min >= 85;
    let score = (plusRecent ?? 10) * 10 + moy / 5 + (classiques.has(c.id) ? 8 : 0);
    if (!pret) score -= 200 - min;
    let raison: string;
    if (jamais) raison = historique.length ? "Pas encore travaillé : à intégrer" : "Idéal pour démarrer";
    else {
      const m = [...principaux].sort((a, b) => (recup[b].derniere ?? "").localeCompare(recup[a].derniere ?? ""))[0];
      const j = joursDepuis(recup[m].derniere, maintenant)!;
      raison = `${MUSCLES[m].nom} travaillés ${formatJours(j)} · ${pret ? `récupérés à ${min} %` : `encore fatigués (${min} %)`}`;
    }
    return { cible: c.id, nom: c.nom, pret, recup: min, raison, score };
  });
  notes.sort((a, b) => b.score - a.score);
  return notes.slice(0, nb).map(({ score: _s, ...r }) => r);
}

// ------------------------------------------------------------------ charges proposées

/** Dernière fois que l'exercice a été fait (séance la plus récente qui le contient). */
export function dernierePerf(historique: SeanceHisto[], exerciceId: string): { date: string; series: SerieFaite[] } | null {
  let best: { date: string; series: SerieFaite[] } | null = null;
  for (const s of historique) {
    const ex = s.exercices.find((e) => e.exerciceId === exerciceId && e.series.some((x) => x.reps > 0));
    if (ex && (!best || s.debut > best.date)) best = { date: s.debut, series: ex.series.filter((x) => x.reps > 0) };
  }
  return best;
}

const arrondi = (kg: number, pas: number) => (pas > 0 ? Math.round(kg / pas) * pas : kg);
const fmtKg = (kg: number | null) => (kg === null ? "" : `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace(".", ",")} kg`);

/**
 * Double progression :
 * - toutes les séries au haut de la fourchette → on monte la charge et on repart du bas de la fourchette ;
 * - sinon même charge, +1 rep par série (dans la fourchette) ;
 * - très en dessous du bas de la fourchette → on redescend d'un cran.
 */
export function proposerSeries(e: Exercice, derniere: { series: SerieFaite[] } | null): { series: SeriePrevue[]; objectif: string } {
  const [min, max] = e.reps;
  const u = e.unite === "sec" ? " s" : "";
  if (!derniere || derniere.series.length === 0) {
    const reps = Math.round((min + max) / 2);
    return {
      series: Array.from({ length: e.series }, () => ({ poids: null, reps })),
      objectif: e.increment > 0 ? `Première fois : trouve une charge pour ${min}–${max}${u} propres` : `Première fois : vise ${min}–${max}${u}`,
    };
  }
  const travail = derniere.series;
  // charge de référence = la plus lourde utilisée
  const poids = travail.reduce<number | null>((m, s) => (s.poids !== null && (m === null || s.poids > m) ? s.poids : m), null);
  const aCharge = travail.filter((s) => s.poids === poids);
  const toutesAuMax = aCharge.length >= Math.min(e.series, travail.length) && aCharge.every((s) => s.reps >= max);
  const tropDur = aCharge.filter((s) => s.reps < min - 1).length > aCharge.length / 2;
  const avecLest = poids !== null && e.increment === 0; // poids du corps + lest éventuel
  const pas = e.increment > 0 ? e.increment : 2.5;

  if (toutesAuMax) {
    if (e.increment === 0 && !avecLest && e.unite !== "sec" && max >= 12) {
      return { series: Array.from({ length: e.series }, () => ({ poids: 5, reps: min })), objectif: `Bravo ! Ajoute un lest de 5 kg, vise ${min} reps` };
    }
    if (e.unite === "sec" || (e.increment === 0 && !avecLest)) {
      const r = max + (e.unite === "sec" ? 10 : 2);
      return { series: Array.from({ length: e.series }, () => ({ poids, reps: r })), objectif: `Au top la dernière fois : vise ${r}${u}` };
    }
    const p = arrondi((poids ?? 0) + pas, pas);
    return { series: Array.from({ length: e.series }, () => ({ poids: p, reps: min })), objectif: `+${fmtKg(pas)} : ${fmtKg(p)} × ${min}${u}` };
  }
  if (tropDur && poids !== null && poids > 0) {
    const p = Math.max(0, arrondi(poids - pas, pas));
    return { series: Array.from({ length: e.series }, () => ({ poids: p, reps: min })), objectif: `Un peu dur la dernière fois : ${fmtKg(p)} × ${min}${u}` };
  }
  const series = Array.from({ length: e.series }, (_, i) => {
    const r = aCharge[i]?.reps ?? aCharge[aCharge.length - 1]?.reps ?? min;
    return { poids, reps: Math.min(max, Math.max(min, r + 1)) };
  });
  return { series, objectif: `Même charge, +1 rep : ${poids !== null ? `${fmtKg(poids)} × ` : ""}${series.map((s) => s.reps).join(" · ")}${u}` };
}

// ------------------------------------------------------------------ construction de la séance

export const REPOS: Record<1 | 2 | 3, number> = { 1: 150, 2: 90, 3: 60 };

function derniereSeanceCible(historique: SeanceHisto[], cible: string): SeanceHisto | undefined {
  return [...historique].filter((s) => s.cible === cible).sort((a, b) => b.debut.localeCompare(a.debut))[0];
}

/** Choisit les exercices d'une séance (sans les ordonner). */
export function choisirExercices(cible: CibleId, historique: SeanceHisto[], materiel: Materiel[]): Exercice[] {
  const ok = (e: Exercice) => materiel.includes(e.materiel);
  const choisis: Exercice[] = [];
  const familles = new Set<string>();
  const dejaFaits = new Set((derniereSeanceCible(historique, cible)?.exercices ?? []).map((x) => x.exerciceId));
  // exercices déjà pratiqués, du plus récent au plus ancien (pour garder le mouvement principal et suivre la progression)
  const pratiques: string[] = [];
  for (const s of [...historique].sort((a, b) => b.debut.localeCompare(a.debut)))
    for (const x of s.exercices) if (!pratiques.includes(x.exerciceId)) pratiques.push(x.exerciceId);

  const prendre = (e: Exercice) => { choisis.push(e); familles.add(e.famille); };

  for (const [muscle, nb] of CIBLES[cible].plan) {
    const candidats = EXERCICES.filter((e) => e.cible === muscle && ok(e));
    for (let k = 0; k < nb; k++) {
      const libres = candidats.filter((e) => !choisis.includes(e) && !familles.has(e.famille));
      if (!libres.length) break;
      let choix: Exercice | undefined;
      if (k === 0) {
        // mouvement principal : le plus polyarticulaire ; on garde celui déjà pratiqué s'il y en a un
        // (les variantes peu courantes, pref 1, ne sont prises que s'il n'y a rien d'autre)
        const courants = libres.filter((e) => e.pref >= 2);
        const pool = courants.length ? courants : libres;
        const nivMin = Math.min(...pool.map((e) => e.niveau));
        const base = pool.filter((e) => e.niveau === nivMin);
        choix = base.find((e) => pratiques.includes(e.id)) ?? [...base].sort((a, b) => b.pref - a.pref)[0];
      } else {
        // exercices complémentaires : on varie par rapport à la dernière séance de cette cible
        // 2e exercice d'un très gros muscle (ou de 3 prévus) : polyarticulaire secondaire ; sinon isolation
        const visé = k === 1 && (nb >= 3 || MUSCLES[muscle].taille <= 3) ? 2 : 3;
        const tri = [...libres].sort((a, b) =>
          (dejaFaits.has(a.id) ? 1 : 0) - (dejaFaits.has(b.id) ? 1 : 0) ||
          Math.abs(a.niveau - visé) - Math.abs(b.niveau - visé) ||
          b.pref - a.pref);
        choix = tri[0];
      }
      if (choix) prendre(choix);
    }
  }
  return choisis;
}

/**
 * Ordre optimal :
 * 1. polyarticulaires lourds, 2. polyarticulaires secondaires, 3. isolations ;
 * à niveau égal, les gros muscles avant les petits ; les abdos toujours en dernier.
 * Ainsi un muscle n'est jamais isolé avant un mouvement lourd qui en a besoin (ex. triceps après le développé couché).
 */
export function ordonner(exos: Exercice[]): Exercice[] {
  const cle = (e: Exercice) => (e.cible === "abdos" ? 1000 : 0) + e.niveau * 100 + MUSCLES[e.cible].taille;
  return [...exos].sort((a, b) => cle(a) - cle(b));
}

export function raisonOrdre(e: Exercice, index: number, avant: Exercice[]): string {
  const nomM = MUSCLES[e.cible].nom.toLowerCase();
  if (e.cible === "abdos") return "Abdos en fin de séance : ils doivent rester frais pour gainer les mouvements lourds.";
  // un exercice précédent sollicitait déjà ce muscle en secondaire ?
  const synergie = avant.find((p) => p.secondaires.includes(e.cible) || (p !== e && p.principaux.includes(e.cible) && p.cible !== e.cible));
  if (e.niveau === 1)
    return index === 0
      ? "Mouvement polyarticulaire lourd : en premier, quand tu as toute ta force."
      : "Polyarticulaire lourd : placé tôt pour garder de la force.";
  if (e.niveau === 2)
    return synergie
      ? `Après « ${synergie.nom} » : les ${nomM} sont déjà échauffés, et le mouvement lourd n'a pas été gâché par la fatigue.`
      : "Polyarticulaire secondaire : après les mouvements lourds, avant les isolations.";
  return synergie
    ? `Isolation après « ${synergie.nom} » qui sollicite déjà les ${nomM} : tu les finis sans avoir perdu de force avant.`
    : `Isolation : en fin de séance pour finir les ${nomM}.`;
}

/** Séance complète prête à suivre. */
export function genererSeance(cible: CibleId, historique: SeanceHisto[], materiel: Materiel[]): PlanExo[] {
  const exos = ordonner(choisirExercices(cible, historique, materiel));
  return exos.map((e, i) => planPour(e, historique, i, exos.slice(0, i)));
}

export function planPour(e: Exercice, historique: SeanceHisto[], index = 0, avant: Exercice[] = []): PlanExo {
  const derniere = dernierePerf(historique, e.id);
  const p = proposerSeries(e, derniere);
  return { exerciceId: e.id, raison: raisonOrdre(e, index, avant), series: p.series, derniere, objectif: p.objectif, repos: REPOS[e.niveau] };
}

/** Exercices de remplacement pour le même muscle, les plus proches d'abord. */
export function alternatives(exerciceId: string, dejaDansSeance: string[], materiel: Materiel[]): Exercice[] {
  const e = EXERCICES_PAR_ID[exerciceId];
  if (!e) return [];
  return EXERCICES.filter((x) => x.cible === e.cible && x.id !== e.id && !dejaDansSeance.includes(x.id) && materiel.includes(x.materiel))
    .sort((a, b) => Math.abs(a.niveau - e.niveau) - Math.abs(b.niveau - e.niveau) || b.pref - a.pref);
}

/** Meilleure série estimée (1RM, formule d'Epley) – pour la courbe de progression. */
export function unRM(poids: number, reps: number): number {
  return reps <= 1 ? poids : poids * (1 + reps / 30);
}
