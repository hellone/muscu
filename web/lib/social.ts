// Communauté : abonnements, fil, j'aime, commentaires, classement.
// Règle de visibilité : je vois mes séances, et celles des personnes que je suis qui partagent leurs séances.
import "server-only";
import { db } from "./db";
import { ErreurMetier } from "./auth";
import { debutSemaine, estTravail, meilleurRecord, valeurSerie, type SeanceHisto } from "./coach";
import { EXERCICES_PAR_ID } from "./exercices";
import { CIBLES, type CibleId } from "./muscles";
import { lireReglages } from "./reglages";
import { historique } from "./seances";

interface Personne { id: number; identifiant: string; nom: string; partage: boolean }

function personne(id: number): Personne | null {
  const r = db().prepare("SELECT id, identifiant, nom, reglages FROM utilisateurs WHERE id = ?").get(id) as any;
  return r ? { id: r.id, identifiant: r.identifiant, nom: r.nom, partage: lireReglages(r.reglages).partage } : null;
}

const suivis = (moi: number) => (db().prepare("SELECT suivi_id FROM abonnements WHERE suiveur_id = ?").all(moi) as { suivi_id: number }[]).map((r) => r.suivi_id);

/** Personnes dont je peux voir les séances (moi compris). */
function visibles(moi: number): Personne[] {
  const l = [personne(moi)!, ...suivis(moi).map(personne).filter((p): p is Personne => !!p && p.partage)];
  return l;
}

export function peutVoir(moi: number, proprietaire: number): boolean {
  if (moi === proprietaire) return true;
  const p = personne(proprietaire);
  return !!p && p.partage && suivis(moi).includes(proprietaire);
}

// ------------------------------------------------------------ abonnements

export function rechercher(moi: number, q: string) {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const mesSuivis = new Set(suivis(moi));
  return (db().prepare("SELECT id, identifiant, nom FROM utilisateurs WHERE id != ? AND (identifiant LIKE ? OR lower(nom) LIKE ?) ORDER BY identifiant LIMIT 20")
    .all(moi, `${t}%`, `${t}%`) as any[]).map((r) => ({ identifiant: r.identifiant, nom: r.nom, suivi: mesSuivis.has(r.id) }));
}

export function suivre(moi: number, identifiant: string, oui: boolean) {
  const r = db().prepare("SELECT id FROM utilisateurs WHERE identifiant = ?").get(identifiant.trim()) as { id: number } | undefined;
  if (!r) throw new ErreurMetier("Utilisateur introuvable.");
  if (r.id === moi) throw new ErreurMetier("Tu ne peux pas te suivre toi-même.");
  if (oui) db().prepare("INSERT OR IGNORE INTO abonnements (suiveur_id, suivi_id) VALUES (?,?)").run(moi, r.id);
  else db().prepare("DELETE FROM abonnements WHERE suiveur_id = ? AND suivi_id = ?").run(moi, r.id);
}

export function amis(moi: number) {
  const jeSuis = db().prepare("SELECT u.identifiant, u.nom FROM abonnements a JOIN utilisateurs u ON u.id = a.suivi_id WHERE a.suiveur_id = ? ORDER BY u.nom").all(moi) as any[];
  const meSuivent = db().prepare(
    `SELECT u.identifiant, u.nom, EXISTS(SELECT 1 FROM abonnements b WHERE b.suiveur_id = ? AND b.suivi_id = u.id) AS suivi
     FROM abonnements a JOIN utilisateurs u ON u.id = a.suiveur_id WHERE a.suivi_id = ? ORDER BY u.nom`,
  ).all(moi, moi) as any[];
  return { jeSuis, meSuivent: meSuivent.map((r) => ({ ...r, suivi: !!r.suivi })) };
}

// ------------------------------------------------------------ fil

export interface CarteFil {
  id: string; auteur: { identifiant: string; nom: string; moi: boolean }; debut: string; fin: string | null;
  cible: string; nomCible: string; nbExos: number; nbSeries: number; tonnage: number; records: number;
  apercu: { nom: string; serie: string }[]; likes: number; jaime: boolean; commentaires: number;
}

function carte(moi: number, auteur: Personne, s: SeanceHisto, fin: string | null, histoAuteur: SeanceHisto[]): CarteFil {
  const travail = s.exercices.map((e) => ({ e, series: e.series.filter((x) => x.reps > 0 && estTravail(x)) })).filter((x) => x.series.length);
  const series = travail.flatMap((x) => x.series);
  // records : meilleure série de l'exercice ce jour-là supérieure à tout ce qui précédait
  const avant = histoAuteur.filter((h) => h.debut < s.debut);
  const records = travail.filter(({ e, series }) => {
    const rec = meilleurRecord(avant, e.exerciceId);
    return rec && Math.max(...series.map(valeurSerie)) > rec.unRM + 1e-9;
  }).length;
  const likes = (db().prepare("SELECT COUNT(*) n, SUM(utilisateur_id = ?) moi FROM likes WHERE seance_id = ?").get(moi, s.id) as any);
  const nbCom = (db().prepare("SELECT COUNT(*) n FROM commentaires WHERE seance_id = ?").get(s.id) as any).n;
  return {
    id: s.id, auteur: { identifiant: auteur.identifiant, nom: auteur.nom, moi: auteur.id === moi }, debut: s.debut, fin,
    cible: s.cible, nomCible: CIBLES[s.cible as CibleId]?.nom ?? "Séance libre",
    nbExos: travail.length, nbSeries: series.length, tonnage: Math.round(series.reduce((t, x) => t + (x.poids ?? 0) * x.reps, 0)), records,
    apercu: travail.slice(0, 3).map(({ e, series }) => {
      const m = series.reduce((a, b) => (valeurSerie(b) > valeurSerie(a) ? b : a));
      return { nom: EXERCICES_PAR_ID[e.exerciceId]?.nom ?? e.exerciceId, serie: m.poids ? `${String(m.poids).replace(".", ",")} kg × ${m.reps}` : `${m.reps} reps` };
    }),
    likes: likes.n ?? 0, jaime: !!likes.moi, commentaires: nbCom,
  };
}

