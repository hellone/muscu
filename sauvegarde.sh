#!/usr/bin/env bash
# Sauvegarde de la base Muscu (à lancer chaque nuit par cron).
# Copie cohérente même pendant que l'appli tourne (VACUUM INTO), compressée, gardée 30 jours.
# Installation : crontab -e  puis ajouter :
#   40 3 * * * /opt/muscu/sauvegarde.sh >> /var/log/muscu-sauvegarde.log 2>&1
set -euo pipefail

DOSSIER=/root/sauvegardes
GARDER_JOURS=30
NOM="muscu-$(date +%F-%H%M).db"

mkdir -p "$DOSSIER"
cd "$(dirname "$0")"
docker exec muscu-web node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('/data/muscu.db').exec(\"VACUUM INTO '/data/$NOM'\")"
mv "data/$NOM" "$DOSSIER/$NOM"
gzip -f "$DOSSIER/$NOM"
find "$DOSSIER" -name 'muscu-*.db.gz' -mtime +"$GARDER_JOURS" -delete
echo "$(date '+%F %T') sauvegarde OK : $DOSSIER/$NOM.gz ($(du -h "$DOSSIER/$NOM.gz" | cut -f1))"
