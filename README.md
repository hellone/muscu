# Muscu

Webapp (PWA) de musculation : le coach propose la séance du jour selon la récupération de chaque muscle,
construit l'enchaînement optimal et retient tes charges pour te faire progresser.

## Ce que fait l'appli

- **Accueil** : 3 cibles proposées (ex. Jambes / Pectoraux + Triceps / Épaules + Abdos), choisies parmi les muscles
  récupérés et travaillés il y a le plus longtemps. Les autres cibles restent accessibles (« Autre chose en tête ? »).
  Schéma du corps coloré selon la récupération (rouge = fatigué, orange = en cours, vert = prêt).
- **Séance** : enchaînement trié automatiquement — polyarticulaires lourds d'abord, puis polyarticulaires secondaires,
  puis isolations (gros muscles avant petits, abdos en dernier). Chaque exercice explique pourquoi il est à cette place.
  Charge et reps pré-remplies (dernière perf + progression), boutons −/+ pour corriger, ✓ pour valider la série,
  minuteur de repos automatique. Remplacer / ajouter / retirer / monter un exercice.
- **Fiche exercice** : démonstration (départ ↔ arrivée), consignes, muscles principaux et secondaires sur le schéma,
  courbe de progression (1RM estimé) et historique des séances.
- **Hors-ligne** : la séance en cours est gardée sur le téléphone ; si le réseau manque à la fin, elle est envoyée
  automatiquement au retour du réseau.
- **Comptes** : identifiant + mot de passe, une session par appareil (1 an). Code d'invitation optionnel.

## Structure

```
web/                      L'application Next.js
  app/(app)/              Écrans connectés : accueil, séance, exercices, historique, compte
  app/api/                API (compte, coach, séances, exercices)
  lib/muscles.ts          Muscles (taille, temps de récupération) et cibles de séance
  lib/exercices.ts        Catalogue (≈ 75 exercices) : muscles, niveau, fourchette de reps, consignes
  lib/coach.ts            Le coach : récupération, cibles du jour, choix + ordre des exercices, double progression
  lib/seances.ts          Lecture / écriture des séances (SQLite)
  public/exos/            Images des exercices (Free Exercise DB, domaine public)
  public/sw.js            Service worker (mode hors-ligne)
  tests/coach.test.ts     Tests du coach
docker-compose.yml        Déploiement sur le VPS (Traefik de n8n, comme Courtside)
deploy.sh / sauvegarde.sh Mise à jour et sauvegarde nocturne de la base
```

## Lancer sur ton PC (Windows)

Prérequis : Node.js 22 LTS.

```powershell
cd C:\dev\Muscu\web
npm install
npm run dev
```

Puis http://localhost:3000 (outils développeur du navigateur > mode téléphone). Tests : `npm test`.

## Déployer sur le VPS

1. **DNS** : créer un enregistrement `A` `muscu.courtside-basket.fr` → IP du VPS (chez le registrar de courtside-basket.fr).
2. Copier le dossier sur le VPS (ex. `/opt/muscu`) avec `git clone` ou `scp`.
3. `cp .env.example .env` puis choisir un `CODE_INVITATION`.
4. `bash deploy.sh` (ou `docker compose up -d --build` la première fois).
5. Sauvegarde : `chmod +x sauvegarde.sh` puis ajouter la ligne cron indiquée dans le script.

Traefik (celui de n8n, réseau `n8n_default`) obtient le certificat HTTPS automatiquement.

## Réglages (variables d'environnement)

| Variable | Rôle | Défaut |
|---|---|---|
| `MUSCU_DOMAIN` | Domaine de l'appli | `muscu.courtside-basket.fr` |
| `CODE_INVITATION` | Code demandé à l'inscription (vide = inscription libre) | vide |
| `MUSCU_DATA` | Dossier de la base SQLite | `./data` |

## Ajuster le coach

- Ajouter un exercice : une entrée dans `web/lib/exercices.ts` + ses deux images dans `web/public/exos/<image>/0.jpg` et `1.jpg`.
- Changer le contenu d'une cible (nombre d'exercices par muscle) : `CIBLES` dans `web/lib/muscles.ts`.
- Temps de récupération par muscle : `MUSCLES` dans `web/lib/muscles.ts`.
