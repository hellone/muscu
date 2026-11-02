// Muscles suivis par l'appli et cibles de séance.
// Fichier partagé client + serveur (aucune dépendance serveur).

export type Muscle =
  | "pectoraux" | "dorsaux" | "haut_dos" | "trapezes" | "lombaires"
  | "epaules_ant" | "epaules_lat" | "epaules_post"
  | "biceps" | "triceps" | "avant_bras" | "abdos"
  | "quadriceps" | "ischios" | "fessiers" | "mollets" | "adducteurs";

export interface InfoMuscle {
  nom: string;
  /** Rang de taille : 1 = le plus gros. Les gros muscles passent avant les petits. */
  taille: number;
  /** Heures pour récupérer d'une séance normale (≈ 10 séries). */
  recup: number;
}

export const MUSCLES: Record<Muscle, InfoMuscle> = {
  quadriceps:   { nom: "Quadriceps",           taille: 1,  recup: 72 },
  fessiers:     { nom: "Fessiers",             taille: 2,  recup: 72 },
  dorsaux:      { nom: "Dorsaux",              taille: 3,  recup: 72 },
  ischios:      { nom: "Ischio-jambiers",      taille: 4,  recup: 72 },
  pectoraux:    { nom: "Pectoraux",            taille: 5,  recup: 72 },
  haut_dos:     { nom: "Haut du dos",          taille: 6,  recup: 60 },
  lombaires:    { nom: "Lombaires",            taille: 7,  recup: 72 },
  epaules_ant:  { nom: "Épaules (avant)",      taille: 8,  recup: 48 },
  epaules_lat:  { nom: "Épaules (côté)",       taille: 9,  recup: 48 },
  epaules_post: { nom: "Épaules (arrière)",    taille: 10, recup: 48 },
  trapezes:     { nom: "Trapèzes",             taille: 11, recup: 48 },
  triceps:      { nom: "Triceps",              taille: 12, recup: 48 },
  biceps:       { nom: "Biceps",               taille: 13, recup: 48 },
  adducteurs:   { nom: "Adducteurs",           taille: 14, recup: 48 },
  mollets:      { nom: "Mollets",              taille: 15, recup: 48 },
  avant_bras:   { nom: "Avant-bras",           taille: 16, recup: 36 },
  abdos:        { nom: "Abdos",                taille: 17, recup: 36 },
};

export const LISTE_MUSCLES = Object.keys(MUSCLES) as Muscle[];

/** Regroupement pour les listes (catalogue, ajout d'exercice) : on cherche « Épaules », pas « deltoïde postérieur ». */
export const GROUPES: { nom: string; muscles: Muscle[] }[] = [
  { nom: "Pectoraux", muscles: ["pectoraux"] },
  { nom: "Dos", muscles: ["dorsaux", "haut_dos", "trapezes", "lombaires"] },
  { nom: "Épaules", muscles: ["epaules_ant", "epaules_lat", "epaules_post"] },
  { nom: "Bras", muscles: ["biceps", "triceps", "avant_bras"] },
  { nom: "Jambes", muscles: ["quadriceps", "ischios", "fessiers", "adducteurs", "mollets"] },
  { nom: "Abdos", muscles: ["abdos"] },
];

export type CibleId = "pecs_triceps" | "dos_biceps" | "jambes" | "epaules_abdos" | "bras" | "haut_corps" | "full_body";

export interface Cible {
  id: CibleId;
  nom: string;
  /** Nombre d'exercices par muscle visé, dans l'ordre d'importance. */
  plan: [Muscle, number][];
}

export const CIBLES: Record<CibleId, Cible> = {
  pecs_triceps:  { id: "pecs_triceps",  nom: "Pectoraux + Triceps", plan: [["pectoraux", 3], ["epaules_lat", 1], ["triceps", 2]] },
  dos_biceps:    { id: "dos_biceps",    nom: "Dos + Biceps",        plan: [["dorsaux", 2], ["haut_dos", 1], ["epaules_post", 1], ["biceps", 2]] },
  jambes:        { id: "jambes",        nom: "Jambes",              plan: [["quadriceps", 2], ["ischios", 2], ["fessiers", 1], ["mollets", 1]] },
  epaules_abdos: { id: "epaules_abdos", nom: "Épaules + Abdos",     plan: [["epaules_ant", 1], ["epaules_lat", 2], ["epaules_post", 1], ["abdos", 2]] },
  bras:          { id: "bras",          nom: "Bras",                plan: [["biceps", 3], ["triceps", 3], ["avant_bras", 1]] },
  haut_corps:    { id: "haut_corps",    nom: "Haut du corps",       plan: [["pectoraux", 2], ["dorsaux", 1], ["haut_dos", 1], ["epaules_ant", 1], ["epaules_lat", 1]] },
  full_body:     { id: "full_body",     nom: "Full body",           plan: [["quadriceps", 1], ["ischios", 1], ["pectoraux", 1], ["dorsaux", 1], ["epaules_ant", 1], ["abdos", 1]] },
};

export const LISTE_CIBLES = Object.values(CIBLES);

export const musclesDeCible = (id: CibleId): Muscle[] => CIBLES[id].plan.map(([m]) => m);
