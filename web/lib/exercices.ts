// Catalogue des exercices.
// Images : Free Exercise DB (domaine public, Unlicense) – copiées dans public/exos/<image>/0.jpg et 1.jpg.
import type { Muscle } from "./muscles";

export type Materiel = "barre" | "halteres" | "machine" | "poulie" | "poids_corps";

/**
 * 1 = polyarticulaire lourd (en début de séance)
 * 2 = polyarticulaire secondaire / variante
 * 3 = isolation (en fin de séance)
 */
export type Niveau = 1 | 2 | 3;

export interface Exercice {
  id: string;
  nom: string;
  image: string;
  materiel: Materiel;
  /** Équipement nécessaire en plus de celui du matériel (banc, barre de traction…). */
  requiert?: Equipement[];
  /** Muscle pour lequel l'exercice compte dans le plan de séance. */
  cible: Muscle;
  principaux: Muscle[];
  secondaires: Muscle[];
  niveau: Niveau;
  /** Deux exercices de la même famille ne sont pas proposés dans la même séance. */
  famille: string;
  reps: [number, number];
  series: number;
  /** Pas d'augmentation de charge (kg). 0 = au poids du corps, on progresse en reps. */
  increment: number;
  unite?: "reps" | "sec";
  /** Préférence quand plusieurs choix sont possibles (3 = classique incontournable). */
  pref: number;
  consignes: string[];
}

type Def = Omit<Exercice, "reps" | "series" | "increment"> & Partial<Pick<Exercice, "reps" | "series" | "increment">>;

const REPS: Record<Niveau, [number, number]> = { 1: [6, 10], 2: [8, 12], 3: [10, 15] };
const SERIES: Record<Niveau, number> = { 1: 4, 2: 3, 3: 3 };
const INCREMENT: Record<Materiel, number> = { barre: 2.5, halteres: 2, machine: 2.5, poulie: 2.5, poids_corps: 0 };

