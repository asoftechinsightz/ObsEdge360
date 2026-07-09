# Complete folder rename: MainStay_Vizor -> OpsEdge360
# Run AFTER closing Cursor (folder may be locked while IDE is open)

$root = "D:\AsoftechInsightz_Project"
Set-Location $root

$junction = Join-Path $root "OpsEdge360"
$legacy = Join-Path $root "MainStay_Vizor"

if (Test-Path $junction) {
  $item = Get-Item $junction -Force
  if ($item.LinkType -eq 'Junction') {
    cmd /c rmdir "$junction"
    Write-Host "Removed junction OpsEdge360"
  }
}

if (Test-Path $legacy) {
  Rename-Item -Path $legacy -NewName "OpsEdge360"
  Write-Host "SUCCESS: Renamed MainStay_Vizor -> OpsEdge360"
} elseif (Test-Path (Join-Path $root "OpsEdge360")) {
  Write-Host "OpsEdge360 folder already exists (physical rename done)."
} else {
  Write-Error "MainStay_Vizor not found at $legacy"
  exit 1
}

Write-Host ""
Write-Host "Reopen Cursor with workspace folder: $root\OpsEdge360"
