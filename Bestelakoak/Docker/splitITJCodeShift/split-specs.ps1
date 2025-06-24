# split-specs.ps1 - PowerShell script to run the spec splitter with custom folders
# Usage: .\split-specs.ps1 <source-folder> <output-folder>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$SourceFolder,
    
    [Parameter(Mandatory=$true, Position=1)]
    [string]$OutputFolder,
    
    [switch]$Help
)

function Show-Help {
    Write-Host @"
Usage: .\split-specs.ps1 <source-folder> <output-folder> [options]

Arguments:
  SourceFolder    Path to the folder containing the spec files to split
  OutputFolder    Path to the folder where split files will be saved

Options:
  -Help          Show this help message

Examples:
  .\split-specs.ps1 .\tests .\output
  .\split-specs.ps1 "C:\path\to\tests" "C:\path\to\output"
"@
}

if ($Help) {
    Show-Help
    exit 0
}

if (-not $SourceFolder -or -not $OutputFolder) {
    Write-Error "Both source folder and output folder are required."
    Show-Help
    exit 1
}

# Resolve to absolute paths
$SourceFolderAbsolute = Resolve-Path -Path $SourceFolder -ErrorAction SilentlyContinue
$OutputFolderAbsolute = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputFolder)

if (-not $SourceFolderAbsolute) {
    Write-Error "Source folder does not exist: $SourceFolder"
    exit 1
}

if (-not (Test-Path -Path $SourceFolderAbsolute -PathType Container)) {
    Write-Error "Source path is not a directory: $SourceFolderAbsolute"
    exit 1
}

Write-Host "Running spec splitter..." -ForegroundColor Green
Write-Host "Source folder: $SourceFolderAbsolute" -ForegroundColor Cyan
Write-Host "Output folder: $OutputFolderAbsolute" -ForegroundColor Cyan
Write-Host ""

try {
    # Change to the script directory
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    Push-Location $ScriptDir
    
    # Run the Node.js CLI script
    node split-specs-cli.js "$SourceFolderAbsolute" "$OutputFolderAbsolute"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "" 
        Write-Host "Process completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Error "Process failed with error code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} catch {
    Write-Error "An error occurred: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location
}
