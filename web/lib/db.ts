// Base de données (SQLite intégré à Node, un seul fichier) : $MUSCU_DATA/muscu.db (par défaut ./data).
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifiant TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nom TEXT NOT NULL,
  mdp_hash TEXT NOT NULL,
  materiel TEXT NOT NULL DEFAULT 'salle',
  cree_le TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  expire_le TEXT NOT NULL,
  appareil TEXT
);
CREATE INDEX IF NOT EXISTS sessions_utilisateur ON sessions(utilisateur_id);
-- Une séance d'entraînement. L'id est créé sur le téléphone (enregistrement possible hors-ligne, sans doublon).
CREATE TABLE IF NOT EXISTS seances (
  id TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  cible TEXT NOT NULL,
  debut TEXT NOT NULL,
  fin TEXT,
  maj_le TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS seances_utilisateur ON seances(utilisateur_id, debut);
-- Exercices d'une séance, dans l'ordre ; series = JSON [{poids, reps}]
CREATE TABLE IF NOT EXISTS seance_exos (
  seance_id TEXT NOT NULL REFERENCES seances(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL,
  exercice_id TEXT NOT NULL,
  series TEXT NOT NULL,
  PRIMARY KEY (seance_id, ordre)
);
CREATE INDEX IF NOT EXISTS seance_exos_exercice ON seance_exos(exercice_id);
`;

const g = globalThis as unknown as { __muscuDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (g.__muscuDb) return g.__muscuDb;
  const dir = process.env.MUSCU_DATA ?? path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const d = new DatabaseSync(path.join(dir, "muscu.db"));
  d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  d.exec(SCHEMA);
  g.__muscuDb = d;
  return d;
}

export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
