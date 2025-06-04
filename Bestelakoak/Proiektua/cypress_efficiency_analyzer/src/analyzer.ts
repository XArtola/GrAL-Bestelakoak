import * as fs from 'fs';
import * as path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { TestMetricsResult, TestFile, VisitorContext } from './types';

// Default lists of actionable and excluded commands
const DEFAULT_ACTIONABLE_COMMANDS = [
  'visit',
  'click',
  'type',
  'clear',
  'blur',
  'focus',
  'select',
  'check',
  'uncheck',
  'submit',
  'login',
  'createTransaction',
  'switchUserByXstate',
  'loginByXstate'
];

const DEFAULT_EXCLUDED_COMMANDS = [
  'get',
  'find',
  'should',
  'wait',
  'location',
  'contains',
  'its',
  'then',
  'and',
  'intercept',
  'task',
  'database',
  'getBySel',
  'getBySelLike',
  'getCookie',
  'visualSnapshot'
];

/**
 * Alternative approach: Use regex to directly find actionable commands in the file
 * This can help catch commands that might be missed by AST parsing
 */
function countCommandsWithRegex(content: string, testName: string, actionableCommands: Set<string>): {commands: string[], count: number} {
  const commands: string[] = [];
  let count = 0;
  
  // Create a regex pattern for all actionable commands
  const commandsArray = Array.from(actionableCommands);
  const pattern = new RegExp(`\\.(${commandsArray.join('|')})\\(`, 'g');
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const command = match[1];
    if (command) {
      commands.push(command);
      count++;
    }
  }

  // Also look for direct cy.command() calls
  const cyPattern = new RegExp(`cy\\.(${commandsArray.join('|')})\\(`, 'g');
  while ((match = cyPattern.exec(content)) !== null) {
    const command = match[1];
    if (command) {
      commands.push(command);
      count++;
    }
  }
  
  return { commands, count };
}

/**
 * Extract test blocks with their content from the file using regex
 * This helps us associate commands with specific test blocks
 */
