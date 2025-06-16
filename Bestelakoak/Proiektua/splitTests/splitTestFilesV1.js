const fs = require('fs');
const path = require('path');

/**
 * Split Cypress test files into separate files, one for each 'it' block
 * @param {string} folderPath - The folder containing test files to process
 * @param {string} outputFolder - The folder to output split test files (default: 'split-tests')
 */
function splitTestFiles(folderPath, outputFolder = 'split-tests') {
  // Find all .spec.ts files in the folder
  const files = fs.readdirSync(folderPath)
    .filter(file => file.endsWith('.spec.ts') && !file.match(/-\d+\.spec\.ts$/)) // Skip already processed files
    .map(file => path.join(folderPath, file));
  
  console.log(`Found ${files.length} test files to process...`);
  
  // Create output directory if it doesn't exist
  const outputPath = path.join(folderPath, outputFolder);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(`Created output folder: ${outputPath}`);
  }
  
  files.forEach(file => processFile(file, outputPath));
}

/**
 * Process a single test file, creating individual files for each test
 * @param {string} filePath - Path to the test file
 * @param {string} outputDir - Directory to output split test files
 */
function processFile(filePath, outputDir) {
  const filename = path.basename(filePath);
  const baseName = filename.replace('.spec.ts', '');
  
  console.log(`Processing ${filename}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');

  // Find all the 'it' blocks including any comments above them
  const itBlocksWithComments = findItBlocksWithComments(content);
  
  if (itBlocksWithComments.length === 0) {
    console.log(`No test blocks found in ${filename}`);
    return;
  }
  
  console.log(`Found ${itBlocksWithComments.length} test blocks in ${filename}`);
  
  // For each it block, create a new file with only that it block active
  itBlocksWithComments.forEach((block, index) => {
    // Start with the original content
    let newContent = content;
    
    // Replace all it blocks except the current one
    itBlocksWithComments.forEach((otherBlock, blockIndex) => {
      if (blockIndex !== index) {
        // Remove the it block entirely
        newContent = newContent.replace(otherBlock.fullText, '');
      }
    });
    
    // Clean up multiple consecutive blank lines (replace 2+ consecutive newlines with a single newline)
    newContent = newContent.replace(/(\r?\n){2,}/g, '\n');
    
    // Create new filename with index
    const newFileName = `${baseName}-${index + 1}.spec.ts`;
    const newFilePath = path.join(outputDir, newFileName);
    
    // Write the new file
    fs.writeFileSync(newFilePath, newContent);
    console.log(`Created ${newFileName} for test: "${block.name}"`);
  });
}

/**
 * Find all 'it' blocks in the content along with any comments above them
 * @param {string} content - The file content
 * @returns {Array} - Array of objects with the it block text, name, and any comments above
 */
function findItBlocksWithComments(content) {
  // First, find the positions of all it blocks
  const itPositions = [];
  const itRegex = /it\s*\(\s*(['"`])(.*?)\1\s*,\s*(?:async\s*)?\(\s*.*?\s*\)\s*=>\s*\{[\s\S]*?(?=\s*\}\s*\)\s*;?\s*(?:it|\}\s*\)|\}|$))\s*\}\s*\)\s*;?/g;
  
  let match;
  while ((match = itRegex.exec(content)) !== null) {
    itPositions.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      name: match[2]
    });
  }
  
  // Now, find any comments above each it block
  const blocks = [];
  for (let i = 0; i < itPositions.length; i++) {
    const currentBlock = itPositions[i];
    let commentStart = -1;
    
    // If this isn't the first block, look for comments between the previous block's end and this block's start
    if (i > 0) {
      const prevBlockEnd = itPositions[i - 1].end;
      const textBetween = content.substring(prevBlockEnd, currentBlock.start);
      
      // Check if there's a comment in this space
      const commentMatch = textBetween.match(/\/\/.*$/m);
      if (commentMatch) {
        commentStart = prevBlockEnd + commentMatch.index;
      }
    } else {
      // For the first block, look for a comment directly before it
      const textBefore = content.substring(Math.max(0, currentBlock.start - 200), currentBlock.start);
      const lines = textBefore.split('\n');
      
      // Look for the last comment line before the it block
      for (let j = lines.length - 1; j >= 0; j--) {
        if (lines[j].trim().startsWith('//')) {
          // Found a comment line
          const prevLines = lines.slice(0, j).join('\n').length;
          commentStart = Math.max(0, currentBlock.start - 200) + prevLines;
          break;
        } else if (lines[j].trim() !== '') {
          // Found a non-comment, non-empty line, stop looking
          break;
        }
      }
    }
    
    // Determine the full text to include (comment + it block)
    const fullTextStart = commentStart > -1 ? commentStart : currentBlock.start;
    const fullText = content.substring(fullTextStart, currentBlock.end);
    
    blocks.push({
      text: currentBlock.text,
      name: currentBlock.name,
      fullText: fullText
    });
  }
  
  return blocks;
}

// Check if folder path was provided as command line argument
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a folder path as an argument');
  process.exit(1);
}

const folderPath = args[0];
if (!fs.existsSync(folderPath)) {
  console.error(`Folder does not exist: ${folderPath}`);
  process.exit(1);
}

// Get optional output folder name
const outputFolder = args[1] || 'split-tests';

// Run the function
splitTestFiles(folderPath, outputFolder);