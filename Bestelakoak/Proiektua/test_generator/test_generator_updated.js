const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

console.log('=== TEST GENERATOR STARTING ===');
console.log(`Current script directory: ${__dirname}`);

// Parse command-line arguments to find a specific folder to process
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--folder=')) {
      options.folder = arg.split('=')[1];
    }
  });
  
  return options;
}

const options = parseArgs();
console.log(`Command line options: ${JSON.stringify(options)}`);

// Base pywinauto directory
const pywinautoDir = path.join(__dirname, '..', 'pywinauto');
console.log(`Pywinauto directory: ${pywinautoDir}`);
console.log(`Directory exists?: ${fs.existsSync(pywinautoDir) ? 'Yes' : 'No'}`);

// Find all directories with output_ prefix
const outputDirPattern = path.join(pywinautoDir, 'output_*');
console.log(`Looking for output directories with pattern: ${outputDirPattern}`);

// Use specified folder or find all output_ folders
let outputDirs = [];
try {
  if (options.folder) {
    const folderPath = options.folder.startsWith('/') || options.folder.includes(':')
      ? options.folder // Absolute path
      : path.join(pywinautoDir, options.folder); // Relative to pywinauto dir
    
    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      outputDirs = [folderPath];
      console.log(`Using specified folder: ${folderPath}`);
    } else {
      console.error(`Specified folder does not exist or is not a directory: ${folderPath}`);
      process.exit(1);
    }
  } else {
    // Original behavior: find all output_ directories
    const allItems = fs.readdirSync(pywinautoDir);
    outputDirs = allItems
      .filter(item => item.startsWith('output_'))
      .map(dir => path.join(pywinautoDir, dir))
      .filter(dirPath => fs.statSync(dirPath).isDirectory());
  }
  
  console.log(`Found ${outputDirs.length} output ${outputDirs.length === 1 ? 'directory' : 'directories'}: ${outputDirs.join(', ')}`);
} catch (err) {
  console.error(`Error accessing directories: ${err.message}`);
  process.exit(1);
}

// Source directory for template files
const resultsDir = path.join(__dirname, '..', 'ui', 'results');
console.log(`Results directory: ${resultsDir}`);
console.log(`Results directory exists?: ${fs.existsSync(resultsDir) ? 'Yes' : 'No'}`);

// Base directory for complete test files
const completeTestsDir = path.join(__dirname, '..', 'ui', 'complete_tests');
console.log(`Complete tests directory: ${completeTestsDir}`);

if (!fs.existsSync(completeTestsDir)) {
  console.log(`Creating complete tests directory: ${completeTestsDir}`);
  fs.mkdirSync(completeTestsDir, { recursive: true });
} else {
  console.log(`Complete tests directory already exists`);
}