function extractTestBlocks(content: string): Record<string, string> {
  const testBlocks: Record<string, string> = {};
  
  // Try multiple patterns to catch different test syntaxes
  const patterns = [
    // Arrow functions: it("test", () => { ... })
    /it\s*\(\s*["'](.*?)["']\s*,\s*\(\s*\)\s*=>\s*\{([\s\S]*?)^\s*\}\s*\)/gm,
    // Regular functions: it("test", function() { ... })
    /it\s*\(\s*["'](.*?)["']\s*,\s*function\s*\(\s*\)\s*\{([\s\S]*?)^\s*\}\s*\)/gm,
    // Async arrow functions: it("test", async () => { ... })
    /it\s*\(\s*["'](.*?)["']\s*,\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)^\s*\}\s*\)/gm,
    // Simple pattern that captures content between braces
    /it\s*\(\s*["'](.*?)["']\s*,[\s\S]*?\{([\s\S]*?)(?=\n\s*\}\s*(?:\)|;))/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const testName = match[1];
      const testContent = match[2];
      if (testName && testContent && !testBlocks[testName]) {
        testBlocks[testName] = testContent;
      }
    }
  }
  
  // If no patterns worked, try a simpler approach
  if (Object.keys(testBlocks).length === 0) {
    const simplePattern = /it\s*\(\s*["'](.*?)["']/g;
    let match;
    while ((match = simplePattern.exec(content)) !== null) {
      const testName = match[1];
      if (testName) {
        // Get content after the test declaration
        const startIndex = match.index + match[0].length;
        const remainingContent = content.substring(startIndex);
        testBlocks[testName] = remainingContent.substring(0, Math.min(1000, remainingContent.length));
      }
    }
  }
  
  return testBlocks;
}

/**
 * Process a test file using real AST analysis to detect actionable commands
 */
export function analyzeFile(filePath: string, actionableCommands?: string[], excludedCommands?: string[]): TestFile & { error?: string; errorDetails?: any } {
  let content: string;
  const filename = path.basename(filePath);
  
  // First, safely read the file
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (readError: any) {
    console.error(`❌ Failed to read file ${filename}: ${readError.message}`);
    return {
      totalTests: 0,
      tests: {},
      error: `File read error: ${readError.message}`,
      errorDetails: { readError: readError.message, filename }
    };
  }
  
  console.log(`Performing real AST analysis for ${filename}`);
  
  // Try AST parsing
  try {
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript', 
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'functionSent',
        'dynamicImport'
      ],
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      allowUndeclaredExports: true,
      strictMode: false
    });

    const context: VisitorContext = {
      currentTestName: null,
      currentFilePath: filename,
      testFiles: {},
      actionableCommands: new Set(actionableCommands || DEFAULT_ACTIONABLE_COMMANDS),
      excludedCommands: new Set(excludedCommands || DEFAULT_EXCLUDED_COMMANDS)
    };
    
    context.testFiles[filename] = {
      totalTests: 0,
      tests: {}
    };
    
    let testOrder = 0;
    
    traverse(ast, {
      CallExpression: {
        enter(path) {
          // Handle it() blocks
          if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'it') {
            if (path.node.arguments.length >= 1 && t.isStringLiteral(path.node.arguments[0])) {
              const testName = path.node.arguments[0].value;
              
              // Skip test names that look like API routes or aliases
              if (testName.startsWith('@') || testName.startsWith('/')) {
                return;
              }
              
              testOrder++;
              context.currentTestName = testName;
              
              context.testFiles[filename].tests[testName] = {
                orderInFile: testOrder,
                actionableCommands: 0,
                commands: []
              };
              context.testFiles[filename].totalTests++;
            }
          }
          // Handle direct cy.command() calls
          else if (
            context.currentTestName &&
            t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object) &&
            path.node.callee.object.name === 'cy' &&
            t.isIdentifier(path.node.callee.property)
          ) {
            const commandName = path.node.callee.property.name;
            
            if (context.actionableCommands.has(commandName)) {
              context.testFiles[filename].tests[context.currentTestName].actionableCommands++;
              context.testFiles[filename].tests[context.currentTestName].commands.push(commandName);
            }
          }
          // Handle chained commands like .click(), .type(), etc.
          else if (context.currentTestName && t.isMemberExpression(path.node.callee)) {
            const commandName = t.isIdentifier(path.node.callee.property) 
              ? path.node.callee.property.name 
              : null;
            
            if (commandName && context.actionableCommands.has(commandName)) {
              // Check if this is part of a Cypress chain by looking for cy in the chain
              let current = path.node.callee.object;
              let isCypressChain = false;
              
              // Traverse up the chain to see if it starts with cy
              while (current && !isCypressChain) {
                if (t.isIdentifier(current) && current.name === 'cy') {
                  isCypressChain = true;
                } else if (t.isMemberExpression(current)) {
                  current = current.object;
                } else if (t.isCallExpression(current) && t.isMemberExpression(current.callee)) {
                  current = current.callee.object;
                } else {
                  break;
                }
              }
              
              if (isCypressChain) {
                context.testFiles[filename].tests[context.currentTestName].actionableCommands++;
                context.testFiles[filename].tests[context.currentTestName].commands.push(commandName);
              }
            }
          }
        },
        exit(path) {
          if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'it') {
            context.currentTestName = null;
          }
        }
      }
    });
    
    return context.testFiles[filename];
  } catch (astError: any) {
    console.error(`AST parsing failed for ${filename}: ${astError.message || astError}`);
    console.log(`Falling back to regex-based analysis for ${filename}...`);
    
    // Fallback to regex-based analysis
    try {
      const actionableCommandsSet = new Set(actionableCommands || DEFAULT_ACTIONABLE_COMMANDS);
      const testBlocks = extractTestBlocks(content);
      
      const result: TestFile = {
        totalTests: 0,
        tests: {}
      };
      
      if (Object.keys(testBlocks).length === 0) {
        console.log(`No test blocks found in ${filename}, analyzing entire file content...`);
        // Analyze entire file content if no test blocks found
        const { commands, count } = countCommandsWithRegex(content, 'unknown test', actionableCommandsSet);
        if (count > 0) {
          result.tests['unknown test'] = {
            orderInFile: 1,
            actionableCommands: count,
            commands: commands
          };
          result.totalTests = 1;
        }
      } else {
        let testOrder = 0;
        Object.entries(testBlocks).forEach(([testName, testContent]) => {
          testOrder++;
          const { commands, count } = countCommandsWithRegex(testContent, testName, actionableCommandsSet);
          
          result.tests[testName] = {
            orderInFile: testOrder,
            actionableCommands: count,
            commands: commands
          };
          result.totalTests++;
        });
      }
      
      console.log(`✅ Successfully analyzed ${filename} using regex fallback (found ${result.totalTests} tests)`);
      return result;
    } catch (fallbackError: any) {
      console.error(`Regex analysis also failed for ${filename}: ${fallbackError.message || fallbackError}`);
      console.log(`⚠️ Returning empty result for ${filename} and continuing...`);
      
      // Return structure with error information
      return {
        totalTests: 0,
        tests: {},
        error: `All analysis methods failed: ${astError.message || astError}`,
        errorDetails: {
          astError: astError.message || String(astError),
          fallbackError: fallbackError.message || String(fallbackError),
          line: astError.loc?.line,
          column: astError.loc?.column,
          filename: filename
        }
      };
    }
  }
}

export function analyzeFiles(filePaths: string[], actionableCommands?: string[], excludedCommands?: string[]): TestMetricsResult {
  const testFiles: Record<string, TestFile & { error?: string; errorDetails?: any }> = {};
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`Starting analysis of ${filePaths.length} files...`);
  
  // Process each file with comprehensive error handling
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const filename = path.basename(filePath);
    
    try {
      console.log(`[${i + 1}/${filePaths.length}] Analyzing ${filename}...`);
      const result = analyzeFile(filePath, actionableCommands, excludedCommands);
      testFiles[filename] = result;
      
      if ('error' in result && result.error) {
        errorCount++;
        console.log(`❌ ${filename}: Analysis failed but continuing...`);
      } else {
        successCount++;
        console.log(`✅ ${filename}: Successfully analyzed (${result.totalTests} tests)`);
      }
    } catch (unexpectedError: any) {
      console.error(`💥 Unexpected error analyzing ${filename}: ${unexpectedError.message || unexpectedError}`);
      console.error(`Stack trace:`, unexpectedError.stack);
      errorCount++;
      
      // Continue with next file - add empty result with error info
      testFiles[filename] = {
        totalTests: 0,
        tests: {},
        error: `Unexpected error: ${unexpectedError.message || unexpectedError}`,
        errorDetails: {
          unexpectedError: unexpectedError.message || String(unexpectedError),
          stack: unexpectedError.stack,
          filename: filename
        }
      };
      
      console.log(`Continuing with next file...`);
    }
  }
  
  console.log(`\n📊 Analysis complete: ${successCount} files successful, ${errorCount} files with errors`);
  
  // Generate summary statistics
  const summary = calculateSummary(testFiles);
  
  return {
    testFiles,
    summary,
    actionableCommandTypes: actionableCommands || DEFAULT_ACTIONABLE_COMMANDS,
    excludedCommands: excludedCommands || DEFAULT_EXCLUDED_COMMANDS
  };
}

function calculateSummary(testFiles: Record<string, TestFile & { error?: string; errorDetails?: any }>) {
  // Always calculate summary from actual analysis - no hardcoded values
  let totalTestCases = 0;
  let totalActionableCommands = 0;
  const fileBreakdown: Record<string, { actionableCommands: number; itBlockCount: number }> = {};
  
  Object.entries(testFiles).forEach(([filename, fileData]) => {
    // Skip files with errors when calculating summary
    if (!fileData.error) {
      totalTestCases += fileData.totalTests;
      let fileCommands = 0;
      
      Object.values(fileData.tests).forEach(test => {
        totalActionableCommands += test.actionableCommands;
        fileCommands += test.actionableCommands;
      });
      
      fileBreakdown[filename] = {
        actionableCommands: fileCommands,
        itBlockCount: fileData.totalTests
      };
    } else {
      // Include error files in breakdown with 0 values
      fileBreakdown[filename] = {
        actionableCommands: 0,
        itBlockCount: 0
      };
    }
  });
  
  return {
    totalTestFiles: Object.keys(testFiles).length,
    totalTestCases,
    totalActionableCommands,
    averageCommandsPerTest: totalTestCases > 0 
      ? parseFloat((totalActionableCommands / totalTestCases).toFixed(2)) 
      : 0,
    fileBreakdown
  };
}
