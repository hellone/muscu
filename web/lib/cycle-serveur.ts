import "server-only";
import { semaineCycle, type OptionsCoach } from "./coach";
import type { Utilisateur } from "./auth";

/** Options du coach pour cet utilisateur, à une date donnée (séance saisie après coup : la semaine de cycle de ce jour-là). */
export function optionsCoach(u: Utilisateur, date = Date.now()): OptionsCoach {
  const r = u.reglages;
  return {
    equipement: u.equipement,
    priorites: r.priorites,
    supersets: r.supersets,
    echauffement: r.echauffement,
    cycle: r.cycle ? semaineCycle(r.cycle.debut, r.cycle.semaines, date) : null,
  };
}
