"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const simplifed_chat_1 = require("./simplifed-chat");
// This method is called when the extension is activated
function activate(context) {
    console.log('Copilot Chat Automator is now active!');
    // Register command to send a single message
    const sendMessageCommand = vscode.commands.registerCommand('copilot-chat-automator.sendMessage', async () => {
        const message = await vscode.window.showInputBox({
            prompt: 'Enter a message to send to Copilot Chat',
            placeHolder: 'What would you like to ask Copilot?'
        });
        if (message) {
            await simplifed_chat_1.SimplifiedCopilotChat.sendMessage(message);
        }
    });
    // Register command to run an automated session
    const startAutomatedSessionCommand = vscode.commands.registerCommand('copilot-chat-automator.startAutomatedSession', async () => {
        // First, try to get prompts from the user's workspace
        const promptSets = await findPromptSetsInWorkspace();
        if (promptSets.length === 0) {
            // If no prompt sets found, ask user to load a file
            vscode.window.showWarningMessage('No prompt set found. Please load a prompt set file.');
            await vscode.commands.executeCommand('copilot-chat-automator.loadPromptSet');
            return;
        }
        // Let the user pick a prompt set if multiple are available
        let selectedPromptSet;
        if (promptSets.length === 1) {
            selectedPromptSet = promptSets[0];
        }
        else {
            const selection = await vscode.window.showQuickPick(promptSets.map(set => ({
                label: set.name,
                description: `${set.prompts.length} prompts`,
                detail: set.description,
                set: set
            })), { placeHolder: 'Select a prompt set to run' });
            if (!selection)
                return;
            selectedPromptSet = selection.set;
        }
        // Run the selected prompt set
        if (selectedPromptSet && selectedPromptSet.prompts && selectedPromptSet.prompts.length > 0) {
            vscode.window.showInformationMessage(`Running prompt set: ${selectedPromptSet.name}`);
            await simplifed_chat_1.SimplifiedCopilotChat.runPromptSequence(selectedPromptSet.prompts);
        }
        else {
            vscode.window.showErrorMessage('Selected prompt set contains no prompts.');
        }
    });
    // Register command to load a prompt set from a file
    const loadPromptSetCommand = vscode.commands.registerCommand('copilot-chat-automator.loadPromptSet', async () => {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON Files': ['json']
            },
            title: 'Select a prompt set JSON file'
        });
        if (!files || files.length === 0)
            return;
        try {
            const fileContent = fs.readFileSync(files[0].fsPath, 'utf8');
            const promptSet = JSON.parse(fileContent);
            // Validate the prompt set has the required fields
            if (!promptSet.name || !promptSet.prompts || !Array.isArray(promptSet.prompts)) {
                vscode.window.showErrorMessage('Invalid prompt set format. File must contain a name and an array of prompts.');
                return;
            }
            vscode.window.showInformationMessage(`Loaded prompt set: ${promptSet.name} (${promptSet.prompts.length} prompts)`);
            // Run the prompts
            await simplifed_chat_1.SimplifiedCopilotChat.runPromptSequence(promptSet.prompts);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading prompt set: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    // Add commands to subscription
    context.subscriptions.push(sendMessageCommand, startAutomatedSessionCommand, loadPromptSetCommand);
}
exports.activate = activate;
/**
 * Find prompt set JSON files in the workspace
 */
async function findPromptSetsInWorkspace() {
    const promptSets = [];
    // First, look for sample-prompts.json in the extension directory
    try {
        const ext = vscode.extensions.getExtension('user.copilot-chat-automator');
        if (ext) {
            const samplePath = vscode.Uri.joinPath(ext.extensionUri, 'sample-prompts.json');
            try {
                const content = fs.readFileSync(samplePath.fsPath, 'utf8');
                const promptSet = JSON.parse(content);
                if (promptSet.name && promptSet.prompts && Array.isArray(promptSet.prompts)) {
                    promptSets.push(promptSet);
                }
            }
            catch (error) {
                // Ignore errors reading sample file
            }
        }
    }
    catch (error) {
        // Ignore errors accessing extension directory
    }
    // Then search the workspace for any .json files that might be prompt sets
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const jsonFiles = await vscode.workspace.findFiles('**/*.json', '**/node_modules/**');
        for (const file of jsonFiles) {
            try {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                const json = JSON.parse(content);
                // Check if this looks like a prompt set
                if (json.name && json.prompts && Array.isArray(json.prompts)) {
                    promptSets.push(json);
                }
            }
            catch (error) {
                // Ignore files that can't be parsed
            }
        }
    }
    return promptSets;
}
// This method is called when the extension is deactivated
function deactivate() {
    console.log('Copilot Chat Automator is now deactivated!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map