# Deploy from Laptop to VPS (PowerShell wrapper)
# This script runs on Windows and calls the bash script

param(
    [switch]$Auto
)

Write-Host "🚀 MSTI Automation - Deploy from Laptop (Windows)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

# Check if deploy-from-laptop.sh exists
if (-not (Test-Path "deploy-from-laptop.sh")) {
    Write-Host "❌ deploy-from-laptop.sh not found!" -ForegroundColor Red
    exit 1
}

# Try to find bash
$bashPaths = @(
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files (x86)\Git\bin\bash.exe",
    "bash"
)

$bashPath = $null
foreach ($path in $bashPaths) {
    if ($path -eq "bash") {
        # Check if bash is in PATH
        try {
            $null = Get-Command bash -ErrorAction Stop
            $bashPath = "bash"
            break
        } catch {
            continue
        }
    } elseif (Test-Path $path) {
        $bashPath = "`"$path`""
        break
    }
}

if (-not $bashPath) {
    Write-Host "❌ Bash not found! Please install Git for Windows." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Using bash: $bashPath" -ForegroundColor Green

# Prepare command
$deployArgs = if ($Auto) { "--auto" } else { "" }
$command = "./deploy-from-laptop.sh $deployArgs"

# Set environment variables
if ($env:IMAGE_TAG) {
    Write-Host "📦 Image Tag: $($env:IMAGE_TAG)" -ForegroundColor Cyan
}
if ($env:AUTO_DEPLOY) {
    Write-Host "🤖 Auto Deploy: $($env:AUTO_DEPLOY)" -ForegroundColor Cyan
}

Write-Host "🚀 Executing: $command" -ForegroundColor Yellow

# Execute bash command
try {
    & $bashPath -c $command
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment failed with exit code: $exitCode" -ForegroundColor Red
        exit $exitCode
    }
} catch {
    Write-Host "❌ Error executing bash command: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 