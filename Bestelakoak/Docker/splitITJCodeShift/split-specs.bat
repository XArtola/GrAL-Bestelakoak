@echo off
REM split-specs.bat - Batch script to run the spec splitter with custom folders
REM Usage: split-specs.bat <source-folder> <output-folder>

if "%~2"=="" (
    echo Usage: split-specs.bat ^<source-folder^> ^<output-folder^>
    echo.
    echo Arguments:
    echo   source-folder   Path to the folder containing the spec files to split
    echo   output-folder   Path to the folder where split files will be saved
    echo.
    echo Examples:
    echo   split-specs.bat .\tests .\output
    echo   split-specs.bat "C:\path\to\tests" "C:\path\to\output"
    exit /b 1
)

set SOURCE_FOLDER=%~1
set OUTPUT_FOLDER=%~2

echo Running spec splitter...
echo Source folder: %SOURCE_FOLDER%
echo Output folder: %OUTPUT_FOLDER%
echo.

node split-specs-cli.js "%SOURCE_FOLDER%" "%OUTPUT_FOLDER%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Process completed successfully!
) else (
    echo.
    echo Process failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
