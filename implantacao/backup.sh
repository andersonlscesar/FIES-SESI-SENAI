#!/usr/bin/env bash
# Backup do banco (formato custom do pg_dump) com retenção. Agende no cron, ex. todo dia às 2h:
#   0 2 * * * /opt/stbp/implantacao/backup.sh >> /var/log/stbp-backup.log 2>&1
# Restauração: ver README.md desta pasta.
set -euo pipefail

cd "$(dirname "$0")"
set -a; source .env; set +a
DESTINO="${STBP_BACKUP_DIR:-./backups}"
RETENCAO_DIAS="${STBP_BACKUP_RETENCAO_DIAS:-30}"
mkdir -p "$DESTINO"

arquivo="$DESTINO/stbp-$(date +%Y%m%d-%H%M).dump"
docker compose exec -T postgres pg_dump -U "$STBP_DB_USUARIO" -d "${STBP_DB_NOME:-stbp}" -Fc > "$arquivo"
echo "$(date '+%F %T') backup gerado: $arquivo ($(du -h "$arquivo" | cut -f1))"

find "$DESTINO" -name 'stbp-*.dump' -mtime +"$RETENCAO_DIAS" -print -delete
