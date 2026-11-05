// Le « coach » : récupération par muscle, cibles du jour, construction et ordre de la séance, charges proposées.
// Fonctions pures (pas d'accès base) : testées dans tests/coach.test.ts.
import { CIBLES, LISTE_CIBLES, LISTE_MUSCLES, MUSCLES, type CibleId, type Muscle } from "./muscles.ts";
import { EXERCICES, EXERCICES_PAR_ID, disponible, type Equipement, type Exercice } from "./exercices.ts";

// ------------------------------------------------------------------ types

/** normale (par défaut), échauffement (ne compte ni pour la progression, ni pour la récupération), dégressive, jusqu'à l'échec. */
export type TypeSerie = "normale" | "echauffement" | "degressive" | "echec";
export interface SerieFaite { poids: number | null; reps: number; type?: TypeSerie; rir?: number | null }
export const estTravail = (s: { type?: TypeSerie }) => s.type !== "echauffement";
export interface ExoFait { exerciceId: string; series: SerieFaite[]; groupe?: number | null }
export interface SeanceHisto { id: string; debut: string; cible: string; exercices: ExoFait[] }

export interface EtatMuscle { pct: number; derniere: string | null; series: number }
export type Recuperation = Record<Muscle, EtatMuscle>;

export interface Suggestion { cible: CibleId; nom: string; pret: boolean; recup: number; raison: string }

export interface SeriePrevue { poids: number | null; reps: number; type?: TypeSerie }
export interface MeilleureSerie { unRM: number; poids: number | null; reps: number; date: string }
export interface PlanExo {
  exerciceId: string;
  raison: string;
  series: SeriePrevue[];
  derniere: { date: string; series: SerieFaite[] } | null;
  objectif: string;
  repos: number;
  /** Même numéro = exercices enchaînés en superset. */
  groupe?: number | null;
  /** Meilleure série jamais faite sur cet exercice (pour détecter un nouveau record, même hors-ligne). */
  record?: MeilleureSerie | null;
  /** Effort visé (reps en réserve) selon la semaine du cycle. */
  rirCible?: number | null;
}

/** Semaine du cycle d'entraînement (périodisation). */
export interface InfoCycle { semaine: number; total: number; decharge: boolean; rirCible: number }

export interface OptionsCoach {
  equipement: Equipement[];
  priorites?: Muscle[];
  cycle?: InfoCycle | null;
  supersets?: boolean;
  echauffement?: boolean;
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
    const n = ex.series.filter((x) => x.reps > 0 && estTravail(x)).length;
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
export function suggestions(historique: SeanceHisto[], maintenant = Date.now(), nb = 3, priorites: Muscle[] = []): Suggestion[] {
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
    let score = (plusRecent ?? 10) * 10 + moy / 5 + (classiques.has(c.id) ? 8 : 0) + (ms.some((m) => priorites.includes(m)) ? 12 : 0);
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
    const ex = s.exercices.find((e) => e.exerciceId === exerciceId && e.series.some((x) => x.reps > 0 && estTravail(x)));
    if (ex && (!best || s.debut > best.date)) best = { date: s.debut, series: ex.series.filter((x) => x.reps > 0 && estTravail(x)) };
  }
  return best;
}

const arrondi = (kg: number, pas: number) => (pas > 0 ? Math.round(kg / pas) * pas : kg);
const fmtKg = (kg: number | null) => (kg === null ? "" : `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace(".", ",")} kg`);

/**
 * Double progression (+ RIR si tu le saisis) :
 * - toutes les séries au haut de la fourchette (ou très facile : 3+ reps en réserve) → on monte la charge, retour en bas de fourchette ;
 * - sinon même charge, +1 rep par série (dans la fourchette) ;
 * - très en dessous du bas de la fourchette (ou échec complet) → on redescend d'un cran.
 * Le cycle ajuste ensuite le volume : +1 série en fin de cycle, semaine de décharge plus légère.
 */
