# PowerShell script to merge and ingest test data
# Run this script from the dashboard directory

Write-Host "🚀 Starting merge and ingest process..." -ForegroundColor Green

# Check if Node.js is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if the merge script exists
$scriptPath = Join-Path $PSScriptRoot "merge-and-ingest-data.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Merge script not found at: $scriptPath" -ForegroundColor Red
    exit 1
}

try {
    # Set working directory to dashboard
    $dashboardDir = Split-Path $PSScriptRoot -Parent
    Set-Location $dashboardDir
    
    Write-Host "📂 Working directory: $dashboardDir" -ForegroundColor Cyan
    
    # Run the merge and ingest script
    Write-Host "🔄 Running merge and ingest script..." -ForegroundColor Yellow
    node $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Merge and ingest completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Merge and ingest failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
} catch {
    Write-Host "❌ Error during merge and ingest: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Process completed!" -ForegroundColor Green
