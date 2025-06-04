#!/usr/bin/env node
// split-specs-cli.js - Command line version with configurable source and output folders
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get command line arguments
const args = process.argv.slice(2);

// Help function
function showHelp() {
    console.log(`
Usage: node split-specs-cli.js <source-folder> <output-folder> [options]

Arguments:
  source-folder   Path to the folder containing the spec files to split
  output-folder   Path to the folder where split files will be saved

Options:
  --help         Show this help message

Examples:
  node split-specs-cli.js ./tests ./output
  node split-specs-cli.js "C:\\path\\to\\tests" "C:\\path\\to\\output"
`);
}

// Parse arguments
if (args.includes('--help') || args.length < 2) {
    showHelp();
    process.exit(args.includes('--help') ? 0 : 1);
}

const sourceFolder = path.resolve(args[0]);
const outputFolder = path.resolve(args[1]);

// Validate source folder exists
if (!fs.existsSync(sourceFolder)) {
    console.error(`Error: Source folder does not exist: ${sourceFolder}`);
    process.exit(1);
}

if (!fs.statSync(sourceFolder).isDirectory()) {
    console.error(`Error: Source path is not a directory: ${sourceFolder}`);
    process.exit(1);
}

console.log(`Source folder: ${sourceFolder}`);
console.log(`Output folder: ${outputFolder}`);

// Global variable to store the output folder for the transformer
global.CUSTOM_OUTPUT_FOLDER = outputFolder;

// Global variable to store the output folder for the transformer
global.CUSTOM_OUTPUT_FOLDER = outputFolder;

// Process all spec files in the source folder
async function processFolder() {
    try {
        const files = fs.readdirSync(sourceFolder);
        const specFiles = files.filter(file => 
            (file.endsWith('.spec.js') || file.endsWith('.spec.ts')) && 
            fs.statSync(path.join(sourceFolder, file)).isFile()
        );

        if (specFiles.length === 0) {
            console.log('No se encontraron archivos .spec.js o .spec.ts en el directorio fuente.');
            return;
        }

        console.log(`Encontrados ${specFiles.length} archivo(s) de especificaciones:`);
        specFiles.forEach(file => console.log(`  - ${file}`));
        console.log('');

        // Get the current directory to find the transformer
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const transformerPath = path.join(__dirname, 'split-specs-configurable.js');

        // Check if transformer exists
        if (!fs.existsSync(transformerPath)) {
            console.error(`Error: Transformer file not found: ${transformerPath}`);
            process.exit(1);
        }

        // Process each file using jscodeshift
        for (const file of specFiles) {
            const filePath = path.join(sourceFolder, file);
            console.log(`\nProcesando: ${file}`);
              try {
                // Use jscodeshift to run the transformer with TypeScript parser
                const command = `npx jscodeshift -t "${transformerPath}" "${filePath}" --dry=false --parser=tsx`;
                execSync(command, { 
                    stdio: 'inherit',
                    cwd: __dirname
                });
            } catch (error) {
                console.error(`Error procesando ${file}:`, error.message);
            }
        }

        console.log(`\nProcesamiento completado. Los archivos divididos se guardaron en: ${outputFolder}`);

    } catch (error) {
        console.error('Error procesando la carpeta:', error);
        process.exit(1);
    }
}

// Run the processing
processFolder();
