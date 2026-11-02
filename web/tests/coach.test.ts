import { test } from "node:test";
import assert from "node:assert/strict";
import { genererSeance, proposerSeries, recuperation, suggestions, alternatives, type SeanceHisto } from "../lib/coach.ts";
import { EXERCICES, EXERCICES_PAR_ID, PROFILS_MATERIEL } from "../lib/exercices.ts";
import { LISTE_CIBLES, MUSCLES } from "../lib/muscles.ts";
import fs from "node:fs";

const SALLE = PROFILS_MATERIEL.salle.materiel;
const J = 86400_000;
const maintenant = Date.parse("2026-11-02T18:00:00Z");
const ilYa = (j: number) => new Date(maintenant - j * J).toISOString();
const seance = (cible: string, j: number, ids: string[], poids = 50, reps = 8): SeanceHisto => ({
  id: `${cible}-${j}`, debut: ilYa(j), cible,
  exercices: ids.map((id) => ({ exerciceId: id, series: [1, 2, 3, 4].map(() => ({ poids, reps })) })),
});

test("catalogue cohérent : ids uniques, images présentes, muscles connus", () => {
  assert.equal(new Set(EXERCICES.map((e) => e.id)).size, EXERCICES.length);
  for (const e of EXERCICES) {
    assert.ok(fs.existsSync(`public/exos/${e.image}/0.jpg`), `image manquante ${e.image}`);
    assert.ok(fs.existsSync(`public/exos/${e.image}/1.jpg`), `image manquante ${e.image}`);
    for (const m of [e.cible, ...e.principaux, ...e.secondaires]) assert.ok(MUSCLES[m], `${e.id}: muscle ${m}`);
    assert.ok(e.principaux.includes(e.cible), `${e.id}: la cible doit être un muscle principal`);
  }
});

test("chaque cible donne une séance complète en salle, ordonnée lourd → isolation, abdos à la fin", () => {
  for (const c of LISTE_CIBLES) {
    const plan = genererSeance(c.id, [], SALLE);
    const attendu = c.plan.reduce((t, [, n]) => t + n, 0);
    assert.ok(plan.length >= attendu - 1, `${c.id}: ${plan.length}/${attendu}`);
    const niveaux = plan.map((p) => (EXERCICES_PAR_ID[p.exerciceId].cible === "abdos" ? 9 : EXERCICES_PAR_ID[p.exerciceId].niveau));
    assert.deepEqual(niveaux, [...niveaux].sort((a, b) => a - b), `${c.id}: ordre ${plan.map((p) => p.exerciceId)}`);
    const familles = plan.map((p) => EXERCICES_PAR_ID[p.exerciceId].famille);
    assert.equal(new Set(familles).size, familles.length, `${c.id}: doublon de famille`);
  }
});

test("pecs : développé couché avant les dips, triceps isolés en dernier", () => {
  const ids = genererSeance("pecs_triceps", [], SALLE).map((p) => p.exerciceId);
  console.log("  pecs_triceps:", ids.join(" > "));
  assert.equal(ids[0], "dc-barre");
  const iDips = ids.findIndex((i) => i.startsWith("dips"));
  assert.ok(iDips > 0);
  assert.equal(EXERCICES_PAR_ID[ids[ids.length - 1]].cible, "triceps");
});

test("matériel maison : aucune machine ni poulie", () => {
  for (const c of LISTE_CIBLES) {
    for (const p of genererSeance(c.id, [], PROFILS_MATERIEL.maison.materiel)) {
      assert.ok(!["machine", "poulie"].includes(EXERCICES_PAR_ID[p.exerciceId].materiel));
    }
  }
});

test("récupération : jambes faites hier → pas prêtes ; il y a 4 jours → prêtes", () => {
  const h1 = [seance("jambes", 1, ["squat", "presse", "leg-curl-allonge"])];
  assert.ok(recuperation(h1, maintenant).quadriceps.pct < 50);
  const h4 = [seance("jambes", 4, ["squat", "presse", "leg-curl-allonge"])];
  assert.equal(recuperation(h4, maintenant).quadriceps.pct, 100);
});

test("suggestions : après pecs lundi et dos mardi, mercredi on propose les jambes en premier", () => {
  const h = [seance("pecs_triceps", 2, ["dc-barre", "di-halteres", "extension-poulie"]), seance("dos_biceps", 1, ["tractions", "rowing-barre", "curl-barre"])];
  const s = suggestions(h, maintenant);
  console.log("  suggestions:", s.map((x) => `${x.nom} (${x.raison})`).join(" | "));
  assert.equal(s[0].cible, "jambes");
  assert.ok(!s.slice(0, 2).some((x) => x.cible === "dos_biceps"));
});

test("on garde le mouvement principal déjà pratiqué et on varie les compléments", () => {
  const h = [seance("pecs_triceps", 4, ["dc-halteres", "di-halteres", "ecarte-poulie", "elevations-laterales", "dips-triceps", "extension-poulie"])];
  const ids = genererSeance("pecs_triceps", h, SALLE).map((p) => p.exerciceId);
  console.log("  séance suivante:", ids.join(" > "));
  assert.equal(ids[0], "dc-halteres");
  assert.ok(!ids.includes("ecarte-poulie"), "l'écarté devrait varier");
});

test("double progression", () => {
  const e = EXERCICES_PAR_ID["dc-barre"]; // 6–10 reps, +2,5 kg
  const auMax = proposerSeries(e, { series: [10, 10, 10, 10].map((reps) => ({ poids: 80, reps })) });
  assert.deepEqual(auMax.series[0], { poids: 82.5, reps: 6 });
  const milieu = proposerSeries(e, { series: [8, 8, 7, 6].map((reps) => ({ poids: 80, reps })) });
  assert.deepEqual(milieu.series.map((s) => s.reps), [9, 9, 8, 7]);
  assert.equal(milieu.series[0].poids, 80);
  const dur = proposerSeries(e, { series: [4, 3, 3, 3].map((reps) => ({ poids: 80, reps })) });
  assert.equal(dur.series[0].poids, 77.5);
  const premiere = proposerSeries(e, null);
  assert.equal(premiere.series[0].poids, null);
});

test("alternatives : même muscle, pas déjà dans la séance", () => {
  const alt = alternatives("dc-barre", ["di-halteres"], SALLE);
  assert.ok(alt.length > 3);
  assert.ok(alt.every((e) => e.cible === "pectoraux" && e.id !== "di-halteres"));
});
