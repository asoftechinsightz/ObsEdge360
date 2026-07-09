# OpsEdge360 Phase 0B — controlled rebrand (excludes node_modules, .next, dist)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$excludeDirs = @('node_modules', '.next', 'dist', 'build', '.git', 'coverage', '.turbo', '__pycache__', '.venv', 'venv')

function Should-Skip($path) {
  foreach ($d in $excludeDirs) {
    if ($path -match [regex]::Escape([IO.Path]::DirectorySeparatorChar + $d + [IO.Path]::DirectorySeparatorChar)) { return $true }
  }
  return $false
}

$extensions = @('*.ts', '*.tsx', '*.js', '*.mjs', '*.json', '*.yml', '*.yaml', '*.md', '*.py', '*.conf', '*.sql', '*.sh', '*.ps1', '*.example', '*.html')

$files = Get-ChildItem -Path $root -Recurse -File -Include $extensions | Where-Object { -not (Should-Skip $_.FullName) }

function Protect-Strings($text) {
  $markers = @{}
  $i = 0
  foreach ($p in @(
    'observability360.asoftechinsightz.com',
    'api.observability360.asoftechinsightz.com'
  )) {
    $key = "___PROTECT_${i}___"
    $text = $text.Replace($p, $key)
    $markers[$key] = $p
    $i++
  }
  return @{ Text = $text; Markers = $markers }
}

function Restore-Strings($text, $markers) {
  foreach ($kv in $markers.GetEnumerator()) {
    $text = $text.Replace($kv.Key, $kv.Value)
  }
  return $text
}

$replacements = @(
  @{ From = '@opsedge360/'; To = '@opsedge360/' },
  @{ From = '@opsedge360/'; To = '@opsedge360/' },
  @{ From = 'OpsEdge360'; To = 'OpsEdge360' },
  @{ From = 'OpsEdge360'; To = 'OpsEdge360' },
  @{ From = 'opsedge360-agent'; To = 'opsedge360-agent' },
  @{ From = 'oe360_token'; To = 'oe360_token' },
  @{ From = 'opsedge360-smoke'; To = 'opsedge360-smoke' },
  @{ From = 'opsedge360-'; To = 'opsedge360-' },
  @{ From = '"name": "opsedge360"'; To = '"name": "opsedge360"' }
)

$count = 0
foreach ($file in $files) {
  try {
    $raw = [System.IO.File]::ReadAllText($file.FullName)
  } catch {
    continue
  }
  $orig = $raw
  $p = Protect-Strings $raw
  $text = $p.Text
  foreach ($r in $replacements) {
    $text = $text.Replace($r.From, $r.To)
  }
  $text = Restore-Strings $text $p.Markers
  if ($text -ne $orig) {
    [System.IO.File]::WriteAllText($file.FullName, $text)
    $count++
  }
}
Write-Host "Rebranded $count files under $root"
