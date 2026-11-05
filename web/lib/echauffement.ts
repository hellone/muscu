// Échauffement articulaire (5 minutes) adapté aux muscles de la séance. Partagé client + serveur.
import { EXERCICES_PAR_ID } from "./exercices";
import type { Muscle } from "./muscles";

export interface Mouvement { nom: string; duree: string }

const GENERAL: Mouvement[] = [{ nom: "Jumping jacks ou montées de genoux", duree: "1 min" }];
const HAUT: Mouvement[] = [
  { nom: "Rotations des épaules (avant puis arrière)", duree: "30 s" },
  { nom: "Cercles de bras, de petits à grands", duree: "30 s" },
  { nom: "Ouvertures de poitrine (bras tendus, on écarte)", duree: "15 reps" },
  { nom: "Rotations des poignets", duree: "20 s" },
];
const DOS: Mouvement[] = [
  { nom: "Chat-vache à quatre pattes", duree: "10 reps" },
  { nom: "Rotations du buste debout", duree: "30 s" },
];
const BAS: Mouvement[] = [
  { nom: "Rotations des hanches", duree: "30 s" },
  { nom: "Balanciers de jambe avant/arrière", duree: "10 par jambe" },
  { nom: "Squats au poids du corps lents", duree: "10 reps" },
  { nom: "Rotations des chevilles", duree: "20 s" },
];

const ZONE: Record<Muscle, "haut" | "dos" | "bas" | "tronc"> = {
  pectoraux: "haut", epaules_ant: "haut", epaules_lat: "haut", epaules_post: "haut", biceps: "haut", triceps: "haut", avant_bras: "haut",
  dorsaux: "dos", haut_dos: "dos", trapezes: "dos", lombaires: "dos",
  quadriceps: "bas", ischios: "bas", fessiers: "bas", adducteurs: "bas", mollets: "bas", abdos: "tronc",
};

export function echauffementPour(exerciceIds: string[]): Mouvement[] {
  const zones = new Set(exerciceIds.map((id) => EXERCICES_PAR_ID[id]).filter(Boolean).flatMap((e) => [...e.principaux, ...e.secondaires]).map((m) => ZONE[m]));
  return [
    ...GENERAL,
    ...(zones.has("haut") ? HAUT : []),
    ...(zones.has("dos") || zones.has("haut") ? DOS : []),
    ...(zones.has("bas") ? BAS : []),
    ...(zones.has("tronc") && !zones.has("bas") ? [{ nom: "Gainage léger", duree: "20 s" }] : []),
  ];
}
