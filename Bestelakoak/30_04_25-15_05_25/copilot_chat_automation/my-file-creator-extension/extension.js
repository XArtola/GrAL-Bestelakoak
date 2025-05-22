const vscode = require('vscode');
const path = require('path'); // Node.js path module
const fs = require('fs'); // Node.js fs module for fallback if workspace.fs is complex for a simple case

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Congratulations, your extension "my-file-creator-extension" is now active!');

    let disposable = vscode.commands.registerCommand('myFileCreator.createFile', async function () {
        const fileName = 'myNewFileFromExtension.txt';
        const fileContent = `Hello from My File Creator Extension!\nCreated at: ${new Date().toISOString()}\nThis file was created programmatically.`;

        let targetPath;

        // Try to get the first workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            targetPath = path.join(workspaceFolders[0].uri.fsPath, fileName);
        } else {
            // Fallback: use a path in the user's home directory or a temp directory
            // For simplicity, let's try to use a path relative to where VS Code might be running from,
            // or a known temp path. This part might need adjustment based on permissions.
            // A more robust fallback would involve asking the user or using vscode.workspace.fs with a scheme.
            // For this example, we'll try a simple fs.writeFileSync to a known location if no workspace.
            // This is less ideal than using vscode.workspace.fs for full VS Code integration.
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            if (homeDir) {
                targetPath = path.join(homeDir, fileName);
                vscode.window.showInformationMessage(`No workspace open. Attempting to save to home directory: ${targetPath}`);
            } else {
                vscode.window.showErrorMessage('Cannot determine a save location: No workspace open and home directory not found.');
                return;
            }
        }

        try {
            // Using vscode.workspace.fs API (preferred for extensions)
            const fileUri = vscode.Uri.file(targetPath);
            const uint8ArrayContent = new TextEncoder().encode(fileContent); // workspace.fs.writeFile expects Uint8Array

            await vscode.workspace.fs.writeFile(fileUri, uint8ArrayContent);
            vscode.window.showInformationMessage(`File created successfully: ${targetPath}`);

            // Optionally, open the newly created file
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create file: ${error.message}`);
            console.error('Error creating file:', error);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