const D: Def[] = [
  // ---------------------------------------------------------------- Pectoraux
  { id: "dc-barre", requiert: ["banc"], nom: "Développé couché à la barre", image: "Barbell_Bench_Press_-_Medium_Grip", materiel: "barre", cible: "pectoraux",
    principaux: ["pectoraux"], secondaires: ["epaules_ant", "triceps"], niveau: 1, famille: "dev-horizontal", pref: 3,
    consignes: ["Omoplates serrées et basses, pieds bien ancrés au sol.", "Descends la barre au bas des pectoraux, coudes à ~45° du buste.", "Pousse en expirant, sans décoller les fesses du banc."] },
  { id: "dc-halteres", requiert: ["banc"], nom: "Développé couché aux haltères", image: "Dumbbell_Bench_Press", materiel: "halteres", cible: "pectoraux",
    principaux: ["pectoraux"], secondaires: ["epaules_ant", "triceps"], niveau: 1, famille: "dev-horizontal", pref: 2,
    consignes: ["Haltères au-dessus de la poitrine, paumes vers les pieds.", "Descends lentement jusqu'à sentir l'étirement des pectoraux.", "Remonte en rapprochant légèrement les haltères."] },
  { id: "di-barre", requiert: ["banc"], nom: "Développé incliné à la barre", image: "Barbell_Incline_Bench_Press_-_Medium_Grip", materiel: "barre", cible: "pectoraux",
    principaux: ["pectoraux", "epaules_ant"], secondaires: ["triceps"], niveau: 1, famille: "dev-incline", pref: 2,
    consignes: ["Banc incliné à 30-45°.", "Descends la barre vers le haut des pectoraux.", "Garde les omoplates serrées pendant toute la série."] },
  { id: "di-halteres", requiert: ["banc"], nom: "Développé incliné aux haltères", image: "Incline_Dumbbell_Press", materiel: "halteres", cible: "pectoraux",
    principaux: ["pectoraux", "epaules_ant"], secondaires: ["triceps"], niveau: 2, famille: "dev-incline", pref: 3,
    consignes: ["Banc incliné à 30-45°, haltères à hauteur des épaules.", "Pousse vers le haut sans claquer les haltères.", "Contrôle la descente sur 2 secondes."] },
  { id: "dc-sol-halteres", nom: "Développé au sol aux haltères", image: "Dumbbell_Floor_Press", materiel: "halteres", cible: "pectoraux",
    principaux: ["pectoraux", "triceps"], secondaires: ["epaules_ant"], niveau: 1, famille: "dev-horizontal", pref: 2,
    consignes: ["Allongé au sol, genoux pliés, haltères au-dessus de la poitrine.", "Descends jusqu'à ce que les coudes touchent légèrement le sol.", "Pousse sans rebondir sur le sol. Idéal sans banc."] },
  { id: "pompes-declinees", nom: "Pompes déclinées (pieds surélevés)", image: "Decline_Push-Up", materiel: "poids_corps", cible: "pectoraux",
    principaux: ["pectoraux", "epaules_ant"], secondaires: ["triceps"], niveau: 2, famille: "pompes-declinees", pref: 2, reps: [8, 20],
    consignes: ["Pieds posés sur une chaise ou un canapé.", "Corps gainé, mains un peu plus larges que les épaules.", "Descends la poitrine vers le sol, remonte sans cambrer."] },
  { id: "dc-machine", nom: "Développé à la machine (chest press)", image: "Leverage_Chest_Press", materiel: "machine", cible: "pectoraux",
    principaux: ["pectoraux"], secondaires: ["epaules_ant", "triceps"], niveau: 2, famille: "dev-machine", pref: 2,
    consignes: ["Règle le siège pour que les poignées soient au milieu des pectoraux.", "Pousse sans verrouiller complètement les coudes.", "Reviens lentement en gardant la poitrine sortie."] },
  { id: "dips-pecs", requiert: ["dips"], nom: "Dips (buste penché)", image: "Dips_-_Chest_Version", materiel: "poids_corps", cible: "pectoraux",
    principaux: ["pectoraux", "triceps"], secondaires: ["epaules_ant"], niveau: 2, famille: "dips", pref: 3, reps: [6, 12],
    consignes: ["Penche le buste vers l'avant, coudes légèrement écartés.", "Descends jusqu'à ce que les épaules soient au niveau des coudes.", "Remonte sans verrouiller brutalement. Ajoute du lest quand 12 reps passent."] },
  { id: "pompes", nom: "Pompes", image: "Pushups", materiel: "poids_corps", cible: "pectoraux",
    principaux: ["pectoraux"], secondaires: ["triceps", "epaules_ant", "abdos"], niveau: 2, famille: "pompes", pref: 1, reps: [10, 25],
    consignes: ["Corps gainé et aligné de la tête aux talons.", "Mains un peu plus larges que les épaules.", "Poitrine jusqu'à quelques cm du sol."] },
  { id: "ecarte-halteres", requiert: ["banc"], nom: "Écarté couché aux haltères", image: "Dumbbell_Flyes", materiel: "halteres", cible: "pectoraux",
    principaux: ["pectoraux"], secondaires: [], niveau: 3, famille: "ecarte", pref: 2,
    consignes: ["Coudes légèrement fléchis et fixes pendant tout le mouvement.", "Ouvre les bras en arc de cercle jusqu'à l'étirement.", "Referme comme si tu serrais un gros arbre."] },
  { id: "ecarte-poulie", nom: "Écarté à la poulie (vis-à-vis)", image: "Cable_Crossover", materiel: "poulie", cible: "pectoraux",
    principaux: ["pectoraux"], secondaires: ["epaules_ant"], niveau: 3, famille: "ecarte", pref: 3,
    consignes: ["Un pied devant, buste légèrement penché.", "Ramène les poignées devant toi en arc de cercle.", "Serre les pectoraux 1 seconde, puis reviens lentement."] },
  { id: "pec-deck", nom: "Pec deck (butterfly)", image: "Butterfly", materiel: "machine", cible: "pectoraux",
    principaux: ["pectoraux"], secondaires: [], niveau: 3, famille: "ecarte", pref: 2,
    consignes: ["Dos plaqué au dossier, poignées à hauteur de poitrine.", "Ramène les bras devant toi en serrant les pectoraux.", "Reviens sans laisser les charges se toucher."] },

  // ---------------------------------------------------------------- Dos
  { id: "tractions", requiert: ["traction"], nom: "Tractions pronation", image: "Pullups", materiel: "poids_corps", cible: "dorsaux",
    principaux: ["dorsaux"], secondaires: ["biceps", "haut_dos"], niveau: 1, famille: "traction", pref: 3, reps: [5, 12],
    consignes: ["Mains un peu plus larges que les épaules, paumes vers l'avant.", "Tire les coudes vers les hanches, poitrine vers la barre.", "Descends bras tendus à chaque rep. Ajoute du lest au-delà de 12."] },
  { id: "tractions-supination", requiert: ["traction"], nom: "Tractions supination (chin-up)", image: "Chin-Up", materiel: "poids_corps", cible: "dorsaux",
    principaux: ["dorsaux", "biceps"], secondaires: ["haut_dos", "avant_bras"], niveau: 1, famille: "traction", pref: 2, reps: [5, 12],
    consignes: ["Mains largeur d'épaules, paumes vers toi.", "Monte jusqu'à passer le menton au-dessus de la barre.", "Descends lentement, bras tendus."] },
  { id: "tirage-vertical", nom: "Tirage vertical prise large", image: "Wide-Grip_Lat_Pulldown", materiel: "poulie", cible: "dorsaux",
    principaux: ["dorsaux"], secondaires: ["biceps", "haut_dos", "epaules_post"], niveau: 2, famille: "tirage-vertical", pref: 3,
    consignes: ["Cuisses bloquées sous les boudins, buste légèrement en arrière.", "Tire la barre vers le haut de la poitrine.", "Pense « coudes dans les poches », pas « mains vers le bas »."] },
  { id: "tirage-serre", nom: "Tirage vertical prise serrée", image: "Close-Grip_Front_Lat_Pulldown", materiel: "poulie", cible: "dorsaux",
    principaux: ["dorsaux"], secondaires: ["biceps", "haut_dos"], niveau: 2, famille: "tirage-vertical", pref: 2,
    consignes: ["Prise serrée, buste légèrement incliné.", "Tire jusqu'au haut de la poitrine en serrant les omoplates.", "Remonte en contrôlant jusqu'à l'étirement complet."] },
  { id: "pullover-poulie", nom: "Pull-over à la poulie, bras tendus", image: "Straight-Arm_Pulldown", materiel: "poulie", cible: "dorsaux",
    principaux: ["dorsaux"], secondaires: [], niveau: 3, famille: "pullover", pref: 2,
    consignes: ["Bras presque tendus, buste légèrement penché.", "Descends la barre jusqu'aux cuisses en arc de cercle.", "Sens les dorsaux travailler, pas les triceps."] },
  { id: "pullover-haltere", requiert: ["banc"], nom: "Pull-over haltère", image: "Bent-Arm_Dumbbell_Pullover", materiel: "halteres", cible: "dorsaux",
    principaux: ["dorsaux", "pectoraux"], secondaires: ["triceps"], niveau: 3, famille: "pullover", pref: 1,
    consignes: ["Allongé en travers ou le long du banc, haltère tenu à deux mains au-dessus de la poitrine.", "Descends l'haltère derrière la tête, coudes légèrement fléchis.", "Ramène-le au-dessus de la poitrine en contractant le dos."] },
  { id: "rowing-barre", nom: "Rowing barre buste penché", image: "Bent_Over_Barbell_Row", materiel: "barre", cible: "haut_dos",
    principaux: ["haut_dos", "dorsaux"], secondaires: ["biceps", "epaules_post", "lombaires"], niveau: 1, famille: "rowing", pref: 3,
    consignes: ["Dos plat, buste penché à ~45°, genoux fléchis.", "Tire la barre vers le nombril.", "Serre les omoplates en haut, redescends en contrôle."] },
  { id: "rowing-2-halteres", nom: "Rowing buste penché aux haltères", image: "Bent_Over_Two-Dumbbell_Row", materiel: "halteres", cible: "haut_dos",
    principaux: ["haut_dos", "dorsaux"], secondaires: ["biceps", "epaules_post", "lombaires"], niveau: 1, famille: "rowing", pref: 2,
    consignes: ["Debout, genoux fléchis, buste penché à ~45°, dos plat.", "Tire les deux haltères vers le bas des côtes.", "Serre les omoplates en haut, redescends lentement."] },
  { id: "rowing-haltere-genou", nom: "Rowing haltère un bras (main sur le genou)", image: "One-Arm_Dumbbell_Row", materiel: "halteres", cible: "dorsaux",
    principaux: ["dorsaux", "haut_dos"], secondaires: ["biceps", "epaules_post"], niveau: 2, famille: "rowing-unilateral", pref: 2,
    consignes: ["En fente, main libre posée sur le genou avant (ou une chaise), dos plat.", "Tire l'haltère vers la hanche, coude près du corps.", "Descends bras tendu pour bien étirer le dos. Reps par bras."] },
  { id: "rowing-haltere", requiert: ["banc"], nom: "Rowing haltère un bras", image: "One-Arm_Dumbbell_Row", materiel: "halteres", cible: "haut_dos",
    principaux: ["haut_dos", "dorsaux"], secondaires: ["biceps", "epaules_post"], niveau: 2, famille: "rowing-unilateral", pref: 3,
    consignes: ["Main et genou en appui sur le banc, dos plat.", "Tire l'haltère vers la hanche, coude près du corps.", "Descends bras tendu pour étirer le dos."] },
  { id: "tirage-horizontal", nom: "Tirage horizontal à la poulie", image: "Seated_Cable_Rows", materiel: "poulie", cible: "haut_dos",
    principaux: ["haut_dos", "dorsaux"], secondaires: ["biceps", "epaules_post"], niveau: 2, famille: "tirage-horizontal", pref: 3,
    consignes: ["Assis, dos droit, légère flexion des genoux.", "Tire la poignée vers le ventre en sortant la poitrine.", "Ne te balance pas : seuls les bras et les omoplates bougent."] },
  { id: "rowing-t", nom: "Rowing T-bar", image: "T-Bar_Row_with_Handle", materiel: "barre", cible: "haut_dos",
    principaux: ["haut_dos", "dorsaux"], secondaires: ["biceps"], niveau: 1, famille: "rowing", pref: 2,
    consignes: ["Dos plat, buste penché, barre entre les jambes.", "Tire la poignée vers la poitrine.", "Garde le dos fixe, ne donne pas d'élan."] },
  { id: "rowing-machine", nom: "Rowing à la machine", image: "Leverage_High_Row", materiel: "machine", cible: "haut_dos",
    principaux: ["haut_dos"], secondaires: ["dorsaux", "biceps"], niveau: 2, famille: "tirage-horizontal", pref: 2,
    consignes: ["Poitrine contre l'appui.", "Tire les poignées en serrant les omoplates.", "Reviens lentement jusqu'à l'étirement."] },
  { id: "souleve-terre", nom: "Soulevé de terre", image: "Barbell_Deadlift", materiel: "barre", cible: "lombaires",
    principaux: ["lombaires", "ischios", "fessiers"], secondaires: ["dorsaux", "trapezes", "quadriceps", "avant_bras"], niveau: 1, famille: "souleve", pref: 3, reps: [3, 6], series: 3,
    consignes: ["Barre au-dessus du milieu des pieds, tibias proches de la barre.", "Dos plat et gainé, pousse le sol avec les jambes.", "Hanches et épaules montent ensemble. Ne jamais arrondir le dos."] },
  { id: "extension-lombaires", requiert: ["machine"], nom: "Extensions lombaires (banc à 45°)", image: "Hyperextensions_Back_Extensions", materiel: "poids_corps", cible: "lombaires",
    principaux: ["lombaires"], secondaires: ["fessiers", "ischios"], niveau: 3, famille: "lombaires", pref: 2, reps: [12, 20],
    consignes: ["Hanches calées sur le support.", "Descends le buste dos plat, puis remonte jusqu'à l'alignement.", "Ne pas hyper-cambrer en haut."] },
  { id: "shrug-halteres", nom: "Haussements d'épaules (shrugs)", image: "Dumbbell_Shrug", materiel: "halteres", cible: "trapezes",
    principaux: ["trapezes"], secondaires: ["avant_bras"], niveau: 3, famille: "shrug", pref: 3,
    consignes: ["Bras tendus le long du corps.", "Monte les épaules vers les oreilles, tiens 1 seconde.", "Ne roule pas les épaules."] },
  { id: "shrug-barre", nom: "Shrugs à la barre", image: "Barbell_Shrug", materiel: "barre", cible: "trapezes",
    principaux: ["trapezes"], secondaires: ["avant_bras"], niveau: 3, famille: "shrug", pref: 2,
    consignes: ["Barre devant les cuisses, prise largeur d'épaules.", "Monte les épaules le plus haut possible.", "Redescends lentement."] },

  // ---------------------------------------------------------------- Épaules
  { id: "dev-militaire", nom: "Développé militaire debout", image: "Standing_Military_Press", materiel: "barre", cible: "epaules_ant",
    principaux: ["epaules_ant", "epaules_lat"], secondaires: ["triceps", "trapezes", "abdos"], niveau: 1, famille: "dev-vertical", pref: 3,
    consignes: ["Fesses et abdos serrés, pas de cambrure.", "Pousse la barre au-dessus de la tête, la tête passe sous la barre.", "Redescends au niveau du menton."] },
  { id: "dev-halteres-assis", requiert: ["banc"], nom: "Développé épaules haltères assis", image: "Seated_Dumbbell_Press", materiel: "halteres", cible: "epaules_ant",
    principaux: ["epaules_ant", "epaules_lat"], secondaires: ["triceps"], niveau: 1, famille: "dev-vertical", pref: 3,
    consignes: ["Dossier presque vertical, haltères à hauteur d'oreilles.", "Pousse vers le haut sans claquer les haltères.", "Descends jusqu'à hauteur d'oreilles."] },
  { id: "dev-halteres-debout", nom: "Développé épaules haltères debout", image: "Standing_Dumbbell_Press", materiel: "halteres", cible: "epaules_ant",
    principaux: ["epaules_ant", "epaules_lat"], secondaires: ["triceps", "abdos"], niveau: 1, famille: "dev-vertical", pref: 2,
    consignes: ["Debout, abdos et fessiers serrés, haltères à hauteur d'épaules.", "Pousse au-dessus de la tête sans cambrer.", "Redescends à hauteur d'oreilles."] },
  { id: "dev-arnold", nom: "Développé Arnold", image: "Arnold_Dumbbell_Press", materiel: "halteres", cible: "epaules_ant",
    principaux: ["epaules_ant", "epaules_lat"], secondaires: ["triceps"], niveau: 2, famille: "dev-vertical", pref: 2,
    consignes: ["Départ paumes vers toi, haltères devant le visage.", "Tourne les poignets en poussant vers le haut.", "Inverse le mouvement en redescendant."] },
  { id: "dev-epaules-machine", nom: "Développé épaules à la machine", image: "Machine_Shoulder_Military_Press", materiel: "machine", cible: "epaules_ant",
    principaux: ["epaules_ant", "epaules_lat"], secondaires: ["triceps"], niveau: 2, famille: "dev-vertical", pref: 2,
    consignes: ["Poignées à hauteur d'épaules au départ.", "Pousse sans décoller le dos du dossier.", "Redescends en contrôle."] },
  { id: "elevations-laterales", nom: "Élévations latérales haltères", image: "Side_Lateral_Raise", materiel: "halteres", cible: "epaules_lat",
    principaux: ["epaules_lat"], secondaires: ["trapezes"], niveau: 3, famille: "laterales", pref: 3, reps: [12, 20],
    consignes: ["Coudes légèrement fléchis, buste un peu penché en avant.", "Monte les bras sur les côtés jusqu'à l'horizontale.", "Mène avec les coudes, pas avec les mains. Charge légère, contrôle total."] },
  { id: "laterales-poulie", nom: "Élévations latérales à la poulie", image: "Cable_Seated_Lateral_Raise", materiel: "poulie", cible: "epaules_lat",
    principaux: ["epaules_lat"], secondaires: ["trapezes"], niveau: 3, famille: "laterales-poulie", pref: 2, reps: [12, 20],
    consignes: ["Poulie basse, câble passant devant ou derrière toi.", "Monte le bras sur le côté jusqu'à l'horizontale.", "Le câble garde la tension en bas : ne relâche pas."] },
  { id: "rowing-menton", nom: "Rowing menton", image: "Upright_Barbell_Row", materiel: "barre", cible: "epaules_lat",
    principaux: ["epaules_lat", "trapezes"], secondaires: ["biceps"], niveau: 2, famille: "rowing-menton", pref: 1,
    consignes: ["Prise un peu plus large que les épaules.", "Monte la barre le long du corps, coudes plus hauts que les mains.", "Arrête à hauteur de poitrine si tes épaules tirent."] },
  { id: "elevations-frontales", nom: "Élévations frontales", image: "Front_Dumbbell_Raise", materiel: "halteres", cible: "epaules_ant",
    principaux: ["epaules_ant"], secondaires: [], niveau: 3, famille: "frontales", pref: 1,
    consignes: ["Bras presque tendus devant les cuisses.", "Monte l'haltère devant toi jusqu'à hauteur des yeux.", "Pas d'élan avec le dos."] },
  { id: "oiseau", nom: "Oiseau (élévations buste penché)", image: "Reverse_Flyes", materiel: "halteres", cible: "epaules_post",
    principaux: ["epaules_post"], secondaires: ["haut_dos"], niveau: 3, famille: "arriere-epaule", pref: 3, reps: [12, 20],
    consignes: ["Buste penché presque à l'horizontale, dos plat.", "Ouvre les bras sur les côtés, coudes légèrement fléchis.", "Serre l'arrière des épaules en haut, charge légère."] },
  { id: "face-pull", nom: "Face pull à la corde", image: "Face_Pull", materiel: "poulie", cible: "epaules_post",
    principaux: ["epaules_post"], secondaires: ["haut_dos", "trapezes"], niveau: 3, famille: "face-pull", pref: 3, reps: [12, 20],
    consignes: ["Poulie à hauteur du visage, corde en main.", "Tire la corde vers le front en écartant les mains.", "Coudes hauts, termine en « double biceps »."] },
  { id: "reverse-pec-deck", nom: "Oiseau à la machine (reverse pec deck)", image: "Reverse_Machine_Flyes", materiel: "machine", cible: "epaules_post",
    principaux: ["epaules_post"], secondaires: ["haut_dos"], niveau: 3, famille: "arriere-epaule", pref: 2, reps: [12, 20],
    consignes: ["Poitrine contre le dossier, bras tendus devant.", "Ouvre les bras vers l'arrière.", "Contrôle le retour."] },

  // ---------------------------------------------------------------- Biceps
  { id: "curl-barre", nom: "Curl barre", image: "Barbell_Curl", materiel: "barre", cible: "biceps",
    principaux: ["biceps"], secondaires: ["avant_bras"], niveau: 3, famille: "curl-bilateral", pref: 3, reps: [8, 12],
    consignes: ["Coudes collés au corps et fixes.", "Monte la barre sans balancer le buste.", "Redescends lentement jusqu'à bras tendus."] },
  { id: "curl-halteres", nom: "Curl haltères", image: "Dumbbell_Bicep_Curl", materiel: "halteres", cible: "biceps",
    principaux: ["biceps"], secondaires: ["avant_bras"], niveau: 3, famille: "curl-halteres", pref: 3,
    consignes: ["Paumes vers l'avant, coudes près du corps.", "Monte en serrant le biceps en haut.", "Descente contrôlée sur 2 secondes."] },
  { id: "curl-marteau", nom: "Curl marteau", image: "Hammer_Curls", materiel: "halteres", cible: "biceps",
    principaux: ["biceps", "avant_bras"], secondaires: [], niveau: 3, famille: "curl-marteau", pref: 3,
    consignes: ["Prise neutre, pouces vers le haut.", "Monte l'haltère sans bouger le coude.", "Redescends lentement."] },
  { id: "curl-pupitre", requiert: ["machine"], nom: "Curl au pupitre", image: "Preacher_Curl", materiel: "barre", cible: "biceps",
    principaux: ["biceps"], secondaires: [], niveau: 3, famille: "curl-isole", pref: 2,
    consignes: ["Aisselles calées en haut du pupitre.", "Monte la barre en contractant les biceps.", "Ne tends pas brutalement les bras en bas."] },
  { id: "curl-incline", requiert: ["banc"], nom: "Curl incliné haltères", image: "Incline_Dumbbell_Curl", materiel: "halteres", cible: "biceps",
    principaux: ["biceps"], secondaires: [], niveau: 3, famille: "curl-isole", pref: 2,
    consignes: ["Banc incliné à ~60°, bras pendants derrière le buste.", "Monte sans avancer les coudes.", "Étirement complet en bas."] },
  { id: "curl-concentre", nom: "Curl concentré", image: "Concentration_Curls", materiel: "halteres", cible: "biceps",
    principaux: ["biceps"], secondaires: [], niveau: 3, famille: "curl-isole", pref: 1,
    consignes: ["Assis, coude calé contre l'intérieur de la cuisse.", "Monte l'haltère vers l'épaule.", "Serre 1 seconde en haut."] },

  // ---------------------------------------------------------------- Avant-bras
  { id: "curl-poignets", nom: "Flexion des poignets (paumes vers le haut)", image: "Seated_Dumbbell_Palms-Up_Wrist_Curl", materiel: "halteres", cible: "avant_bras",
    principaux: ["avant_bras"], secondaires: [], niveau: 3, famille: "poignets-flexion", pref: 3, reps: [12, 20],
    consignes: ["Assis, avant-bras posés sur les cuisses, poignets dans le vide, paumes vers le haut.", "Enroule les poignets pour monter les haltères.", "Descends lentement en laissant l'haltère rouler vers le bout des doigts."] },
  { id: "extension-poignets", nom: "Extension des poignets (paumes vers le bas)", image: "Seated_Dumbbell_Palms-Down_Wrist_Curl", materiel: "halteres", cible: "avant_bras",
    principaux: ["avant_bras"], secondaires: [], niveau: 3, famille: "poignets-extension", pref: 2, reps: [12, 20],
    consignes: ["Assis, avant-bras sur les cuisses, paumes vers le bas.", "Relève le dos des mains le plus haut possible.", "Charge légère, mouvement lent."] },
  { id: "marche-fermier", nom: "Marche du fermier", image: "Farmers_Walk", materiel: "halteres", cible: "avant_bras",
    principaux: ["avant_bras", "trapezes"], secondaires: ["abdos", "fessiers"], niveau: 3, famille: "porte", pref: 2, reps: [20, 45], unite: "sec",
    consignes: ["Un haltère lourd dans chaque main, bras tendus.", "Marche à petits pas, buste droit, épaules basses.", "Serre fort les poignées pendant toute la durée."] },

  // ---------------------------------------------------------------- Triceps
  { id: "dips-triceps", requiert: ["dips"], nom: "Dips (buste droit)", image: "Dips_-_Triceps_Version", materiel: "poids_corps", cible: "triceps",
    principaux: ["triceps"], secondaires: ["pectoraux", "epaules_ant"], niveau: 2, famille: "dips", pref: 3, reps: [6, 12],
    consignes: ["Buste bien droit, coudes vers l'arrière.", "Descends jusqu'à 90° aux coudes.", "Pousse jusqu'aux bras tendus. Lest au-delà de 12 reps."] },
  { id: "dc-serre", requiert: ["banc"], nom: "Développé couché prise serrée", image: "Close-Grip_Barbell_Bench_Press", materiel: "barre", cible: "triceps",
    principaux: ["triceps"], secondaires: ["pectoraux", "epaules_ant"], niveau: 2, famille: "dev-serre", pref: 2,
    consignes: ["Mains écartées de la largeur des épaules.", "Coudes le long du corps à la descente.", "Barre vers le bas des pectoraux."] },
  { id: "pompes-serrees", nom: "Pompes prise serrée", image: "Push-Ups_-_Close_Triceps_Position", materiel: "poids_corps", cible: "triceps",
    principaux: ["triceps"], secondaires: ["pectoraux", "epaules_ant"], niveau: 2, famille: "pompes-serrees", pref: 2, reps: [8, 20],
    consignes: ["Mains sous les épaules, presque collées.", "Coudes le long du corps pendant la descente.", "Corps gainé, remonte en poussant fort."] },
  { id: "kickback", nom: "Kickback triceps haltère", image: "Tricep_Dumbbell_Kickback", materiel: "halteres", cible: "triceps",
    principaux: ["triceps"], secondaires: [], niveau: 3, famille: "kickback", pref: 2, reps: [12, 15],
    consignes: ["Buste penché, bras collé au corps, coude à 90°.", "Tends le bras vers l'arrière en gardant le coude fixe.", "Serre le triceps 1 seconde, reviens lentement."] },
  { id: "extension-poulie", nom: "Extension triceps à la poulie", image: "Triceps_Pushdown", materiel: "poulie", cible: "triceps",
    principaux: ["triceps"], secondaires: [], niveau: 3, famille: "pushdown", pref: 3,
    consignes: ["Coudes collés au corps, ils ne bougent pas.", "Pousse la barre jusqu'aux bras tendus.", "Remonte jusqu'à 90°, pas plus."] },
  { id: "extension-corde", nom: "Extension triceps à la corde", image: "Triceps_Pushdown_-_Rope_Attachment", materiel: "poulie", cible: "triceps",
    principaux: ["triceps"], secondaires: [], niveau: 3, famille: "pushdown", pref: 3,
    consignes: ["Coudes fixes le long du corps.", "Pousse vers le bas et écarte la corde en fin de mouvement.", "Remonte lentement."] },
  { id: "barre-front", requiert: ["banc"], nom: "Barre au front (skull crusher)", image: "EZ-Bar_Skullcrusher", materiel: "barre", cible: "triceps",
    principaux: ["triceps"], secondaires: [], niveau: 3, famille: "extension-couche", pref: 2, reps: [8, 12],
    consignes: ["Allongé, barre EZ au-dessus du visage, bras verticaux.", "Plie seulement les coudes pour amener la barre vers le front.", "Remonte sans écarter les coudes."] },
  { id: "extension-nuque-poulie", nom: "Extension au-dessus de la tête (corde)", image: "Cable_Rope_Overhead_Triceps_Extension", materiel: "poulie", cible: "triceps",
    principaux: ["triceps"], secondaires: [], niveau: 3, famille: "extension-nuque", pref: 2,
    consignes: ["Dos à la poulie, corde derrière la tête.", "Tends les bras vers l'avant et le haut.", "Coudes fixes, près de la tête."] },
  { id: "extension-nuque-haltere", nom: "Extension haltère au-dessus de la tête", image: "Standing_Dumbbell_Triceps_Extension", materiel: "halteres", cible: "triceps",
    principaux: ["triceps"], secondaires: [], niveau: 3, famille: "extension-nuque", pref: 2,
    consignes: ["Haltère tenu à deux mains au-dessus de la tête.", "Descends derrière la nuque en pliant les coudes.", "Remonte bras tendus, coudes serrés."] },

  // ---------------------------------------------------------------- Jambes
  { id: "squat", nom: "Squat à la barre", image: "Barbell_Squat", materiel: "barre", cible: "quadriceps",
    principaux: ["quadriceps", "fessiers"], secondaires: ["ischios", "lombaires", "abdos"], niveau: 1, famille: "squat", pref: 3,
    consignes: ["Barre sur les trapèzes, pieds largeur d'épaules, pointes légèrement ouvertes.", "Descends en poussant les fesses en arrière, genoux dans l'axe des pieds.", "Cuisses au moins parallèles au sol, dos gainé, remonte en poussant le sol."] },
  { id: "squat-halteres", nom: "Squat aux haltères", image: "Dumbbell_Squat", materiel: "halteres", cible: "quadriceps",
    principaux: ["quadriceps", "fessiers"], secondaires: ["ischios", "lombaires"], niveau: 1, famille: "squat", pref: 2, reps: [8, 15],
    consignes: ["Un haltère dans chaque main, bras le long du corps.", "Descends en poussant les fesses en arrière, dos droit.", "Cuisses parallèles au sol, remonte en poussant sur les talons."] },
  { id: "squat-avant", nom: "Squat avant (front squat)", image: "Front_Barbell_Squat", materiel: "barre", cible: "quadriceps",
    principaux: ["quadriceps"], secondaires: ["fessiers", "abdos"], niveau: 1, famille: "squat", pref: 1,
    consignes: ["Barre posée à l'avant des épaules, coudes hauts.", "Buste bien droit pendant la descente.", "Remonte en gardant les coudes hauts."] },
  { id: "presse", nom: "Presse à cuisses", image: "Leg_Press", materiel: "machine", cible: "quadriceps",
    principaux: ["quadriceps", "fessiers"], secondaires: ["ischios"], niveau: 2, famille: "presse", pref: 3,
    consignes: ["Pieds au milieu du plateau, largeur d'épaules.", "Descends jusqu'à 90° sans décoller le bas du dos.", "Pousse sans verrouiller les genoux."] },
  { id: "hack-squat", nom: "Hack squat", image: "Hack_Squat", materiel: "machine", cible: "quadriceps",
    principaux: ["quadriceps"], secondaires: ["fessiers"], niveau: 2, famille: "presse", pref: 2,
    consignes: ["Dos plaqué contre le dossier.", "Descends profond en gardant les talons au sol.", "Remonte en poussant sur tout le pied."] },
  { id: "fentes", nom: "Fentes aux haltères", image: "Dumbbell_Lunges", materiel: "halteres", cible: "quadriceps",
    principaux: ["quadriceps", "fessiers"], secondaires: ["ischios"], niveau: 2, famille: "fentes", pref: 2, reps: [8, 12],
    consignes: ["Grand pas en avant, buste droit.", "Descends jusqu'à ce que le genou arrière frôle le sol.", "Repousse avec la jambe avant. Reps par jambe."] },
  { id: "squat-bulgare", nom: "Squat bulgare", image: "Split_Squat_with_Dumbbells", materiel: "halteres", cible: "quadriceps",
    principaux: ["quadriceps", "fessiers"], secondaires: ["ischios"], niveau: 2, famille: "fentes", pref: 3, reps: [8, 12],
    consignes: ["Pied arrière posé sur un banc.", "Descends à la verticale, genou avant dans l'axe du pied.", "Remonte en poussant sur le talon avant. Reps par jambe."] },
  { id: "goblet-squat", nom: "Goblet squat", image: "Goblet_Squat", materiel: "halteres", cible: "quadriceps",
    principaux: ["quadriceps"], secondaires: ["fessiers", "abdos"], niveau: 2, famille: "squat-goblet", pref: 1, reps: [10, 15],
    consignes: ["Un haltère (ou un kettlebell) tenu contre la poitrine.", "Descends profond, coudes entre les genoux.", "Buste droit, remonte en poussant le sol."] },
  { id: "leg-extension", nom: "Leg extension", image: "Leg_Extensions", materiel: "machine", cible: "quadriceps",
    principaux: ["quadriceps"], secondaires: [], niveau: 3, famille: "leg-extension", pref: 3,
    consignes: ["Genoux alignés avec l'axe de la machine.", "Tends les jambes et serre les quadriceps 1 seconde.", "Redescends lentement."] },
  { id: "sdt-roumain", nom: "Soulevé de terre roumain", image: "Romanian_Deadlift", materiel: "barre", cible: "ischios",
    principaux: ["ischios", "fessiers"], secondaires: ["lombaires"], niveau: 1, famille: "souleve", pref: 3, reps: [6, 10],
    consignes: ["Genoux légèrement fléchis et fixes.", "Pousse les hanches en arrière en glissant la barre le long des cuisses.", "Descends jusqu'à l'étirement des ischios, dos toujours plat."] },
  { id: "sdt-jambes-tendues-halteres", nom: "Soulevé de terre jambes tendues haltères", image: "Stiff-Legged_Dumbbell_Deadlift", materiel: "halteres", cible: "ischios",
    principaux: ["ischios", "fessiers"], secondaires: ["lombaires"], niveau: 2, famille: "souleve", pref: 2,
    consignes: ["Haltères devant les cuisses, genoux légèrement fléchis.", "Bascule le buste en poussant les hanches en arrière.", "Remonte en serrant les fessiers."] },
  { id: "leg-curl-allonge", nom: "Leg curl allongé", image: "Lying_Leg_Curls", materiel: "machine", cible: "ischios",
    principaux: ["ischios"], secondaires: ["mollets"], niveau: 3, famille: "leg-curl", pref: 3,
    consignes: ["Hanches plaquées contre le banc.", "Ramène les talons vers les fesses.", "Redescends lentement, sans laisser tomber la charge."] },
  { id: "leg-curl-assis", nom: "Leg curl assis", image: "Seated_Leg_Curl", materiel: "machine", cible: "ischios",
    principaux: ["ischios"], secondaires: [], niveau: 3, famille: "leg-curl", pref: 3,
    consignes: ["Cuisses bloquées par le boudin.", "Plie les genoux au maximum.", "Contrôle le retour."] },
  { id: "good-morning", nom: "Good morning", image: "Good_Morning", materiel: "barre", cible: "ischios",
    principaux: ["ischios", "lombaires"], secondaires: ["fessiers"], niveau: 2, famille: "good-morning", pref: 1,
    consignes: ["Barre sur les trapèzes, genoux légèrement fléchis.", "Bascule le buste vers l'avant, dos plat.", "Charge légère, mouvement lent."] },
  { id: "hip-thrust", requiert: ["banc"], nom: "Hip thrust", image: "Barbell_Hip_Thrust", materiel: "barre", cible: "fessiers",
    principaux: ["fessiers"], secondaires: ["ischios"], niveau: 2, famille: "hip-thrust", pref: 3, reps: [8, 12],
    consignes: ["Haut du dos appuyé sur un banc, barre sur les hanches (avec mousse).", "Pousse les hanches vers le haut jusqu'à l'alignement épaules-genoux.", "Serre fort les fessiers en haut, menton rentré."] },
  { id: "pont-fessier", nom: "Pont fessier à la barre", image: "Barbell_Glute_Bridge", materiel: "barre", cible: "fessiers",
    principaux: ["fessiers"], secondaires: ["ischios"], niveau: 2, famille: "hip-thrust", pref: 1,
    consignes: ["Allongé au sol, barre sur les hanches.", "Monte les hanches en serrant les fessiers.", "Tiens 1 seconde en haut."] },
  { id: "pont-unijambe", nom: "Pont fessier sur une jambe", image: "Single_Leg_Glute_Bridge", materiel: "poids_corps", cible: "fessiers",
    principaux: ["fessiers"], secondaires: ["ischios"], niveau: 3, famille: "fessier-isole", pref: 2, reps: [10, 20],
    consignes: ["Allongé, un pied au sol, l'autre jambe tendue en l'air.", "Monte les hanches en poussant sur le talon.", "Tiens 1 seconde en haut. Reps par jambe."] },
  { id: "kickback-poulie", nom: "Extension de hanche à la poulie", image: "Pull_Through", materiel: "poulie", cible: "fessiers",
    principaux: ["fessiers"], secondaires: ["ischios"], niveau: 3, famille: "fessier-isole", pref: 2, reps: [12, 15],
    consignes: ["Dos à la poulie basse, corde entre les jambes.", "Bascule les hanches en arrière puis redresse-toi.", "Serre les fessiers en fin de mouvement."] },
  { id: "abducteurs", nom: "Machine abducteurs", image: "Thigh_Abductor", materiel: "machine", cible: "fessiers",
    principaux: ["fessiers"], secondaires: [], niveau: 3, famille: "abducteurs", pref: 1, reps: [12, 20],
    consignes: ["Dos contre le dossier.", "Écarte les jambes en contrôlant.", "Reviens lentement."] },
  { id: "adducteurs", nom: "Machine adducteurs", image: "Thigh_Adductor", materiel: "machine", cible: "adducteurs",
    principaux: ["adducteurs"], secondaires: [], niveau: 3, famille: "adducteurs", pref: 2, reps: [12, 20],
    consignes: ["Dos contre le dossier, jambes écartées.", "Ramène les jambes l'une vers l'autre.", "Retour lent."] },
  { id: "mollets-debout", nom: "Mollets debout", image: "Standing_Calf_Raises", materiel: "machine", cible: "mollets",
    principaux: ["mollets"], secondaires: [], niveau: 3, famille: "mollets", pref: 3, reps: [10, 20],
    consignes: ["Avant des pieds sur la marche, talons dans le vide.", "Monte le plus haut possible sur la pointe des pieds.", "Descends lentement jusqu'à l'étirement complet."] },
  { id: "mollets-assis", nom: "Mollets assis", image: "Seated_Calf_Raise", materiel: "machine", cible: "mollets",
    principaux: ["mollets"], secondaires: [], niveau: 3, famille: "mollets", pref: 2, reps: [12, 20],
    consignes: ["Genoux sous l'appui, avant des pieds sur la marche.", "Monte sur la pointe des pieds.", "Pause en bas pour bien étirer."] },
  { id: "mollets-halteres", nom: "Mollets debout aux haltères", image: "Standing_Dumbbell_Calf_Raise", materiel: "halteres", cible: "mollets",
    principaux: ["mollets"], secondaires: [], niveau: 3, famille: "mollets", pref: 1, reps: [12, 20],
    consignes: ["Un haltère dans chaque main, avant des pieds sur une marche.", "Monte le plus haut possible sur la pointe des pieds.", "Descends lentement jusqu'à l'étirement."] },

  // ---------------------------------------------------------------- Abdos
  { id: "releve-jambes", requiert: ["traction"], nom: "Relevé de jambes suspendu", image: "Hanging_Leg_Raise", materiel: "poids_corps", cible: "abdos",
    principaux: ["abdos"], secondaires: [], niveau: 3, famille: "releve-jambes", pref: 3, reps: [8, 15],
    consignes: ["Suspendu à la barre, sans balancer.", "Monte les genoux (ou jambes tendues) vers la poitrine.", "Enroule le bassin en haut, descends lentement."] },
  { id: "crunch-poulie", nom: "Crunch à la poulie", image: "Cable_Crunch", materiel: "poulie", cible: "abdos",
    principaux: ["abdos"], secondaires: [], niveau: 3, famille: "crunch", pref: 3, reps: [10, 15],
    consignes: ["À genoux face à la poulie haute, corde près de la tête.", "Enroule le buste vers le bas en contractant les abdos.", "Les hanches ne bougent pas."] },
  { id: "crunch", nom: "Crunch", image: "Crunches", materiel: "poids_corps", cible: "abdos",
    principaux: ["abdos"], secondaires: [], niveau: 3, famille: "crunch", pref: 1, reps: [15, 25],
    consignes: ["Allongé, genoux pliés.", "Décolle les épaules du sol en enroulant le buste.", "Ne tire pas sur la nuque."] },
  { id: "gainage", nom: "Gainage (planche)", image: "Plank", materiel: "poids_corps", cible: "abdos",
    principaux: ["abdos"], secondaires: ["lombaires"], niveau: 3, famille: "gainage", pref: 2, reps: [30, 90], unite: "sec",
    consignes: ["En appui sur les avant-bras et les pointes de pieds.", "Corps aligné, fessiers et abdos serrés.", "Respire normalement, ne creuse pas le dos."] },
  { id: "roue-abdos", requiert: ["roue"], nom: "Roue abdominale", image: "Ab_Roller", materiel: "poids_corps", cible: "abdos",
    principaux: ["abdos"], secondaires: ["dorsaux", "epaules_ant"], niveau: 3, famille: "roue", pref: 2, reps: [6, 15],
    consignes: ["À genoux, roue sous les épaules.", "Avance en gardant le dos rond et les abdos serrés.", "Reviens avant de sentir le bas du dos creuser."] },
];