export function fil(moi: number, limite = 30): CarteFil[] {
  const cartes: CarteFil[] = [];
  for (const p of visibles(moi)) {
    const h = historique(p.id);
    const fins = new Map((db().prepare("SELECT id, fin FROM seances WHERE utilisateur_id = ?").all(p.id) as any[]).map((r) => [r.id, r.fin]));
    for (const s of h.slice(0, limite)) cartes.push(carte(moi, p, s, fins.get(s.id) ?? null, h));
  }
  return cartes.sort((a, b) => b.debut.localeCompare(a.debut)).slice(0, limite);
}

function proprietaire(seanceId: string): number {
  const r = db().prepare("SELECT utilisateur_id FROM seances WHERE id = ?").get(seanceId) as { utilisateur_id: number } | undefined;
  if (!r) throw new ErreurMetier("Séance introuvable.");
  return r.utilisateur_id;
}

export function detail(moi: number, seanceId: string) {
  const prop = proprietaire(seanceId);
  if (!peutVoir(moi, prop)) throw new ErreurMetier("Séance non visible.");
  const p = personne(prop)!;
  const h = historique(prop);
  const s = h.find((x) => x.id === seanceId)!;
  const fin = (db().prepare("SELECT fin FROM seances WHERE id = ?").get(seanceId) as any)?.fin ?? null;
  const commentaires = (db().prepare(
    `SELECT c.id, c.texte, c.cree_le, u.identifiant, u.nom, c.utilisateur_id = ? AS moi FROM commentaires c JOIN utilisateurs u ON u.id = c.utilisateur_id
     WHERE c.seance_id = ? ORDER BY c.id`,
  ).all(moi, seanceId) as any[]).map((c) => ({ ...c, moi: !!c.moi, cree_le: c.cree_le.replace(" ", "T") + "Z" }));
  const qui = (db().prepare("SELECT u.nom FROM likes l JOIN utilisateurs u ON u.id = l.utilisateur_id WHERE l.seance_id = ?").all(seanceId) as any[]).map((r) => r.nom);
  return { carte: carte(moi, p, s, fin, h), seance: s, commentaires, likesDe: qui };
}

export function aimer(moi: number, seanceId: string, oui: boolean) {
  if (!peutVoir(moi, proprietaire(seanceId))) throw new ErreurMetier("Séance non visible.");
  if (oui) db().prepare("INSERT OR IGNORE INTO likes (seance_id, utilisateur_id) VALUES (?,?)").run(seanceId, moi);
  else db().prepare("DELETE FROM likes WHERE seance_id = ? AND utilisateur_id = ?").run(seanceId, moi);
}

export function commenter(moi: number, seanceId: string, texte: string) {
  if (!peutVoir(moi, proprietaire(seanceId))) throw new ErreurMetier("Séance non visible.");
  const t = texte.trim().slice(0, 500);
  if (!t) throw new ErreurMetier("Commentaire vide.");
  db().prepare("INSERT INTO commentaires (seance_id, utilisateur_id, texte) VALUES (?,?,?)").run(seanceId, moi, t);
}

export function supprimerCommentaire(moi: number, id: number) {
  // l'auteur du commentaire ou le propriétaire de la séance
  db().prepare(
    `DELETE FROM commentaires WHERE id = ? AND (utilisateur_id = ? OR seance_id IN (SELECT id FROM seances WHERE utilisateur_id = ?))`,
  ).run(id, moi, moi);
}

// ------------------------------------------------------------ classement de la semaine

export function classement(moi: number) {
  const t = debutSemaine();
  return visibles(moi).map((p) => {
    const semaine = historique(p.id).filter((s) => Date.parse(s.debut) >= t);
    const series = semaine.flatMap((s) => s.exercices.flatMap((e) => e.series.filter((x) => x.reps > 0 && estTravail(x))));
    return {
      identifiant: p.identifiant, nom: p.nom, moi: p.id === moi,
      seances: semaine.length, series: series.length, tonnage: Math.round(series.reduce((u, x) => u + (x.poids ?? 0) * x.reps, 0)),
    };
  }).sort((a, b) => b.tonnage - a.tonnage || b.series - a.series);
}