// Process each output directory
outputDirs.forEach(outputDir => {
  // Extract model name from the directory name
  const dirName = path.basename(outputDir);
  const modelName = dirName.replace('output_', '');
  
  console.log(`Processing directory ${outputDir} for model ${modelName}...`);
  
  // Look for matched data JSON file
  const matchedDataDir = path.join(__dirname, '..', 'matched_data');
  console.log(`Looking for matched data in directory: ${matchedDataDir}`);
  console.log(`Matched data directory exists?: ${fs.existsSync(matchedDataDir) ? 'Yes' : 'No'}`);
    const jsonFilename = `matched_data_${modelName}.json`;
  const jsonFilePath = path.join(matchedDataDir, jsonFilename);
  console.log(`Looking for matched data file: ${jsonFilePath}`);
  
  // Use direct file existence check instead of glob
  let jsonFiles = [];
  if (fs.existsSync(jsonFilePath)) {
    jsonFiles.push(jsonFilePath);
  }
  console.log(`Found ${jsonFiles.length} matched data files for model ${modelName}: ${jsonFiles.join(', ')}`);
  
  if (jsonFiles.length === 0) {
    console.log(`No matched data JSON file found for model ${modelName}, skipping...`);
    return;
  }
  
  const jsonFile = jsonFiles[0];
  
  // Create model-specific output directory
  const modelDir = path.join(completeTestsDir, modelName);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
    console.log(`Created model directory: ${modelDir}`);
  } else {
    console.log(`Model directory already exists: ${modelDir}`);
  }
  
  console.log(`Processing matched data ${jsonFile} into ${modelDir}...`);
  
  // Read and parse the JSON data
  console.log(`Reading JSON file: ${jsonFile}`);
  let jsonData;
  try {
    const jsonContent = fs.readFileSync(jsonFile, 'utf8');
    console.log(`JSON content length: ${jsonContent.length} characters`);
    jsonData = JSON.parse(jsonContent);
    console.log(`Parsed ${jsonData.length} entries from JSON file`);
  } catch (err) {
    console.error(`Error reading or parsing JSON file: ${err.message}`);
    return;
  }

  // Process each entry in the JSON data
  let processedCount = 0;
  jsonData.forEach((entry, index) => {
    console.log(`Processing entry ${index + 1}/${jsonData.length}`);
    
    if (entry.output_file && entry.code) {
      console.log(`Entry ${index + 1} has output_file and code fields`);
      
      // Extract the base filename from the output_file path
      const outputFileName = path.basename(entry.output_file);
      console.log(`Output file name: ${outputFileName}`);
      
      // Extract the main file prefix (e.g., "transaction-feeds11.spec")
      const filePrefix = outputFileName.split('_response_')[0];
      console.log(`File prefix: ${filePrefix}`);
        // Determine source file path in ui/results - try both .ts and .js extensions
      let sourcePath = path.join(resultsDir, `${filePrefix}.ts`);
      if (!fs.existsSync(sourcePath)) {
        sourcePath = path.join(resultsDir, `${filePrefix}.js`);
      }
      console.log(`Source path: ${sourcePath}`);
      console.log(`Source file exists?: ${fs.existsSync(sourcePath) ? 'Yes' : 'No'}`);
        // Create the destination file path in the model-specific directory - keep same extension as source
      const sourceExt = path.extname(sourcePath);
      const destPath = path.join(modelDir, `${filePrefix}${sourceExt}`);
      console.log(`Destination path: ${destPath}`);
      
      try {
        // Check if source file exists in ui/results
        if (fs.existsSync(sourcePath)) {
          // Read the original file content
          let originalContent = fs.readFileSync(sourcePath, 'utf8');
          console.log(`Read original content from ${sourcePath}, length: ${originalContent.length} characters`);
            // Find the it() block where we need to insert the code
          const itBlockRegex = /it\(['"](.*?)['"].*?{/;
          const match = originalContent.match(itBlockRegex);
          
          if (match) {
            console.log(`Found it() block at position: ${match.index}`);
            
            // Find the position right after the opening brace + whitespace
            const insertPosition = match.index + match[0].length;
            
            // Check if there's anything inside the it block (ignoring whitespace)
            const afterBrace = originalContent.substring(insertPosition).trim();
            const hasExistingContent = afterBrace.length > 0 && !afterBrace.startsWith('});');
            
            if (hasExistingContent) {
              console.log(`The it() block already has content. Not modifying the file.`);
              // Just copy the file as is
              fs.copyFileSync(sourcePath, destPath);
            } else {
              // Insert the code content after the opening brace of the it block
              const modifiedContent = originalContent.substring(0, insertPosition) + 
                                    '\n' + entry.code + '\n' + 
                                    originalContent.substring(insertPosition);
              
              // Write the modified content to the destination file
              fs.writeFileSync(destPath, modifiedContent);
              console.log(`Modified and copied file: ${destPath}`);
            }
            
            processedCount++;
          } else {
            console.log(`No it() block found in ${sourcePath}`);
            // If no it block is found, just copy the file and append the content
            fs.copyFileSync(sourcePath, destPath);
            console.log(`Copied file: ${destPath} (couldn't find it() block)`);
            processedCount++;
          }
        } else {
          console.log(`Source file ${sourcePath} not found, generating new file`);
          // If the source file doesn't exist, generate a new file with the content
          const testContent = generateCypressTestFile(filePrefix, entry.code);
          fs.writeFileSync(destPath, testContent);
          console.log(`Generated new file: ${destPath} (source file not found)`);
          processedCount++;
        }
      } catch (err) {
        console.error(`Error processing file ${sourcePath}:`, err);
      }
    } else {
      console.log(`Entry ${index + 1} missing output_file or code fields`);
    }
  });
  
  console.log(`Processed ${processedCount} files for model ${modelName}`);
});

console.log('=== TEST GENERATOR COMPLETED ===');

/**
 * Generate a complete Cypress test file with the content placed inside an it() block
 */
function generateCypressTestFile(filePrefix, content) {
  // Convert file prefix to a readable description (e.g., "transaction-feeds11.spec" -> "Transaction Feeds 11")
  const testDescription = filePrefix
    .replace(/\.spec$/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `import Dinero from "dinero.js";
import { User, Transaction, TransactionRequestStatus, TransactionResponseItem, Contact, TransactionStatus } from "../../../src/models";
import { addDays, isWithinInterval, startOfDay } from "date-fns";
import { startOfDayUTC, endOfDayUTC } from "../../../src/utils/transactionUtils";
import { isMobile } from "../../support/utils";

const { _ } = Cypress;

type TransactionFeedsCtx = {
  allUsers?: User[];
  user?: User;
  contactIds?: string[];
};

describe("${testDescription}", function () {
  const ctx: TransactionFeedsCtx = {};
  
  const feedViews = {
    public: {
      tab: "public-tab",
      tabLabel: "everyone",
      routeAlias: "publicTransactions",
      service: "publicTransactionService",
    },
    contacts: {
      tab: "contacts-tab",
      tabLabel: "friends",
      routeAlias: "contactsTransactions",
      service: "contactTransactionService",
    },
    personal: {
      tab: "personal-tab",
      tabLabel: "mine",
      routeAlias: "personalTransactions",
      service: "personalTransactionService",
    },
  };

  beforeEach(function () {
    cy.task("db:seed");
    cy.intercept("GET", "/notifications").as("notifications");
    cy.intercept("GET", "/transactions*").as(feedViews.personal.routeAlias);
    cy.intercept("GET", "/transactions/public*").as(feedViews.public.routeAlias);
    cy.intercept("GET", "/transactions/contacts*").as(feedViews.contacts.routeAlias);
    cy.database("filter", "users").then((users: User[]) => {
      ctx.user = users[0];
      ctx.allUsers = users;
      cy.loginByXstate(ctx.user.username);
    });
  });

  it("${testDescription} test", () => {
${content}
  });
});
`;
}
