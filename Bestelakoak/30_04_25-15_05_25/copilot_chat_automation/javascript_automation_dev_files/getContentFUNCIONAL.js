/**
 * Function to extract content from the currently active editor in VS Code
 * Run this in the Developer Tools console of VS Code
 */
function getVSCodeEditorContent() {
    try {
        // Method 1: Try to access through Monaco Editor's current instance
        // This is more reliable than looking at models
        const editors = Array.from(document.querySelectorAll('.monaco-editor'))
            .filter(editor => editor.classList.contains('focused') || 
                   editor.closest('.editor-instance.active'));
        
        if (editors.length > 0) {
            // Try to get the editor instance directly
            const editorElement = editors[0];
            const editorInstance = editorElement.__proto__.constructor._instances?.find(
                instance => instance.domNode === editorElement
            );
            
            if (editorInstance?.getModel) {
                const model = editorInstance.getModel();
                if (model) {
                    const content = model.getValue();
                    console.log("Content retrieved directly from editor instance!");
                    copyToClipboard(content);
                    logFormattedContent(content);
                    return content;
                }
            }
        }
        
        // Method 2: Use standard Monaco API
        if (typeof monaco !== 'undefined' && monaco.editor) {
            // Try to find the active model
            const models = monaco.editor.getModels();
            if (models.length > 0) {
                // Try to get the focused editor's model
                const activeEditor = monaco.editor.getEditors().find(e => e.hasTextFocus());
                const activeModel = activeEditor ? activeEditor.getModel() : models[0];
                const content = activeModel.getValue();
                console.log("Content retrieved from Monaco API successfully!");
                copyToClipboard(content);
                logFormattedContent(content);
                return content;
            }
        }

        // Method 3: Try to access through VS Code API
        if (typeof require === 'function') {
            try {
                const vscode = require('vscode');
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const document = editor.document;
                    const content = document.getText();
                    console.log("Content retrieved through VS Code API!");
                    copyToClipboard(content);
                    logFormattedContent(content);
                    return content;
                }
            } catch (e) {
                console.log("VS Code API not available in this context");
            }
        }

        // Method 4: Extract from textareas (for simple editors)
        const textareas = document.querySelectorAll('textarea.inputarea');
        if (textareas.length > 0) {
            const textarea = Array.from(textareas).find(t => 
                t.closest('.monaco-editor')?.classList.contains('focused')
            ) || textareas[0];
            
            // For some editor implementations, there might be a model attached to the textarea
            if (textarea._modelData?.model) {
                const content = textarea._modelData.model.getValue();
                console.log("Content retrieved from textarea model!");
                copyToClipboard(content);
                logFormattedContent(content);
                return content;
            }
        }

        // Method 5: Enhanced DOM method - more accurate line collection
        const activeEditor = document.querySelector('.monaco-editor.focused') || 
                            document.querySelector('.monaco-editor');
        if (activeEditor) {
            // Get all lines including those scrolled out of view
            const contentWidget = activeEditor.querySelector('.monaco-editor-background')?.parentElement;
            if (contentWidget) {
                // Try to get the lines container that has all content
                const linesContent = contentWidget.querySelector('.view-lines');
                if (linesContent) {
                    // Force rendering all lines if possible
                    if (linesContent._lines) {
                        const allLines = Array.from({ length: linesContent._lines.length })
                            .map((_, i) => linesContent._lines[i]?.textContent || '')
                            .join('\n');
                        console.log("Content retrieved from all lines data structure!");
                        copyToClipboard(allLines);
                        logFormattedContent(allLines);
                        return allLines;
                    }
                    
                    // Get visible lines as a fallback
                    const lines = Array.from(linesContent.querySelectorAll('.view-line'));
                    if (lines.length > 0) {
                        // Sort lines by their vertical position to ensure correct order
                        lines.sort((a, b) => {
                            const aTop = parseInt(a.style.top || '0');
                            const bTop = parseInt(b.style.top || '0');
                            return aTop - bTop;
                        });
                        
                        const content = lines.map(line => line.textContent).join('\n');
                        console.log("Content retrieved from sorted DOM elements!");
                        copyToClipboard(content);
                        logFormattedContent(content);
                        return content;
                    }
                }
            }
        }

        console.error("Could not find editor content through any method");
        return null;
    } catch (e) {
        console.error("Error getting editor content:", e);
        return null;
    }
}

// Helper function to copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => console.log('✓ Content copied to clipboard!'))
        .catch(err => console.error('Failed to copy to clipboard:', err));
}

// Helper function to display formatted content with proper line breaks in the console
function logFormattedContent(text) {
    if (!text) return;
    
    console.log("\n--- EDITOR CONTENT START ---");
    // Split by newline and log each line separately
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        console.log(`${index + 1}: ${line}`);
    });
    console.log("--- EDITOR CONTENT END ---\n");
    
    // Also log as a formatted block in case the console supports it
    console.log("%c Full formatted content:", "font-weight: bold; color: #4CAF50;");
    console.log(text);
}

// Execute immediately when pasted into console
getVSCodeEditorContent();
