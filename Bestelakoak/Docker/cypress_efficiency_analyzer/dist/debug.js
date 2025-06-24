#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
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
        console.log(`${i + 1}. ${m.command} at position ${m.position}: ${m.context}`);
    });
    // Parse with AST for more detailed analysis
    const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    });
    console.log('\nAnalyzing AST for all method calls:');
    const methodCalls = [];
    (0, traverse_1.default)(ast, {
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
    const methodCounts = {};
    methodCalls.forEach(call => {
        methodCounts[call.name] = (methodCounts[call.name] || 0) + 1;
    });
    Object.entries(methodCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
        console.log(`${name}: ${count} occurrences`);
    });
}
catch (err) {
    console.error('Error analyzing file:', err);
}
