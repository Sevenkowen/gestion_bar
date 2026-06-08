#!/usr/bin/env bash
# Importa solo insumos del Excel (sin tocar pedidos ni usuarios).
# Uso en la Pi: bash scripts/import-insumos-prod.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "Importando insumos desde Excel..."
$COMPOSE exec api node dist/prisma/import-insumos.js

COUNT=$($COMPOSE exec -T postgres psql -U sistemabar -d sistemabar -t -c "SELECT COUNT(*) FROM ingredients WHERE active = true;")
echo "Insumos activos en base: $(echo "$COUNT" | tr -d '[:space:]')"
