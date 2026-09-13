# Launch (or relaunch) the TRUST servers locally.
#   .\dev.ps1          start / restart backend + frontend
#   .\dev.ps1 -Stop    stop both
param([switch]$Stop)

$Root     = $PSScriptRoot
$Backend  = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$Ports    = @(8000, 5173)

function Stop-Port($port) {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        # Kill the whole tree so uvicorn --reload workers / node children go too.
        taskkill /PID $p /T /F *> $null
        Write-Host "Stopped process $p on port $port"
    }
}

$Ports | ForEach-Object { Stop-Port $_ }
if ($Stop) { return }

$Python = Join-Path $Backend 'venv\Scripts\python.exe'
if (-not (Test-Path $Python)) { $Python = 'python' }

Start-Process powershell -WorkingDirectory $Backend -ArgumentList '-NoExit', '-Command',
    "`$Host.UI.RawUI.WindowTitle = 'TRUST backend'; & '$Python' -m uvicorn app.main:app --reload --port 8000"

if (-not (Test-Path (Join-Path $Frontend 'node_modules'))) {
    Write-Host 'Installing frontend dependencies...'
    Push-Location $Frontend; npm install; Pop-Location
}

Start-Process powershell -WorkingDirectory $Frontend -ArgumentList '-NoExit', '-Command',
    "`$Host.UI.RawUI.WindowTitle = 'TRUST frontend'; npm run dev -- --port 5173 --strictPort"

Write-Host ''
Write-Host 'Backend : http://localhost:8000  (docs: /docs)'
Write-Host 'Frontend: http://localhost:5173'
