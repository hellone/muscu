"use client";
// Côté téléphone : appels API, séance en cours (gardée sur le téléphone, marche hors-ligne) et envois en attente.
import { useSyncExternalStore } from "react";
import type { InfoCycle, PlanExo, SeanceHisto, SerieFaite, TypeSerie } from "./coach";
import { EXERCICES_PAR_ID } from "./exercices";

export class ErreurApi extends Error { constructor(message: string, public status: number) { super(message); } }

export async function api<T = any>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...reste } = init;
  const r = await fetch(url, {
    ...reste,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(reste.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : reste.body,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !url.startsWith("/api/compte/")) {
    location.href = "/connexion";
  }
  if (!r.ok) throw new ErreurApi(data?.erreur ?? "Erreur réseau.", r.status);
  return data as T;
}

// ------------------------------------------------------------ séance en cours

export interface SerieLocale { poids: number | null; reps: number; fait: boolean; type?: TypeSerie; rir?: number | null }
export interface ExoLocal extends Omit<PlanExo, "series"> { series: SerieLocale[] }
/** passee = séance saisie après coup (pas de minuteur, pas de durée) ; modif = correction d'une séance déjà enregistrée. */
export interface OptionsSeance { rir: boolean; echauffement: boolean; cycle: InfoCycle | null }
export interface SeanceLocale {
  id: string; cible: string; nomCible: string; debut: string; exos: ExoLocal[]; actif: number; passee?: boolean; modif?: boolean;
  options?: OptionsSeance;
}

const CLE = "muscu.seance";
const CLE_ENVOIS = "muscu.envois";
const ecouteurs = new Set<() => void>();
let cache: { brut: string | null; valeur: SeanceLocale | null } = { brut: null, valeur: null };

function lireBrut(): string | null {
  try { return localStorage.getItem(CLE); } catch { return null; }
}

export function lireSeance(): SeanceLocale | null {
  const brut = lireBrut();
  if (brut !== cache.brut) {
    let v: SeanceLocale | null = null;
    try { v = brut ? JSON.parse(brut) : null; } catch { v = null; }
    cache = { brut, valeur: v };
  }
  return cache.valeur;
}

export function ecrireSeance(s: SeanceLocale | null) {
  try {
    if (s) localStorage.setItem(CLE, JSON.stringify(s));
    else localStorage.removeItem(CLE);
  } catch { /* stockage plein ou indisponible */ }
  ecouteurs.forEach((l) => l());
}

function abonner(l: () => void) {
  ecouteurs.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === CLE) l(); };
  window.addEventListener("storage", onStorage);
  return () => { ecouteurs.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useSeance(): SeanceLocale | null {
  return useSyncExternalStore(abonner, lireSeance, () => null);
}

export function nouvelId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function demarrerSeance(cible: string, nomCible: string, plan: PlanExo[], debut?: string, options?: OptionsSeance) {
  const d = debut ?? new Date().toISOString();
  ecrireSeance({
    id: nouvelId(), cible, nomCible, debut: d, actif: plan.length ? 0 : -1, passee: estPassee(d), options,
    exos: plan.map((p) => ({ ...p, series: p.series.map((s) => ({ ...s, fait: false })) })),
  });
  prechargerVisuels(plan.map((p) => p.exerciceId));
}

/** Une séance commencée il y a plus de 3 h est considérée comme saisie après coup. */
export const estPassee = (iso: string) => Date.now() - Date.parse(iso) > 3 * 3600_000;

/** Recharge une séance enregistrée pour la corriger (même id : elle sera remplacée à l'enregistrement). */
export function modifierSeanceEnregistree(s: SeanceHisto, nomCible: string) {
  ecrireSeance({
    id: s.id, cible: s.cible, nomCible, debut: s.debut, actif: -1, passee: true, modif: true,
    exos: s.exercices.map((e) => ({
        exerciceId: e.exerciceId, raison: "", objectif: "", derniere: null, repos: 90, groupe: e.groupe ?? null,
        series: e.series.map((x) => ({ poids: x.poids, reps: x.reps, fait: true, type: x.type, rir: x.rir ?? null })),
    })),
  });
}

/** Conversions pour les champs date/heure du navigateur (heure locale). */
export function versChampDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const depuisChampDate = (v: string) => new Date(v).toISOString();

/** Télécharge à l'avance les visuels et fiches de la séance (pour les avoir en salle, même sans réseau). */
export function prechargerVisuels(ids: string[]) {
  for (const id of ids) {
    const e = EXERCICES_PAR_ID[id];
    if (!e) continue;
    for (const n of [0, 1]) fetch(`/exos/${e.image}/${n}.jpg`).catch(() => {});
    fetch(`/exercices/${id}`, { headers: { accept: "text/html" } }).catch(() => {});
  }
}

// ------------------------------------------------------------ envoi (avec file d'attente hors-ligne)

interface SeanceEnvoi { id: string; cible: string; debut: string; fin?: string; exercices: { exerciceId: string; series: SerieFaite[]; groupe?: number | null }[] }

export function versEnvoi(s: SeanceLocale): SeanceEnvoi {
  return {
    id: s.id, cible: s.cible, debut: s.debut, fin: s.passee ? undefined : new Date().toISOString(),
    exercices: s.exos.map((e) => ({
      exerciceId: e.exerciceId,
      groupe: e.groupe ?? null,
      series: e.series.filter((x) => x.fait && x.reps > 0).map(({ poids, reps, type, rir }) => ({
        poids, reps, ...(type && type !== "normale" ? { type } : {}), ...(typeof rir === "number" ? { rir } : {}),
      })),
    }))
      .filter((e) => e.series.length),
  };
}

function lireEnvois(): SeanceEnvoi[] {
  try { return JSON.parse(localStorage.getItem(CLE_ENVOIS) ?? "[]"); } catch { return []; }
}
function ecrireEnvois(l: SeanceEnvoi[]) {
  try { localStorage.setItem(CLE_ENVOIS, JSON.stringify(l)); } catch { /* */ }
}
export const nbEnvoisEnAttente = () => lireEnvois().length;

/** Envoie la séance ; si le réseau ne répond pas, elle est gardée et renvoyée plus tard. Renvoie true si enregistrée. */
export async function envoyerSeance(s: SeanceEnvoi): Promise<boolean> {
  try {
    await api("/api/seances", { method: "POST", json: s });
    return true;
  } catch (e) {
    if (e instanceof ErreurApi && e.status >= 400 && e.status < 500 && e.status !== 401) throw e; // séance refusée : inutile de réessayer
    ecrireEnvois([...lireEnvois().filter((x) => x.id !== s.id), s]);
    return false;
  }
}

/** Renvoie les séances en attente (au démarrage et au retour du réseau). */
export async function synchroniser(): Promise<number> {
  const l = lireEnvois();
  if (!l.length) return 0;
  const restants: SeanceEnvoi[] = [];
  for (const s of l) {
    try { await api("/api/seances", { method: "POST", json: s }); }
    catch (e) { if (!(e instanceof ErreurApi && e.status === 400)) restants.push(s); }
  }
  ecrireEnvois(restants);
  return l.length - restants.length;
}

// ------------------------------------------------------------ formats

export const fmtPoids = (kg: number | null | undefined) =>
  kg === null || kg === undefined ? "–" : `${Number.isInteger(kg) ? kg : String(kg).replace(".", ",")}`;

export function fmtDate(iso: string, avecJour = true): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", avecJour ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
}

export function ilYa(iso: string): string {
  const j = Math.floor((Date.now() - Date.parse(iso)) / 86400_000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 7) return `il y a ${j} jours`;
  if (j < 14) return "il y a 1 semaine";
  return `il y a ${Math.floor(j / 7)} semaines`;
}
