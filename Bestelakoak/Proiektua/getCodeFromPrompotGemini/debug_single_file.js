// Debug script to test a specific file pattern
const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// Read the specific problematic file
const filePath = '../pywinauto/output_claude_3_5_sonnet/transaction-view5.spec_response_claude_3_5_sonnet_20250520_210411.txt';
const fileContent = fs.readFileSync(filePath, 'utf8');

console.log("=== DEBUGGING SINGLE FILE ===");
console.log(`File: ${filePath}`);
console.log(`Total file length: ${fileContent.length} characters`);

// Extract blockquote content
const blockquoteLines = fileContent
    .split('\n')
    .filter(line => line.trim().startsWith('>'))
    .map(line => line.replace(/^>\s?/, ''));

const blockquoteContent = blockquoteLines.join('\n');
console.log(`\nBlockquote content length: ${blockquoteContent.length} characters`);

// Test different regex patterns
console.log("\n=== TESTING REGEX PATTERNS ===");

// Pattern 1: <generated_code> tags
const generatedCodeRegex = /<generated_code>\s*([\s\S]*?)\s*<\/generated_code>/;
const generatedMatch = blockquoteContent.match(generatedCodeRegex);
console.log(`1. <generated_code> pattern: ${generatedMatch ? 'FOUND' : 'NOT FOUND'}`);

// Pattern 2: Current pattern
const currentRegex = /```(?:typescript|ts)\s*([\s\S]*?)\s*```/;
const currentMatch = blockquoteContent.match(currentRegex);
console.log(`2. Current TS pattern: ${currentMatch ? 'FOUND' : 'NOT FOUND'}`);

if (currentMatch) {
    console.log(`   Extracted length: ${currentMatch[1].length} characters`);
    console.log(`   First 100 chars: "${currentMatch[1].substring(0, 100)}..."`);
}

// Pattern 3: More flexible pattern
const flexibleRegex = /```typescript\s*([\s\S]*?)```/;
const flexibleMatch = blockquoteContent.match(flexibleRegex);
console.log(`3. Flexible TS pattern: ${flexibleMatch ? 'FOUND' : 'NOT FOUND'}`);

if (flexibleMatch) {
    console.log(`   Extracted length: ${flexibleMatch[1].length} characters`);
    console.log(`   First 100 chars: "${flexibleMatch[1].substring(0, 100)}..."`);
}

// Pattern 4: Debug what's actually around the code block
const debugRegex = /```typescript([\s\S]*?)```/;
const debugMatch = blockquoteContent.match(debugRegex);
console.log(`4. Debug pattern: ${debugMatch ? 'FOUND' : 'NOT FOUND'}`);

if (debugMatch) {
    console.log(`   Raw match: "${debugMatch[0].substring(0, 200)}..."`);
    console.log(`   Code part: "${debugMatch[1].substring(0, 200)}..."`);
    
    // Try to parse it
    try {
        const ast = parser.parse(debugMatch[1], {
            sourceType: "module",
            plugins: ["typescript"]
        });
        console.log("   ✅ Parsing successful!");
        
        // Look for it() blocks
        let foundIt = false;
        traverse(ast, {
            CallExpression(path) {
                const callee = path.get('callee');
                if (callee.isIdentifier({ name: 'it' })) {
                    foundIt = true;
                    console.log(`   ✅ Found it() block: "${path.node.arguments[0]?.value}"`);
                }
            }
        });
        
        if (!foundIt) {
            console.log("   ⚠️ No it() blocks found");
        }
        
    } catch (error) {
        console.log(`   ❌ Parsing failed: ${error.message}`);
    }
}

// Show some context around the code block
console.log("\n=== CONTEXT AROUND CODE BLOCK ===");
const lines = blockquoteContent.split('\n');
const tsIndex = lines.findIndex(line => line.includes('```typescript'));
if (tsIndex >= 0) {
    console.log("Lines around ```typescript:");
    for (let i = Math.max(0, tsIndex - 2); i <= Math.min(lines.length - 1, tsIndex + 5); i++) {
        console.log(`${i}: "${lines[i]}"`);
    }
}
