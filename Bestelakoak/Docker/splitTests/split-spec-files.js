const fs = require('fs');
const path = require('path');

// --- Configuration ---
const inputDir = process.argv[2]; // Get input directory from command line argument
const outputDir = process.argv[3]; // Get output directory from command line argument
const specFilePattern = /\.spec\.ts$/;
// Regex to find 'it' blocks. Handles async/await and different quote types.
// It captures the 'it' block signature and its body.
const itBlockRegex = /(\s*it\s*\(\s*['"`](.*?)['"`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*\);?)/g;
// --- End Configuration ---

if (!inputDir || !outputDir) {
    console.error('Usage: node split-spec-files.js <inputDirectory> <outputDirectory>');
    process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
}

try {
    const files = fs.readdirSync(inputDir);

    files.forEach(file => {
        const inputFile = path.join(inputDir, file);
        const fileStat = fs.statSync(inputFile);

        // Process only files ending with .spec.ts
        if (fileStat.isFile() && specFilePattern.test(file)) {
            console.log(`Processing file: ${inputFile}`);
            const content = fs.readFileSync(inputFile, 'utf-8');

            // Find all 'it' blocks
            const itBlocks = [...content.matchAll(itBlockRegex)];

            if (itBlocks.length > 0) {
                // Extract the 'shell' (code outside 'it' blocks)
                // This assumes 'it' blocks are directly within the main 'describe' or similar top-level structure.
                // It replaces all found 'it' blocks with a placeholder.
                let shell = content;
                itBlocks.forEach(match => {
                    // Replace only the first occurrence in each iteration to handle identical blocks
                    shell = shell.replace(match[1], '%%%IT_BLOCK_PLACEHOLDER%%%');
                });

                // Check if the placeholder exists and find its position
                const placeholderIndex = shell.indexOf('%%%IT_BLOCK_PLACEHOLDER%%%');
                if (placeholderIndex === -1 && itBlocks.length > 0) {
                    console.warn(`  Could not properly isolate 'it' blocks structure in ${file}. Skipping split for this file.`);
                    return; // Skip this file if structure is unexpected
                }

                // Split the shell into parts before and after the placeholder(s)
                // We only care about the first placeholder's position to insert individual blocks
                const beforeItBlocks = shell.substring(0, placeholderIndex);
                // Find the end of the last 'it' block placeholder section
                let afterItBlocks = shell.substring(placeholderIndex);
                afterItBlocks = afterItBlocks.replace(/%%%IT_BLOCK_PLACEHOLDER%%%/g, ''); // Remove all placeholders


                // Create a new file for each 'it' block
                itBlocks.forEach((match, index) => {
                    const itBlockContent = match[1]; // The full 'it(...);' block
                    const itDescription = match[2]; // The description string inside 'it(...)'

                    // Sanitize description for filename
                    const safeDescription = itDescription.replace(/[^a-z0-9_\-\s]/gi, '').replace(/\s+/g, '_').substring(0, 50);
                    const newFileName = `${path.basename(file, '.spec.ts')}_${index + 1}_${safeDescription}.spec.ts`;
                    const outputFile = path.join(outputDir, newFileName);

                    // Construct the new file content
                    const newContent = `${beforeItBlocks.trimEnd()}\n${itBlockContent}\n${afterItBlocks.trimStart()}`;

                    fs.writeFileSync(outputFile, newContent, 'utf-8');
                    console.log(`  Created split test file: ${outputFile}`);
                });

            } else {
                console.log(`  No 'it' blocks found in ${file}. Skipping.`);
            }
        }
    });

    console.log('\nScript finished.');

} catch (err) {
    console.error('An error occurred:', err);
    process.exit(1);
}