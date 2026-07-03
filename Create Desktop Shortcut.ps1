# =============================================================================
# Create Desktop Shortcut.ps1
# Run this script once to place a "Battle Monsters" shortcut on your desktop.
# =============================================================================

$ErrorActionPreference = 'Stop'

# Folder where this script and Launch Battle Monsters.bat live.
$ProjectRoot = $PSScriptRoot
$BatchFile = Join-Path $ProjectRoot 'Launch Battle Monsters.bat'

if (-not (Test-Path -LiteralPath $BatchFile)) {
    Write-Error "Could not find: $BatchFile"
}

# Desktop path for the current user.
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'Battle Monsters.lnk'

# Create a Windows shell shortcut (.lnk).
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

# Point the shortcut at the batch launcher; start in the project directory.
$Shortcut.TargetPath = $BatchFile
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = 'Launch Battle Monsters (Vite dev server + browser)'

# Use the default Command Prompt icon (no custom icon file required).
$Shortcut.IconLocation = "$env:SystemRoot\System32\cmd.exe,0"

$Shortcut.Save()

Write-Host ''
Write-Host 'Shortcut created successfully!' -ForegroundColor Green
Write-Host "  $ShortcutPath"
Write-Host ''
Write-Host 'Double-click "Battle Monsters" on your desktop to launch the game.'
Write-Host ''
