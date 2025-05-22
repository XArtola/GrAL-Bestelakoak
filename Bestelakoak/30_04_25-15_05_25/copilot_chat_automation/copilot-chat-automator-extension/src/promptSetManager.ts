import * as vscode from 'vscode';
import * as fs from 'fs';
import { PromptSet } from './simplifed-chat';

export class PromptSetManager {
    private context: vscode.ExtensionContext;
    private currentPromptSet: PromptSet | undefined;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    /**
     * Load a prompt set from a file
     * @param uri The URI of the JSON file containing prompts
     */
    public async loadPromptSet(uri: vscode.Uri): Promise<PromptSet> {
        try {
            // Read the file content
            const fileContent = await fs.promises.readFile(uri.fsPath, 'utf8');
            
            // Parse the JSON content
            const promptSet = JSON.parse(fileContent) as PromptSet;
            
            // Validate the prompt set
            this.validatePromptSet(promptSet);
            
            // Store as the current prompt set
            this.currentPromptSet = promptSet;
            
            return promptSet;
        } catch (error) {
            console.error('Error loading prompt set:', error);
            throw new Error(`Failed to load prompt set: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Get the currently loaded prompt set
     */
    public getCurrentPromptSet(): PromptSet | undefined {
        return this.currentPromptSet;
    }
    
    /**
     * Save a new prompt set to a file
     * @param promptSet The prompt set to save
     * @param uri The URI where to save the prompt set
     */
    public async savePromptSet(promptSet: PromptSet, uri: vscode.Uri): Promise<void> {
        try {
            // Validate the prompt set
            this.validatePromptSet(promptSet);
            
            // Convert to JSON and save
            const fileContent = JSON.stringify(promptSet, null, 2);
            await fs.promises.writeFile(uri.fsPath, fileContent, 'utf8');
            
            // Update current prompt set
            this.currentPromptSet = promptSet;
        } catch (error) {
            console.error('Error saving prompt set:', error);
            throw new Error(`Failed to save prompt set: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Create a new empty prompt set
     */
    public createEmptyPromptSet(): PromptSet {
        return {
            name: 'New Prompt Set',
            description: 'A new set of prompts for Copilot Chat',
            prompts: []
        };
    }
    
    /**
     * Add a prompt to the current prompt set
     * @param prompt The prompt to add
     */
    public addPromptToCurrentSet(prompt: string): void {
        if (!this.currentPromptSet) {
            this.currentPromptSet = this.createEmptyPromptSet();
        }
        
        this.currentPromptSet.prompts.push(prompt);
    }
    
    /**
     * Validate that a prompt set has the required properties
     * @param promptSet The prompt set to validate
     */
    private validatePromptSet(promptSet: any): void {
        if (!promptSet) {
            throw new Error('Prompt set is empty or null');
        }
        
        if (!promptSet.name || typeof promptSet.name !== 'string') {
            throw new Error('Prompt set must have a name property of type string');
        }
        
        if (!promptSet.prompts || !Array.isArray(promptSet.prompts)) {
            throw new Error('Prompt set must have a prompts property of type array');
        }
        
        for (const prompt of promptSet.prompts) {
            if (typeof prompt !== 'string') {
                throw new Error('All prompts in the prompt set must be strings');
            }
        }
    }
}
