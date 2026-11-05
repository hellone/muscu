import { test } from "node:test";
import assert from "node:assert/strict";
import { genererSeance, proposerSeries, recuperation, suggestions, alternatives, type SeanceHisto } from "../lib/coach.ts";
import { EXERCICES, EXERCICES_PAR_ID, LISTE_EQUIPEMENTS, besoins, type Equipement } from "../lib/exercices.ts";
import { LISTE_CIBLES, MUSCLES } from "../lib/muscles.ts";
import fs from "node:fs";

const SALLE = LISTE_EQUIPEMENTS;
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

test("maison avec haltères seulement : jamais de barre, banc, machine, poulie ni barre de traction", () => {
  const dispo: Equipement[] = ["halteres"];
  for (const c of LISTE_CIBLES) {
    const plan = genererSeance(c.id, [], dispo);
    console.log(`  haltères/${c.id}:`, plan.map((p) => p.exerciceId).join(" > "));
    assert.ok(plan.length >= 2, `${c.id}: séance trop courte`);
    for (const p of plan) {
      const b = besoins(EXERCICES_PAR_ID[p.exerciceId]);
      assert.ok(b.every((x) => dispo.includes(x)), `${c.id}: ${p.exerciceId} demande ${b}`);
    }
  }
  assert.ok(!genererSeance("pecs_triceps", [], dispo).some((p) => p.exerciceId === "dc-barre"));
});

test("haltères + banc : développé couché aux haltères proposé", () => {
  const ids = genererSeance("pecs_triceps", [], ["halteres", "banc"]).map((p) => p.exerciceId);
  assert.equal(ids[0], "dc-halteres");
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
  const alt = alternatives("dc-barre", ["di-halteres"], SALLE as Equipement[]);
  assert.ok(alt.length > 3);
  assert.ok(alt.every((e) => e.cible === "pectoraux" && e.id !== "di-halteres"));
});

// ------------------------------------------------------------------ v3
import { grouperSupersets, meilleurRecord, proposerSeries as proposer, regularite, semaineCycle, volumeSemaine, seriesParMuscle } from "../lib/coach.ts";

test("cycle de 5 semaines : RIR 3 → 0 puis décharge, puis recommence", () => {
  const debut = "2026-11-02T00:00:00.000Z";
  const rirs = [0, 1, 2, 3, 4, 5].map((k) => semaineCycle(debut, 5, Date.parse(debut) + (k * 7 + 1) * J));
  assert.deepEqual(rirs.map((c) => c!.rirCible), [3, 2, 1, 0, 4, 3]);
  assert.deepEqual(rirs.map((c) => c!.decharge), [false, false, false, false, true, false]);
});

test("décharge : moins de séries et charge -10 %", () => {
  const e = EXERCICES_PAR_ID["dc-barre"];
  const p = proposer(e, { series: [8, 8, 8, 8].map((reps) => ({ poids: 80, reps })) }, { semaine: 5, total: 5, decharge: true, rirCible: 4 });
  assert.equal(p.series.length, 2);
  assert.equal(p.series[0].poids, 72.5);
});

test("RIR : très facile (3+ en réserve) → on monte la charge même sans être au max", () => {
  const e = EXERCICES_PAR_ID["dc-barre"];
  const p = proposer(e, { series: [8, 8, 8, 8].map((reps) => ({ poids: 80, reps, rir: 4 })) });
  assert.equal(p.series[0].poids, 82.5);
});

test("échauffement : séries d'approche sur le premier mouvement lourd, exclues des comptes", () => {
  const h = [seance("pecs_triceps", 4, ["dc-barre"], 80, 8)];
  const plan = genererSeance("pecs_triceps", h, { equipement: SALLE, echauffement: true });
  const dc = plan.find((p) => p.exerciceId === "dc-barre")!;
  assert.deepEqual(dc.series.slice(0, 2).map((s) => s.type), ["echauffement", "echauffement"]);
  assert.equal(dc.series[0].poids, 40);
  const s: SeanceHisto = { id: "x", debut: ilYa(0), cible: "pecs_triceps", exercices: [{ exerciceId: "dc-barre", series: [{ poids: 40, reps: 10, type: "echauffement" }, { poids: 80, reps: 8 }] }] };
  assert.equal(seriesParMuscle(s).get("pectoraux"), 1);
});

test("supersets automatiques : biceps/triceps enchaînés, jamais les mouvements lourds", () => {
  const plan = genererSeance("bras", [], { equipement: SALLE, supersets: true });
  const groupes = plan.filter((p) => p.groupe);
  assert.ok(groupes.length >= 2);
  for (const p of groupes) assert.equal(EXERCICES_PAR_ID[p.exerciceId].niveau, 3);
  // les deux membres d'un superset sont adjacents et de muscles opposés
  for (let i = 0; i < plan.length - 1; i++) {
    if (plan[i].groupe && plan[i].groupe === plan[i + 1].groupe) {
      const m = [EXERCICES_PAR_ID[plan[i].exerciceId].cible, EXERCICES_PAR_ID[plan[i + 1].exerciceId].cible].sort().join("+");
      assert.ok(["biceps+triceps", "abdos+avant_bras"].includes(m) || m.includes("biceps") || m.includes("triceps"), m);
    }
  }
  const { groupes: g } = grouperSupersets([EXERCICES_PAR_ID["dc-barre"], EXERCICES_PAR_ID["curl-barre"], EXERCICES_PAR_ID["extension-poulie"]]);
  assert.deepEqual(g, [null, 1, 1]);
});

test("muscles prioritaires : un exercice de plus", () => {
  const sans = genererSeance("pecs_triceps", [], { equipement: SALLE }).filter((p) => EXERCICES_PAR_ID[p.exerciceId].cible === "epaules_lat").length;
  const avec = genererSeance("pecs_triceps", [], { equipement: SALLE, priorites: ["epaules_lat"] }).filter((p) => EXERCICES_PAR_ID[p.exerciceId].cible === "epaules_lat").length;
  assert.equal(avec, sans + 1);
});

test("record et régularité", () => {
  const h = [seance("pecs_triceps", 10, ["dc-barre"], 70, 8), seance("pecs_triceps", 3, ["dc-barre"], 80, 6)];
  const r = meilleurRecord(h, "dc-barre")!;
  assert.equal(r.poids, 80);
  const reg = regularite([seance("a", 0, ["dc-barre"]), seance("b", 7, ["dc-barre"]), seance("c", 8, ["dc-barre"])], 1, maintenant);
  assert.ok(reg.semaines >= 2);
  assert.ok(volumeSemaine([seance("a", 0, ["dc-barre"])], maintenant).pectoraux >= 4);
});
