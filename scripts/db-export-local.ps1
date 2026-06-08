# Exporta la base local (Docker postgres) a backups/sistemabar-local.dump
# Uso: .\scripts\db-export-local.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root 'backups'
$dumpFile = Join-Path $backupDir 'sistemabar-local.dump'
$container = 'sistemabar-db'

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$running = docker ps --filter "name=$container" --format "{{.Names}}"
if (-not $running) {
  Write-Error "Contenedor $container no está corriendo. Levantá: docker compose up postgres -d"
}

Write-Host "Exportando base local a $dumpFile ..."
docker exec $container pg_dump -U sistemabar -d sistemabar -F c -f /tmp/sistemabar-local.dump
docker cp "${container}:/tmp/sistemabar-local.dump" $dumpFile
docker exec $container rm -f /tmp/sistemabar-local.dump

$sizeMb = [math]::Round((Get-Item $dumpFile).Length / 1MB, 2)
Write-Host "Listo: $dumpFile ($sizeMb MB)"
Write-Host ""
Write-Host "Copiá a la Pi:"
Write-Host "  scp backups/sistemabar-local.dump pi@IP-PI:~/gestion_bar/backups/"
Write-Host ""
Write-Host "Restaurar en la Pi:"
Write-Host "  bash scripts/db-restore-prod.sh backups/sistemabar-local.dump"
