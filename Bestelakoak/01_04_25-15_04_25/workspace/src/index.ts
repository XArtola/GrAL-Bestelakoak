import { config } from 'dotenv-safe';
import { OpenAIClient } from './llm/openai';
import { AnthropicClient } from './llm/anthropic';
import { FileContext } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
config();

async function loadFileContext(filePath: string): Promise<FileContext> {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
        path: filePath,
        content,
    };
}

async function main() {
    // Example: Load some files as context
    const fileContexts = await Promise.all([
        loadFileContext('path/to/your/file1.ts'),
        loadFileContext('path/to/your/file2.ts'),
    ]);

    // Example using OpenAI
    const openaiClient = new OpenAIClient(process.env.OPENAI_API_KEY!);
    const openaiResponse = await openaiClient.generateWithContext(
        'What are the main classes and their purposes in these files?',
        fileContexts
    );
    console.log('OpenAI Response:', openaiResponse);

    // Example using Anthropic/Claude
    const anthropicClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY!);
    const anthropicResponse = await anthropicClient.generateWithContext(
        'What are the main classes and their purposes in these files?',
        fileContexts
    );
    console.log('Anthropic Response:', anthropicResponse);
}

main().catch(console.error);