export const EXERCICES: Exercice[] = D.map((d) => ({
  ...d,
  reps: d.reps ?? (d.unite === "sec" ? [30, 60] : REPS[d.niveau]),
  series: d.series ?? SERIES[d.niveau],
  increment: d.increment ?? INCREMENT[d.materiel],
}));

export const EXERCICES_PAR_ID: Record<string, Exercice> = Object.fromEntries(EXERCICES.map((e) => [e.id, e]));

export const exercice = (id: string): Exercice | undefined => EXERCICES_PAR_ID[id];

export const imageExo = (e: Exercice, n: 0 | 1 = 0) => `/exos/${e.image}/${n}.jpg`;

export const NOM_MATERIEL: Record<Materiel, string> = {
  barre: "Barre", halteres: "Haltères", machine: "Machine", poulie: "Poulie", poids_corps: "Poids du corps",
};

// ------------------------------------------------------------ équipement disponible (réglage du compte)

/** Ce que l'utilisateur coche dans « Mon matériel ». */
export type Equipement = "barre" | "halteres" | "banc" | "traction" | "dips" | "machine" | "poulie" | "roue";

export const EQUIPEMENTS: Record<Equipement, string> = {
  halteres: "Haltères",
  barre: "Barre + disques (avec support / rack)",
  banc: "Banc de musculation",
  traction: "Barre de traction",
  dips: "Barres à dips",
  roue: "Roue abdominale",
  machine: "Machines guidées (presse, leg curl…)",
  poulie: "Poulie / vis-à-vis",
};
export const LISTE_EQUIPEMENTS = Object.keys(EQUIPEMENTS) as Equipement[];

