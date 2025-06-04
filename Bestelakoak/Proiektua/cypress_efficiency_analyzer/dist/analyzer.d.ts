import { TestMetricsResult, TestFile } from './types';
/**
 * Process a test file using real AST analysis to detect actionable commands
 */
export declare function analyzeFile(filePath: string, actionableCommands?: string[], excludedCommands?: string[]): TestFile & {
    error?: string;
    errorDetails?: any;
};
export declare function analyzeFiles(filePaths: string[], actionableCommands?: string[], excludedCommands?: string[]): TestMetricsResult;