export function proposerSeries(e: Exercice, derniere: { series: SerieFaite[] } | null, cycle: InfoCycle | null = null): { series: SeriePrevue[]; objectif: string } {
  const base = proposerBase(e, derniere);
  if (!cycle) return base;
  const nb = base.series.length;
  if (cycle.decharge) {
    // décharge : ~60 % des séries, charge -10 %, on laisse de la marge
    const n = Math.max(2, Math.round(nb * 0.6));
    const pas = e.increment > 0 ? e.increment : 2.5;
    const series = base.series.slice(0, n).map((x) => ({ ...x, poids: x.poids !== null && x.poids > 0 ? Math.max(0, arrondi(x.poids * 0.9, pas)) : x.poids }));
    return { series, objectif: `Semaine de décharge : ${n} séries légères, garde ~${cycle.rirCible} reps en réserve` };
  }
  // 2e moitié du cycle : +1 série sur les mouvements principaux
  const series = [...base.series];
  if (e.niveau <= 2 && cycle.semaine > Math.ceil((cycle.total - 1) / 2)) series.push({ ...series[series.length - 1] });
  const rir = cycle.rirCible === 0 ? "jusqu'à 0–1 rep en réserve" : `${cycle.rirCible} rep${cycle.rirCible > 1 ? "s" : ""} en réserve`;
  return { series, objectif: `${base.objectif} · ${rir}` };
}

