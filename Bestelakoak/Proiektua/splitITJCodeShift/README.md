# Split Specs - Configurable Version

This tool splits JavaScript/TypeScript test files containing multiple `it` blocks into separate files, each containing a single test. Now supports custom source and output directories!

## Files

- `split-specs5.js` - Original transformer (hardcoded to output in 'results' folder)
- `split-specs-configurable.js` - Modified transformer that accepts custom output folder
- `split-specs-cli.js` - Command line interface for the configurable transformer
- `split-specs.bat` - Windows batch script wrapper
- `split-specs.ps1` - Windows PowerShell script wrapper

## Usage

### Option 1: Using Node.js directly

```bash
node split-specs-cli.js <source-folder> <output-folder>
```

### Option 2: Using Windows Batch Script

```cmd
split-specs.bat <source-folder> <output-folder>
```

### Option 3: Using PowerShell Script

```powershell
.\split-specs.ps1 <source-folder> <output-folder>
```

### Option 4: Using JSCodeshift directly (with configurable transformer)

First set the output folder as a global variable, then run:

```bash
# Set global output folder in your script
global.CUSTOM_OUTPUT_FOLDER = "C:\\path\\to\\output";

# Run the transformer
npx jscodeshift -t split-specs-configurable.js "path/to/source/files/**/*.spec.js"
```

## Examples

### Windows Examples

```cmd
# Using batch script
split-specs.bat ".\tests" ".\output"
split-specs.bat "C:\project\tests" "C:\project\split-tests"

# Using PowerShell
.\split-specs.ps1 ".\tests" ".\output"
.\split-specs.ps1 "C:\project\tests" "C:\project\split-tests"

# Using Node.js directly
node split-specs-cli.js ".\tests" ".\output"
node split-specs-cli.js "C:\project\tests" "C:\project\split-tests"
```

### Unix/Linux Examples

```bash
# Using Node.js directly
node split-specs-cli.js "./tests" "./output"
node split-specs-cli.js "/home/user/project/tests" "/home/user/project/split-tests"
```

## How it works

1. **Scans the source folder** for `.spec.js` and `.spec.ts` files
2. **For each spec file** with multiple `it` blocks:
   - Creates separate files, each containing only one `it` block
   - Removes empty `describe`/`context` blocks
   - Unwraps `context` blocks that contain only one `it` block
   - Names files as `originalname1.spec.js`, `originalname2.spec.js`, etc.
3. **Saves all split files** to the specified output folder

## Requirements

- Node.js
- jscodeshift (installed as dev dependency)

## What gets processed

- Files ending with `.spec.js` or `.spec.ts`
- Only files with more than one `it` block are split
- Files with one or zero `it` blocks are left unchanged

## Output

For a file named `example.spec.js` with 3 `it` blocks, you'll get:
- `example1.spec.js` (first test)
- `example2.spec.js` (second test)  
- `example3.spec.js` (third test)

The output files will be created in the specified output folder.

## Error Handling

- Validates that the source folder exists
- Creates the output folder if it doesn't exist
- Provides detailed error messages for any processing issues
- Continues processing other files if one file fails

## Help

Use `--help` with any of the command-line tools to see usage information:

```bash
node split-specs-cli.js --help
```

```powershell
.\split-specs.ps1 -Help
```
