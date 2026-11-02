// Comptes utilisateurs et sessions (un cookie par appareil, 1 an).
import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { lireEquipement, type Equipement } from "./exercices";

export const COOKIE_SESSION = "mu_session";
const DUREE_SESSION_JOURS = 365;

export interface Utilisateur { id: number; identifiant: string; nom: string; equipement: Equipement[] }

export class ErreurMetier extends Error {}

// ------------------------------------------------------------ mots de passe

export function hacherMdp(mdp: string): string {
  const sel = randomBytes(16);
  const h = scryptSync(mdp, sel, 32);
  return `scrypt$${sel.toString("base64")}$${h.toString("base64")}`;
}

export function verifierMdp(mdp: string, stocke: string): boolean {
  const [algo, sel, h] = stocke.split("$");
  if (algo !== "scrypt" || !sel || !h) return false;
  const attendu = Buffer.from(h, "base64");
  const calcule = scryptSync(mdp, Buffer.from(sel, "base64"), attendu.length);
  return timingSafeEqual(attendu, calcule);
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

// ------------------------------------------------------------ limitation des essais

const essais = new Map<string, { n: number; jusqua: number }>();
export function tropDEssais(cle: string): boolean {
  const e = essais.get(cle);
  return !!e && e.n >= 8 && e.jusqua > Date.now();
}
export function noterEchec(cle: string) {
  const e = essais.get(cle);
  if (!e || e.jusqua < Date.now()) essais.set(cle, { n: 1, jusqua: Date.now() + 15 * 60_000 });
  else e.n++;
}
export function effacerEchecs(cle: string) { essais.delete(cle); }

// ------------------------------------------------------------ comptes

const ligneVersUtilisateur = (r: Record<string, any>): Utilisateur => ({ id: r.id, identifiant: r.identifiant, nom: r.nom, equipement: lireEquipement(r.materiel) });

/** Code d'invitation demandé à l'inscription (variable CODE_INVITATION). Vide = inscription libre. */
export const codeInvitationRequis = () => !!process.env.CODE_INVITATION?.trim();

export function creerCompte(identifiant: string, nom: string, mdp: string, code?: string): Utilisateur {
  const attendu = process.env.CODE_INVITATION?.trim();
  if (attendu && (code ?? "").trim() !== attendu) throw new ErreurMetier("Code d'invitation incorrect.");
  const ident = identifiant.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(ident)) throw new ErreurMetier("Identifiant : 3 à 30 caractères (lettres, chiffres, . _ -).");
  const n = nom.trim().slice(0, 40);
  if (!n) throw new ErreurMetier("Indique ton prénom.");
  if (mdp.length < 8) throw new ErreurMetier("Mot de passe : 8 caractères minimum.");
  if (db().prepare("SELECT 1 FROM utilisateurs WHERE identifiant = ?").get(ident)) throw new ErreurMetier("Cet identifiant est déjà pris.");
  const r = db().prepare("INSERT INTO utilisateurs (identifiant, nom, mdp_hash) VALUES (?,?,?)").run(ident, n, hacherMdp(mdp));
  return { id: Number(r.lastInsertRowid), identifiant: ident, nom: n, equipement: lireEquipement("salle") };
}

export function ouvrirSession(utilisateurId: number, appareil?: string): string {
  const token = randomBytes(32).toString("base64url");
  db().prepare(
    `INSERT INTO sessions (token_hash, utilisateur_id, expire_le, appareil) VALUES (?, ?, datetime('now', '+${DUREE_SESSION_JOURS} days'), ?)`,
  ).run(hashToken(token), utilisateurId, (appareil ?? "").slice(0, 200));
  return token;
}

export function connecter(identifiant: string, mdp: string): Utilisateur | null {
  const row = db().prepare("SELECT * FROM utilisateurs WHERE identifiant = ?").get(identifiant.trim()) as Record<string, any> | undefined;
  if (!row || !verifierMdp(mdp, row.mdp_hash)) return null;
  return ligneVersUtilisateur(row);
}

export function utilisateurDepuisToken(token: string | undefined): Utilisateur | null {
  if (!token) return null;
  const row = db().prepare(
    `SELECT u.* FROM sessions s JOIN utilisateurs u ON u.id = s.utilisateur_id WHERE s.token_hash = ? AND s.expire_le > datetime('now')`,
  ).get(hashToken(token)) as Record<string, any> | undefined;
  return row ? ligneVersUtilisateur(row) : null;
}

export async function utilisateurConnecte(): Promise<Utilisateur | null> {
  return utilisateurDepuisToken((await cookies()).get(COOKIE_SESSION)?.value);
}

export function fermerSession(token: string | undefined) {
  if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function changerMdp(id: number, ancien: string, nouveau: string) {
  const row = db().prepare("SELECT mdp_hash FROM utilisateurs WHERE id = ?").get(id) as { mdp_hash: string } | undefined;
  if (!row || !verifierMdp(ancien, row.mdp_hash)) throw new ErreurMetier("Mot de passe actuel incorrect.");
  if (nouveau.length < 8) throw new ErreurMetier("Nouveau mot de passe : 8 caractères minimum.");
  db().prepare("UPDATE utilisateurs SET mdp_hash = ? WHERE id = ?").run(hacherMdp(nouveau), id);
}

export const optionsCookie = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && process.env.MUSCU_INSECURE_COOKIES !== "1",
  path: "/",
  maxAge: DUREE_SESSION_JOURS * 86400,
});

// ------------------------------------------------------------ protection des requêtes

/** Refuse les requêtes de modification venant d'un autre site (CSRF). */
export async function origineValide(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

export function ipDe(h: Headers): string {
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
}
