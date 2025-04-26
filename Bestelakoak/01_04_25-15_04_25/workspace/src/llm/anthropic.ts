import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMClient } from './base';
import { FileContext, LLMResponse } from '../types';

export class AnthropicClient extends BaseLLMClient {
    private client: Anthropic;

    constructor(apiKey: string) {
        super({ anthropicApiKey: apiKey });
        this.client = new Anthropic({ apiKey });
    }

    async generateWithContext(prompt: string, fileContexts: FileContext[]): Promise<LLMResponse> {
        const formattedPrompt = this.formatContextPrompt(prompt, fileContexts);
        
        const message = await this.client.messages.create({
            model: this.config.model || 'claude-3-opus-20240229',
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature || 0.7,
            messages: [{ role: 'user', content: formattedPrompt }],
        });

        return {
            content: message.content[0].text,
            model: message.model,
            usage: {
                promptTokens: 0, // Anthropic doesn't provide token counts in the same way
                completionTokens: 0,
                totalTokens: 0,
            },
        };
    }
}