/** Raccourcis proposés dans les réglages. */
export const PRESETS: { nom: string; equipement: Equipement[] }[] = [
  { nom: "Salle complète", equipement: LISTE_EQUIPEMENTS },
  { nom: "Maison : haltères seulement", equipement: ["halteres"] },
  { nom: "Maison : haltères + banc", equipement: ["halteres", "banc"] },
  { nom: "Maison : haltères, barre, banc, traction", equipement: ["halteres", "barre", "banc", "traction"] },
];

/** Tout ce dont l'exercice a besoin. Les exercices au poids du corps sans accessoire n'ont besoin de rien. */
export function besoins(e: Exercice): Equipement[] {
  const base: Equipement[] = e.materiel === "poids_corps" ? [] : [e.materiel];
  return [...base, ...(e.requiert ?? [])];
}

export const disponible = (e: Exercice, equipement: Equipement[]) => besoins(e).every((b) => equipement.includes(b));

/** Lit le réglage enregistré (liste séparée par des virgules ; anciens profils acceptés). */
export function lireEquipement(valeur: string | null | undefined): Equipement[] {
  if (!valeur || valeur === "salle") return LISTE_EQUIPEMENTS;
  if (valeur === "maison") return ["halteres", "barre", "banc", "traction"];
  if (valeur === "halteres") return ["halteres"];
  const l = valeur.split(",").filter((x): x is Equipement => x in EQUIPEMENTS);
  return l;
}
