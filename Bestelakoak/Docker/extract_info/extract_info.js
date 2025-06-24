const fs = require('fs');
const path = require('path');

// Function to recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Function to extract information from a file
function extractInformation(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Extract key-value pairs (like firstName: "Bob", password: "s3cret")
    const keyValuePairs = {};
    const keyValueRegex = /(\w+)\s*[:=]\s*["']([^"']*)["']/g;
    let match;
    while ((match = keyValueRegex.exec(content)) !== null) {
      keyValuePairs[match[1]] = match[2];
    }
    
    // Extract email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emails = [];
    while ((match = emailRegex.exec(content)) !== null) {
      emails.push(match[0]);
    }
    if (emails.length > 0) {
      keyValuePairs.emails = [...new Set(emails)]; // Using Set to get unique emails
    }
    
    // Extract variables with curly braces format
    const curlyBraceRegex = /\{([^{}]*)\}/g;
    const curlyBraceVars = [];
    while ((match = curlyBraceRegex.exec(content)) !== null) {
      curlyBraceVars.push(match[0]);
    }
    if (curlyBraceVars.length > 0) {
      keyValuePairs.curlyBraceVariables = curlyBraceVars;
    }
    
    if (Object.keys(keyValuePairs).length > 0) {
      return { fileName, info: keyValuePairs };
    } else {
      return { fileName, info: null };
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return { fileName: path.basename(filePath), info: null };
  }
}

// Main function
function main() {
  const testsPath = path.join(__dirname, 'tests');
  
  // Check if tests directory exists
  if (!fs.existsSync(testsPath)) {
    console.error("Tests directory not found!");
    return;
  }
  
  // Get all files in tests directory
  const allFiles = getAllFiles(testsPath);
  
  // Extract information from all files
  const extractedInfo = {};
  allFiles.forEach(filePath => {
    const { fileName, info } = extractInformation(filePath);
    extractedInfo[fileName] = info || fileName; // If no info, just save the filename
  });
  
  // Write to JSON file
  const outputPath = path.join(testsPath, 'extracted_information.json');
  fs.writeFileSync(outputPath, JSON.stringify(extractedInfo, null, 2), 'utf8');
  
  console.log(`Information extracted and saved to ${outputPath}`);
}

main();
