# Complete physical folder rename (Windows)

The canonical repo path is **`OpsEdge360`**.

If you still have a `MainStay_Vizor` directory (or a junction), run this script **after closing Cursor/IDE** so files are not locked:

```powershell
cd D:\AsoftechInsightz_Project

# Remove junction if present
if ((Get-Item OpsEdge360 -ErrorAction SilentlyContinue).LinkType -eq 'Junction') {
  cmd /c rmdir OpsEdge360
}

# Physical rename
if (Test-Path MainStay_Vizor) {
  Rename-Item MainStay_Vizor OpsEdge360
  Write-Host "Renamed MainStay_Vizor -> OpsEdge360"
} elseif (Test-Path OpsEdge360) {
  Write-Host "OpsEdge360 already exists."
} else {
  Write-Error "Neither MainStay_Vizor nor OpsEdge360 found."
}
```

Then reopen the workspace using folder: `D:\AsoftechInsightz_Project\OpsEdge360`

## Cursor / VS Code workspace

Update multi-root workspace paths from `MainStay_Vizor` to `OpsEdge360`.

## Git remote (optional)

If the GitHub repo is renamed, update `origin`:

```bash
git remote set-url origin <new-repo-url>
```

Internal npm scope `@opsedge360/*` is unchanged — rename in a future sprint if needed.
