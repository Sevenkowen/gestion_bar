#!/usr/bin/env bash
# Restaura un dump en la base de producción (Docker en Raspberry Pi).
# Uso: bash scripts/db-restore-prod.sh backups/sistemabar-local.dump
#
# ⚠️  Reemplaza TODA la base (pedidos, stock, usuarios, etc.).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DUMP="${1:-backups/sistemabar-local.dump}"
COMPOSE="docker compose -f docker-compose.prod.yml"
DB_CONTAINER="sistemabar-db"

if [[ ! -f "$DUMP" ]]; then
  echo "❌ No existe: $DUMP"
  exit 1
fi

echo "⚠️  Esto va a reemplazar la base completa en producción."
read -r -p "¿Continuar? (escribí si): " confirm
if [[ "$confirm" != "si" ]]; then
  echo "Cancelado."
  exit 0
fi

echo "Parando api y print-worker..."
$COMPOSE stop api print-worker web 2>/dev/null || true

echo "Copiando dump al contenedor postgres..."
docker cp "$DUMP" "${DB_CONTAINER}:/tmp/restore.dump"

echo "Restaurando..."
docker exec "$DB_CONTAINER" pg_restore -U sistemabar -d sistemabar --clean --if-exists --no-owner /tmp/restore.dump
docker exec "$DB_CONTAINER" rm -f /tmp/restore.dump

echo "Levantando servicios..."
$COMPOSE up -d

echo "✅ Base restaurada desde $DUMP"