function proposerBase(e: Exercice, derniere: { series: SerieFaite[] } | null): { series: SeriePrevue[]; objectif: string } {
  const [min, max] = e.reps;
  const u = e.unite === "sec" ? " s" : "";
  const travail = (derniere?.series ?? []).filter((x) => estTravail(x) && x.type !== "degressive");
  if (!travail.length) {
    const reps = Math.round((min + max) / 2);
    return {
      series: Array.from({ length: e.series }, () => ({ poids: null, reps })),
      objectif: e.increment > 0 ? `Première fois : trouve une charge pour ${min}–${max}${u} propres` : `Première fois : vise ${min}–${max}${u}`,
    };
  }
  // charge de référence = la plus lourde utilisée
  const poids = travail.reduce<number | null>((m, s) => (s.poids !== null && (m === null || s.poids > m) ? s.poids : m), null);
  const aCharge = travail.filter((s) => s.poids === poids);
  const rirs = aCharge.map((s) => s.rir).filter((x): x is number => typeof x === "number");
  const rirMoyen = rirs.length ? rirs.reduce((t, x) => t + x, 0) / rirs.length : null;
  const toutesAuMax = aCharge.length >= Math.min(e.series, travail.length) && aCharge.every((s) => s.reps >= max);
  // très facile : bonnes reps et encore 3 reps (ou plus) en réserve
  const tropFacile = rirMoyen !== null && rirMoyen >= 3 && aCharge.every((s) => s.reps >= Math.round((min + max) / 2));
  const tropDur = aCharge.filter((s) => s.reps < min - 1).length > aCharge.length / 2 || (rirMoyen !== null && rirMoyen <= 0 && aCharge.some((s) => s.reps < min));
  const avecLest = poids !== null && e.increment === 0; // poids du corps + lest éventuel
  const pas = e.increment > 0 ? e.increment : 2.5;

  if (toutesAuMax || tropFacile) {
    if (e.increment === 0 && !avecLest && e.unite !== "sec" && max >= 12) {
      return { series: Array.from({ length: e.series }, () => ({ poids: 5, reps: min })), objectif: `Bravo ! Ajoute un lest de 5 kg, vise ${min} reps` };
    }
    if (e.unite === "sec" || (e.increment === 0 && !avecLest)) {
      const r = max + (e.unite === "sec" ? 10 : 2);
      return { series: Array.from({ length: e.series }, () => ({ poids, reps: r })), objectif: `Au top la dernière fois : vise ${r}${u}` };
    }
    const p = arrondi((poids ?? 0) + pas, pas);
    const pourquoi = tropFacile && !toutesAuMax ? "Trop facile la dernière fois" : `+${fmtKg(pas)}`;
    return { series: Array.from({ length: e.series }, () => ({ poids: p, reps: min })), objectif: `${pourquoi} : ${fmtKg(p)} × ${min}${u}` };
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

/** Séries d'approche avant un mouvement lourd : 50 % × 10 puis 75 % × 5 de la charge prévue. */
export function seriesApproche(e: Exercice, poids: number | null): SeriePrevue[] {
  if (poids === null || poids < 10 || e.niveau !== 1) return [];
  const pas = e.increment > 0 ? e.increment : 2.5;
  return [
    { poids: Math.max(pas, arrondi(poids * 0.5, pas)), reps: 10, type: "echauffement" },
    { poids: Math.max(pas, arrondi(poids * 0.75, pas)), reps: 5, type: "echauffement" },
  ];
}

// ------------------------------------------------------------------ construction de la séance

export const REPOS: Record<1 | 2 | 3, number> = { 1: 150, 2: 90, 3: 60 };

function derniereSeanceCible(historique: SeanceHisto[], cible: string): SeanceHisto | undefined {
  return [...historique].filter((s) => s.cible === cible).sort((a, b) => b.debut.localeCompare(a.debut))[0];
}

/** Choisit les exercices d'une séance (sans les ordonner). Les muscles prioritaires reçoivent un exercice de plus. */
export function choisirExercices(cible: CibleId, historique: SeanceHisto[], equipement: Equipement[], priorites: Muscle[] = []): Exercice[] {
  const ok = (e: Exercice) => disponible(e, equipement);
  const choisis: Exercice[] = [];
  const familles = new Set<string>();
  const dejaFaits = new Set((derniereSeanceCible(historique, cible)?.exercices ?? []).map((x) => x.exerciceId));
  // exercices déjà pratiqués, du plus récent au plus ancien (pour garder le mouvement principal et suivre la progression)
  const pratiques: string[] = [];
  for (const s of [...historique].sort((a, b) => b.debut.localeCompare(a.debut)))
    for (const x of s.exercices) if (!pratiques.includes(x.exerciceId)) pratiques.push(x.exerciceId);

  const prendre = (e: Exercice) => { choisis.push(e); familles.add(e.famille); };

  for (const [muscle, nbPrevu] of CIBLES[cible].plan) {
    const nb = nbPrevu + (priorites.includes(muscle) ? 1 : 0);
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

/** Muscles antagonistes : on peut les enchaîner sans repos (l'un récupère pendant que l'autre travaille). */
const ANTAGONISTES: [Muscle, Muscle][] = [
  ["biceps", "triceps"], ["quadriceps", "ischios"], ["pectoraux", "dorsaux"], ["pectoraux", "haut_dos"],
  ["epaules_lat", "epaules_post"], ["epaules_ant", "epaules_post"], ["mollets", "abdos"], ["avant_bras", "abdos"], ["fessiers", "adducteurs"],
];
const antagonistes = (a: Muscle, b: Muscle) => ANTAGONISTES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/**
 * Supersets automatiques : uniquement entre isolations (les mouvements lourds gardent leur repos complet),
 * de muscles antagonistes. Les paires sont placées côte à côte, en conservant l'ordre général.
 */
export function grouperSupersets(exos: Exercice[]): { exos: Exercice[]; groupes: (number | null)[] } {
  const res: Exercice[] = [];
  const groupes: (number | null)[] = [];
  const pris = new Set<number>();
  let g = 0;
  exos.forEach((e, i) => {
    if (pris.has(i)) return;
    pris.add(i);
    if (e.niveau === 3) {
      const j = exos.findIndex((f, k) => k > i && !pris.has(k) && f.niveau === 3 && antagonistes(e.cible, f.cible));
      if (j >= 0) {
        pris.add(j); g++;
        res.push(e, exos[j]); groupes.push(g, g);
        return;
      }
    }
    res.push(e); groupes.push(null);
  });
  return { exos: res, groupes };
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
export function genererSeance(cible: CibleId, historique: SeanceHisto[], opts: OptionsCoach | Equipement[]): PlanExo[] {
  const o: OptionsCoach = Array.isArray(opts) ? { equipement: opts } : opts;
  let exos = ordonner(choisirExercices(cible, historique, o.equipement, o.priorites ?? []));
  let groupes: (number | null)[] = exos.map(() => null);
  if (o.supersets) ({ exos, groupes } = grouperSupersets(exos));
  const plans = exos.map((e, i) => ({ ...planPour(e, historique, i, exos.slice(0, i), o.cycle ?? null), groupe: groupes[i] }));
  if (o.echauffement !== false) {
    // séries d'approche sur le premier mouvement lourd de chaque muscle
    const vus = new Set<Muscle>();
    for (const p of plans) {
      const e = EXERCICES_PAR_ID[p.exerciceId];
      if (e.niveau !== 1 || vus.has(e.cible)) continue;
      vus.add(e.cible);
      p.series = [...seriesApproche(e, p.series[0]?.poids ?? null), ...p.series];
    }
  }
  return plans;
}

export function planPour(e: Exercice, historique: SeanceHisto[], index = 0, avant: Exercice[] = [], cycle: InfoCycle | null = null): PlanExo {
  const derniere = dernierePerf(historique, e.id);
  const p = proposerSeries(e, derniere, cycle);
  return {
    exerciceId: e.id, raison: raisonOrdre(e, index, avant), series: p.series, derniere, objectif: p.objectif, repos: REPOS[e.niveau],
    record: meilleurRecord(historique, e.id), rirCible: cycle?.rirCible ?? null,
  };
}

/** Exercices de remplacement pour le même muscle, les plus proches d'abord. */
export function alternatives(exerciceId: string, dejaDansSeance: string[], equipement: Equipement[]): Exercice[] {
  const e = EXERCICES_PAR_ID[exerciceId];
  if (!e) return [];
  return EXERCICES.filter((x) => x.cible === e.cible && x.id !== e.id && !dejaDansSeance.includes(x.id) && disponible(x, equipement))
    .sort((a, b) => Math.abs(a.niveau - e.niveau) - Math.abs(b.niveau - e.niveau) || b.pref - a.pref);
}

/** Meilleure série estimée (1RM, formule d'Epley) – pour la courbe de progression et les records. */
export function unRM(poids: number, reps: number): number {
  return reps <= 1 ? poids : poids * (1 + reps / 30);
}

/** Valeur de comparaison d'une série : 1RM estimé si chargée, sinon le nombre de reps (poids du corps, gainage). */
export const valeurSerie = (s: { poids: number | null; reps: number }) => (s.poids && s.poids > 0 ? unRM(s.poids, s.reps) : s.reps / 100);

/** Meilleure série jamais faite sur un exercice (hors échauffement). */
export function meilleurRecord(historique: SeanceHisto[], exerciceId: string): MeilleureSerie | null {
  let best: MeilleureSerie | null = null;
  for (const s of historique)
    for (const ex of s.exercices)
      if (ex.exerciceId === exerciceId)
        for (const x of ex.series)
          if (x.reps > 0 && estTravail(x)) {
            const v = valeurSerie(x);
            if (!best || v > best.unRM) best = { unRM: v, poids: x.poids, reps: x.reps, date: s.debut };
          }
  return best;
}

// ------------------------------------------------------------------ cycle, volume, régularité

/**
 * Cycle de `total` semaines : (total − 1) semaines de progression où l'effort monte (RIR 3 → 0),
 * puis 1 semaine de décharge (RIR 4). Le cycle recommence ensuite automatiquement.
 */
export function semaineCycle(debut: string | null | undefined, total: number, maintenant = Date.now()): InfoCycle | null {
  if (!debut || total < 3) return null;
  const t0 = Date.parse(debut);
  if (Number.isNaN(t0) || maintenant < t0) return null;
  const n = Math.floor((maintenant - t0) / (7 * JOUR)) % total; // 0..total-1
  if (n === total - 1) return { semaine: total, total, decharge: true, rirCible: 4 };
  const prog = total - 1;
  const rir = prog === 1 ? 2 : Math.round(3 - (3 * n) / (prog - 1));
  return { semaine: n + 1, total, decharge: false, rirCible: rir };
}

/** Lundi 0 h (heure locale du serveur) de la semaine en cours. */
export function debutSemaine(maintenant = Date.now()): number {
  const d = new Date(maintenant);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Objectif de séries par semaine pour un muscle (plus pour les muscles prioritaires, moins pour les petits). */
export function objectifSeries(m: Muscle, priorites: Muscle[] = []): number {
  const petits: Muscle[] = ["avant_bras", "adducteurs", "trapezes", "lombaires"];
  const base = petits.includes(m) ? 6 : 10;
  return priorites.includes(m) ? base + 4 : base;
}

/** Séries effectives par muscle depuis lundi. */
export function volumeSemaine(historique: SeanceHisto[], maintenant = Date.now()): Record<Muscle, number> {
  const t = debutSemaine(maintenant);
  const res = Object.fromEntries(LISTE_MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const s of historique) {
    if (Date.parse(s.debut) < t) continue;
    for (const [m, n] of seriesParMuscle(s)) res[m] += n;
  }
  for (const m of LISTE_MUSCLES) res[m] = Math.round(res[m] * 2) / 2;
  return res;
}

/** Semaines consécutives où l'objectif de séances est atteint (la semaine en cours compte dès qu'elle est réussie, sans casser la série sinon). */
export function regularite(historique: SeanceHisto[], objectif: number, maintenant = Date.now()): { semaines: number; cetteSemaine: number; objectif: number } {
  const lundi = debutSemaine(maintenant);
  const SEM = 7 * JOUR;
  const parSemaine = new Map<number, number>();
  for (const s of historique) {
    const t = Date.parse(s.debut);
    const k = Math.floor((lundi - debutSemaine(t)) / SEM + 0.5); // 0 = cette semaine, 1 = la précédente…
    if (k >= 0) parSemaine.set(k, (parSemaine.get(k) ?? 0) + 1);
  }
  const cetteSemaine = parSemaine.get(0) ?? 0;
  let semaines = cetteSemaine >= objectif ? 1 : 0;
  for (let k = 1; (parSemaine.get(k) ?? 0) >= objectif; k++) semaines++;
  return { semaines, cetteSemaine, objectif };
}
