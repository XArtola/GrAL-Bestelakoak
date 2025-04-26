import OpenAI from 'openai';
import { BaseLLMClient } from './base';
import { FileContext, LLMResponse } from '../types';

export class OpenAIClient extends BaseLLMClient {
    private client: OpenAI;

    constructor(apiKey: string) {
        super({ openaiApiKey: apiKey });
        this.client = new OpenAI({ apiKey });
    }

    async generateWithContext(prompt: string, fileContexts: FileContext[]): Promise<LLMResponse> {
        const formattedPrompt = this.formatContextPrompt(prompt, fileContexts);
        
        const completion = await this.client.chat.completions.create({
            messages: [{ role: 'user', content: formattedPrompt }],
            model: this.config.model || 'gpt-4',
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens,
        });

        return {
            content: completion.choices[0].message.content || '',
            model: completion.model,
            usage: {
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0,
            },
        };
    }
}