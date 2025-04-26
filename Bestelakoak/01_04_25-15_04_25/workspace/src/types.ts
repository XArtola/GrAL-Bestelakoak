export interface LLMConfig {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface FileContext {
    path: string;
    content: string;
}

export interface LLMResponse {
    content: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}