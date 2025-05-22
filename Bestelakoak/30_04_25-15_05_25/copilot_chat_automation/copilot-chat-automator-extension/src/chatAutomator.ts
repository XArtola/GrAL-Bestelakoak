import * as vscode from 'vscode';

/**
 * A simplified class for interacting with GitHub Copilot Chat
 */
export class SimplifiedCopilotChat {
    /**
     * Opens the Copilot Chat panel and sends a message
     */
    public static async sendMessage(message: string): Promise<void> {
        try {
            // First, show a notification that we're attempting to send a message
            vscode.window.showInformationMessage(`Sending to Copilot: "${message.length > 30 ? message.substring(0, 30) + '...' : message}"`);
            
            // Step 1: Check if GitHub Copilot Chat extension is installed
            const extension = vscode.extensions.getExtension('GitHub.copilot-chat');
            if (!extension) {
                vscode.window.showErrorMessage('GitHub Copilot Chat extension is not installed.');
                return;
            }
            
            // Step 2: Make sure the extension is activated
            if (!extension.isActive) {
                await extension.activate();
                await SimplifiedCopilotChat.delay(1000); // Wait for activation to complete
            }
            
            // Step 3: Copy message to clipboard for easier pasting
            await vscode.env.clipboard.writeText(message);
            
            // Step 4: Try to open Copilot Chat
            try {
                await vscode.commands.executeCommand('github.copilot.chat.focus');
                vscode.window.showInformationMessage('Copilot Chat panel opened. Message copied to clipboard.');
            } catch (error) {
                // Try alternative command
                try {
                    await vscode.commands.executeCommand('workbench.action.chat.open');
                } catch (error2) {
                    vscode.window.showWarningMessage('Could not open Copilot Chat automatically. Please open it manually.');
                }
            }
            
            // Final notification to user
            vscode.window.showInformationMessage(
                'Message copied to clipboard. Please paste it into the Copilot Chat input box if it was not sent automatically.',
                'OK'
            );
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Run a series of messages in sequence
     */
    public static async runPromptSequence(prompts: string[]): Promise<void> {
        if (!prompts || prompts.length === 0) {
            vscode.window.showWarningMessage('No prompts provided to run.');
            return;
        }
        
        const totalPrompts = prompts.length;
        vscode.window.showInformationMessage(`Starting to process ${totalPrompts} prompts...`);
        
        // Show a progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Running ${totalPrompts} prompts in Copilot Chat`,
            cancellable: true
        }, async (progress, token) => {
            for (let i = 0; i < prompts.length; i++) {
                if (token.isCancellationRequested) {
                    vscode.window.showInformationMessage('Prompt sequence cancelled.');
                    break;
                }
                
                const prompt = prompts[i];
                progress.report({ 
                    message: `Processing prompt ${i+1}/${totalPrompts}`,
                    increment: (100 / totalPrompts)
                });
                
                // Send the current prompt
                await SimplifiedCopilotChat.sendMessage(prompt);
                
                // Wait before sending the next prompt (3 seconds)
                if (i < prompts.length - 1) {
                    await SimplifiedCopilotChat.delay(3000);
                }
            }
            
            vscode.window.showInformationMessage(`Completed processing ${totalPrompts} prompts.`);
            return;
        });
    }
    
    /**
     * Helper method to introduce a delay
     */
    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
