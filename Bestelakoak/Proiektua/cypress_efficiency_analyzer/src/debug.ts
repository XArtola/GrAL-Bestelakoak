#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * This is a simple debug tool to analyze a Cypress test file and report all method calls
 * to help identify why clicks aren't being counted correctly.
 */

const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path as an argument');
  process.exit(1);
}

try {
  console.log(`Debugging file: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Use regex to find potential click calls
  const clickRegex = /\.(click|type|blur|focus|select|check|uncheck)\(/g;
  let match;
  const matches = [];
  while ((match = clickRegex.exec(content)) !== null) {
    matches.push({
      command: match[1],
      position: match.index,
      context: content.substring(Math.max(0, match.index - 30), match.index + 40)
    });
  }
  
  console.log(`Found ${matches.length} potential actionable commands via regex:`);
  matches.forEach((m, i) => {
    console.log(`${i+1}. ${m.command} at position ${m.position}: ${m.context}`);
  });
  
  // Parse with AST for more detailed analysis
  const ast = parser.parse(content, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
  
  console.log('\nAnalyzing AST for all method calls:');
interface RegexMatch {
    command: string;
    position: number;
    context: string;
}

interface MethodCall {
    name: string;
    loc: string;
}

const methodCalls: MethodCall[] = [];
  
  traverse(ast, {
    CallExpression(path) {
      if (t.isMemberExpression(path.node.callee)) {
        const prop = path.node.callee.property;
        if (t.isIdentifier(prop)) {
          methodCalls.push({
            name: prop.name,
            loc: path.node.loc ? `${path.node.loc.start.line}:${path.node.loc.start.column}` : 'unknown'
          });
        }
      }
    }
  });
  
  console.log('\nFound method calls:');
  const methodCounts: Record<string, number> = {};
  methodCalls.forEach(call => {
    methodCounts[call.name] = (methodCounts[call.name] || 0) + 1;
  });
  
  Object.entries(methodCounts)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`${name}: ${count} occurrences`);
    });
  
} catch (err) {
  console.error('Error analyzing file:', err);
}
