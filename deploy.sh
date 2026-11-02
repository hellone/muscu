#!/usr/bin/env bash
# Mise à jour de Muscu sur le serveur : récupère une branche (main par défaut) et reconstruit.
# Usage : bash deploy.sh            -> branche main
#         bash deploy.sh ma-branche -> autre branche (test)
# Tout est dans une fonction : bash lit le script en entier avant que git ne le remplace.
set -euo pipefail

deployer() {
  cd "$(dirname "$0")"
  local BRANCHE="${1:-main}"
  git fetch origin "+refs/heads/$BRANCHE:refs/remotes/origin/$BRANCHE"
  git checkout -B "$BRANCHE" "origin/$BRANCHE"
  git reset --hard "origin/$BRANCHE"
  echo "Déploiement de la branche $BRANCHE ($(git log -1 --format='%h %s'))"
  mkdir -p data && chown -R 1001:1001 data   # utilisateur de l image (uid 1001)
  docker compose up -d --build
  docker image prune -f >/dev/null
  docker compose ps
}

deployer "$@"
exit
