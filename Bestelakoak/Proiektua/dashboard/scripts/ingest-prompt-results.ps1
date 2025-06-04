# PowerShell script to ingest processed prompt results into MongoDB
# Usage: .\ingest-prompt-results.ps1 [options]

param(
    [switch]$Stats,
    [switch]$Clear,
    [switch]$Help
)

# Change to the dashboard directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$dashboardPath = Join-Path $scriptPath ".."
Set-Location $dashboardPath

Write-Host "🚀 Prompt Results Ingestion Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

if ($Help) {
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\ingest-prompt-results.ps1           # Ingest all data"
    Write-Host "  .\scripts\ingest-prompt-results.ps1 -Stats   # Show statistics only"
    Write-Host "  .\scripts\ingest-prompt-results.ps1 -Clear   # Clear collection first"
    Write-Host "  .\scripts\ingest-prompt-results.ps1 -Help    # Show this help"
    Write-Host ""
    exit 0
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if the data directory exists
$dataDir = Join-Path $PSScriptRoot ".." ".." "processed_prompt_results"
if (-not (Test-Path $dataDir)) {
    Write-Host "❌ Data directory not found: $dataDir" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Data directory: $dataDir" -ForegroundColor Blue

# Build the command
$command = "node scripts/ingest-prompt-results.js"

if ($Stats) {
    $command += " --stats"
    Write-Host "📊 Running in statistics mode..." -ForegroundColor Yellow
} elseif ($Clear) {
    $command += " --clear"
    Write-Host "🗑️  Running with clear option..." -ForegroundColor Yellow
} else {
    Write-Host "💾 Running full ingestion..." -ForegroundColor Yellow
}

Write-Host ""

# Execute the command
try {
    Invoke-Expression $command
    Write-Host ""
    Write-Host "✅ Script completed successfully!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Script failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
