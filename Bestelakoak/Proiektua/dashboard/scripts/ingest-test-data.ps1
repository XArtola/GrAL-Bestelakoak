# PowerShell script to run the test data ingestion
# This script runs the Node.js ingestion script with proper environment setup

param(
    [string]$MongoUri = "mongodb://localhost:27017",
    [switch]$Help,
    [switch]$DryRun
)

if ($Help) {
    Write-Host "Test Data Ingestion Script" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    Write-Host ""
    Write-Host "This script processes test execution results and efficiency metrics files"
    Write-Host "and uploads them to MongoDB collections."
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\ingest-test-data.ps1 [-MongoUri <uri>] [-DryRun] [-Help]"
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -MongoUri    MongoDB connection URI (default: mongodb://localhost:27017)"
    Write-Host "  -DryRun      Show what would be processed without actually uploading"
    Write-Host "  -Help        Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\ingest-test-data.ps1"
    Write-Host "  .\ingest-test-data.ps1 -MongoUri 'mongodb://user:pass@localhost:27017'"
    Write-Host "  .\ingest-test-data.ps1 -DryRun"
    Write-Host ""
    exit 0
}

# Check if Node.js is installed
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Blue
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Node.js is required but not found" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "ingest-test-data.js"

# Check if the Node.js script exists
if (!(Test-Path $nodeScript)) {
    Write-Host "❌ Node.js script not found: $nodeScript" -ForegroundColor Red
    exit 1
}

# Check data directories
$projectRoot = Split-Path -Parent $scriptDir
$resultsDir = Join-Path $projectRoot "data\test_execution_results\executed_tests_results"
$metricsDir = Join-Path $projectRoot "data\test_execution_results\test_eficcency_metrics"

Write-Host "📂 Checking data directories..." -ForegroundColor Blue
Write-Host "   Results: $resultsDir" -ForegroundColor Gray
Write-Host "   Metrics: $metricsDir" -ForegroundColor Gray

if (!(Test-Path $resultsDir)) {
    Write-Host "⚠️  Results directory not found: $resultsDir" -ForegroundColor Yellow
}

if (!(Test-Path $metricsDir)) {
    Write-Host "⚠️  Metrics directory not found: $metricsDir" -ForegroundColor Yellow
}

# Count available files
$resultFiles = @()
$metricFiles = @()

if (Test-Path $resultsDir) {
    $resultFiles = Get-ChildItem -Path $resultsDir -Filter "results_*.json" | ForEach-Object { $_.Name }
}

if (Test-Path $metricsDir) {
    $metricFiles = Get-ChildItem -Path $metricsDir -Filter "test-efficiency-metrics_*.json" | ForEach-Object { $_.Name }
}

Write-Host ""
Write-Host "📊 Available data files:" -ForegroundColor Blue
Write-Host "   Result files: $($resultFiles.Count)" -ForegroundColor Gray
if ($resultFiles.Count -gt 0) {
    $resultFiles | ForEach-Object { Write-Host "     - $_" -ForegroundColor DarkGray }
}

Write-Host "   Metric files: $($metricFiles.Count)" -ForegroundColor Gray
if ($metricFiles.Count -gt 0) {
    $metricFiles | ForEach-Object { Write-Host "     - $_" -ForegroundColor DarkGray }
}

if ($resultFiles.Count -eq 0 -and $metricFiles.Count -eq 0) {
    Write-Host "❌ No data files found to process" -ForegroundColor Red
    Write-Host "Please ensure you have files in the following format:" -ForegroundColor Yellow
    Write-Host "   - results_<llm_name>.json in $resultsDir" -ForegroundColor Gray
    Write-Host "   - test-efficiency-metrics_<llm_name>.json in $metricsDir" -ForegroundColor Gray
    exit 1
}

if ($DryRun) {
    Write-Host ""
    Write-Host "🧪 DRY RUN MODE - No data will be uploaded" -ForegroundColor Yellow
    Write-Host "The script would process the files listed above." -ForegroundColor Gray
    exit 0
}

# Set environment variables
$env:MONGODB_URI = $MongoUri

Write-Host ""
Write-Host "🚀 Starting data ingestion..." -ForegroundColor Green
Write-Host "MongoDB URI: $MongoUri" -ForegroundColor Gray

# Run the Node.js script
try {
    & node $nodeScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Data ingestion completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Start your dashboard application" -ForegroundColor Gray
        Write-Host "2. Navigate to the Action Usage Analysis section" -ForegroundColor Gray
        Write-Host "3. Refresh data to load the newly ingested information" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Data ingestion failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running data ingestion: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
