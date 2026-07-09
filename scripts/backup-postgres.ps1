# OpsEdge360 PostgreSQL backup (Windows / Docker Desktop)
# Usage: .\scripts\backup-postgres.ps1 -OutDir .\backups

param(
  [string]$OutDir = ".\backups"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$stamp = Get-Date -Format "yyyy-MM-dd"
$file = Join-Path $OutDir "opsedge360-$stamp.sql"

$container = docker ps -qf "name=postgres" | Select-Object -First 1
if (-not $container) {
  Write-Error "No running postgres container found"
}

$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "trinetra" }
$db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "trinetra360" }

Write-Host "Backing up $db from $container -> $file"
docker exec $container pg_dump -U $user $db | Set-Content -Path $file -Encoding utf8

# Optional gzip if available
if (Get-Command gzip -ErrorAction SilentlyContinue) {
  gzip -f $file
  $file = "$file.gz"
}

Write-Host "Backup complete: $file"
