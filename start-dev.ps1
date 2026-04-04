$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-PortListening {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
        return $null -ne $conn
    } catch {
        return $false
    }
}

function Start-ServiceWindow {
    param(
        [string]$Name,
        [string]$WorkingDir,
        [string]$Command,
        [int]$Port
    )

    if (Test-PortListening -Port $Port) {
        Write-Host "[$Name] Port $Port already in use. Skipping start." -ForegroundColor Yellow
        return
    }

    $escapedDir = $WorkingDir.Replace("'", "''")
    $psCommand = "Set-Location '$escapedDir'; $Command"

    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $psCommand
    ) | Out-Null

    Write-Host "[$Name] Starting in a new terminal window on port $Port..." -ForegroundColor Green
}

Start-ServiceWindow -Name "AI Engine" -WorkingDir (Join-Path $root "resume_ai") -Command "python -m uvicorn api:app --host 0.0.0.0 --port 8000" -Port 8000
Start-ServiceWindow -Name "Backend" -WorkingDir (Join-Path $root "backend") -Command "$env:AI_SERVICE_URL='http://127.0.0.1:8000'; npm run dev" -Port 5000
Start-ServiceWindow -Name "Frontend" -WorkingDir (Join-Path $root "frontend") -Command "npm start" -Port 3000

Write-Host "`nDone. If all services were down, 3 new terminals should now be running." -ForegroundColor Cyan
