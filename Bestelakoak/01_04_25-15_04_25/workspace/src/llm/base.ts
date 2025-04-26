import { FileContext, LLMConfig, LLMResponse } from '../types';

export abstract class BaseLLMClient {
    protected config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    abstract generateWithContext(
        prompt: string,
        fileContexts: FileContext[]
    ): Promise<LLMResponse>;

    protected formatContextPrompt(prompt: string, fileContexts: FileContext[]): string {
        const contextStr = fileContexts
            .map(ctx => `File: ${ctx.path}\n\`\`\`\n${ctx.content}\n\`\`\`\n`)
            .join('\n');
        
        return `You are provided with the following file contexts:\n\n${contextStr}\n\nBased on these files, ${prompt}`;
    }
}