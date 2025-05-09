/**
 * Robust script to extract content from VS Code editor with multiple fallback methods
 * Run this in the Developer Tools console of VS Code
 */
(function() {
    console.log("VS Code Content Extractor starting...");
    console.log("Environment info:", navigator.userAgent);
    
    function findMonacoEditor() {
        // Check if monaco exists directly in window
        if (typeof monaco !== 'undefined' && monaco.editor) {
            console.log("Monaco editor found via global monaco object");
            return { type: "monaco", editor: monaco.editor };
        }
        
        // Check if it's available as a property on window
        for (const prop of Object.getOwnPropertyNames(window)) {
            try {
                const obj = window[prop];
                if (obj && obj.editor && typeof obj.editor.getModels === 'function') {
                    console.log(`Monaco editor found via window.${prop}`);
                    return { type: "monaco", editor: obj.editor };
                }
            } catch (e) {
                // Skip properties that throw errors on access
            }
        }
        
        // Look for editor DOM elements
        const editorElements = document.querySelectorAll('.monaco-editor');
        if (editorElements.length > 0) {
            console.log(`Found ${editorElements.length} Monaco editor DOM elements`);
            
            // Try to find editor instance from DOM
            for (const editorElement of editorElements) {
                // Check if we can find a CodeEditor instance
                try {
                    if (editorElement._standaloneKeybindingService?.moduleId === 'vs/editor/standalone/browser/simpleServices') {
                        console.log("Found editor via DOM element with keybinding service");
                        return { type: "dom", element: editorElement };
                    }
                    
                    // Look for editor internal properties
                    for (const key of Object.keys(editorElement)) {
                        if (key.startsWith('__') && editorElement[key] && editorElement[key].getModel) {
                            console.log(`Found editor instance via DOM element property ${key}`);
                            return { type: "instance", instance: editorElement[key] };
                        }
                    }
                } catch (e) {
                    // Continue checking other properties
                }
            }
            
            // If we found editor elements but no API, return the DOM element for fallback methods
            return { type: "dom", element: editorElements[0] };
        }
        
        return null;
    }
    
    // Print diagnostic information about the environment
    function printDiagnostics() {
        console.log("--- Diagnostic Information ---");
        console.log("URL:", window.location.href);
        
        // Check if we're running in VS Code's integrated DevTools
        const isVSCode = window.location.href.includes('vscode-webview') || 
                        document.title.includes('Visual Studio Code') ||
                        !!document.querySelector('.monaco-workbench');
                        
        console.log("Running in VS Code:", isVSCode);
        
        // Check for Monaco editor DOM elements
        const editorElements = document.querySelectorAll('.monaco-editor');
        console.log("Monaco editor DOM elements:", editorElements.length);
        
        // Check for editor content elements
        const contentElements = document.querySelectorAll('.view-lines');
        console.log("Editor content elements:", contentElements.length);
        
        // Check if monaco is defined but not accessible
        try {
            const hasMonaco = 'monaco' in window;
            console.log("monaco in window:", hasMonaco);
            if (hasMonaco) {
                console.log("monaco.editor in window:", !!window.monaco.editor);
            }
        } catch (e) {
            console.log("Error checking for monaco:", e);
        }
        
        console.log("--- End Diagnostic Information ---");
    }
    
    // Get content using fallback DOM methods if Monaco API is not available
    function getContentFromDOM(editorElement) {
        console.log("Attempting to get content via DOM methods");
        
        try {
            // Approach 1: Look for a textarea that contains the editor content
            const textareas = editorElement.querySelectorAll('textarea');
            if (textareas.length > 0) {
                // Try to force textarea to have complete content via selection
                const textarea = textareas[0];
                textarea.focus();
                textarea.select();
                
                // Give time for selection to complete
                setTimeout(() => {
                    const content = textarea.value;
                    if (content) {
                        console.log(`Retrieved ${content.length} characters from textarea`);
                        processContent(content);
                        return content;
                    }
                }, 100);
            }
            
            // Approach 2: Extract from view lines
            const viewLines = editorElement.querySelector('.view-lines');
            if (viewLines) {
                const lineElements = viewLines.querySelectorAll('.view-line');
                if (lineElements.length > 0) {
                    // Sort lines by their position
                    const lines = Array.from(lineElements);
                    lines.sort((a, b) => {
                        const aTop = parseInt(a.style.top) || 0;
                        const bTop = parseInt(b.style.top) || 0;
                        return aTop - bTop;
                    });
                    
                    const content = lines.map(line => line.textContent).join('\n');
                    console.log(`Retrieved ${content.length} characters from view lines (may be incomplete)`);
                    processContent(content);
                    return content;
                }
            }
            
            // Approach 3: Execute keyboard shortcut Ctrl+A, then get selection
            document.execCommand('selectAll');
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                const content = selection.toString();
                console.log(`Retrieved ${content.length} characters from selection`);
                processContent(content);
                return content;
            }
            
            return null;
        } catch (e) {
            console.error("Error extracting content via DOM:", e);
            return null;
        }
    }
    
    // Process retrieved content (copy to clipboard, display preview)
    function processContent(content) {
        if (!content) {
            console.error("No content to process");
            return;
        }
        
        // Improved clipboard handling with fallbacks
        try {
            // Try to focus the document first - may help with clipboard permissions
            if (document.hasFocus && !document.hasFocus()) {
                console.log("⚠️ Document is not focused! Click on the page first for clipboard access.");
            }
            
            // Try the modern Clipboard API with better error handling
            navigator.clipboard.writeText(content)
                .then(() => console.log('✓ Content copied to clipboard!'))
                .catch(err => {
                    console.warn(`Clipboard API failed: ${err.message}`);
                    
                    // Fallback method: Create a textarea element and use document.execCommand
                    try {
                        const textArea = document.createElement("textarea");
                        textArea.value = content;
                        // Make the textarea out of viewport
                        textArea.style.position = "fixed";
                        textArea.style.left = "-999999px";
                        textArea.style.top = "-999999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        
                        const successful = document.execCommand('copy');
                        if (successful) {
                            console.log('✓ Content copied to clipboard using execCommand fallback!');
                        } else {
                            console.warn("execCommand('copy') failed");
                            console.log("📋 MANUAL COPY: Please use keyboard shortcut Ctrl+A then Ctrl+C to copy content manually");
                        }
                        
                        document.body.removeChild(textArea);
                    } catch (fallbackErr) {
                        console.error("All clipboard methods failed.");
                        console.log("📋 MANUAL COPY: Please copy from the content preview below:");
                    }
                });
        } catch (e) {
            console.error("Error during clipboard operations:", e);
            console.log("📋 Please copy the content manually from the preview below.");
        }
        
        // Format and display content in console
        const lines = content.split('\n');
        console.log("\n--- EDITOR CONTENT START ---");
        console.log(`Document contains ${lines.length} lines`);
        
        // Show first few lines
        const previewLines = Math.min(10, lines.length);
        for (let i = 0; i < previewLines; i++) {
            console.log(`${i + 1}: ${lines[i]}`);
        }
        
        if (lines.length > previewLines) {
            console.log(`... ${lines.length - previewLines} more lines (check clipboard for full content) ...`);
        }
        
        console.log("--- EDITOR CONTENT END ---");
    }
    
    // Try to locate the Monaco editor with retries
    let retryCount = 0;
    const maxRetries = 5;  // Increased retry count
    
    function tryGetContent() {
        try {
            const result = findMonacoEditor();
            
            if (!result) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Editor not found, retrying (${retryCount}/${maxRetries})...`);
                    setTimeout(tryGetContent, 1000); // Retry after 1 second
                    return;
                }
                
                console.error("Monaco editor not found after retries!");
                console.log("Getting diagnostic information to help troubleshoot:");
                printDiagnostics();
                console.log("Try clicking in the editor content area first, then run this script again.");
                return null;
            }
            
            // Handle different types of results
            if (result.type === "monaco") {
                const monacoEditor = result.editor;
                
                // Get all editor instances
                const editorInstances = monacoEditor.getEditors();
                console.log(`Found ${editorInstances.length} editor instances`);
                
                if (editorInstances.length === 0) {
                    console.error("No editor instances found!");
                    return null;
                }
                
                // Try to find the active/focused editor instance first
                let activeEditorInstance = editorInstances.find(e => e.hasTextFocus && e.hasTextFocus());
                
                // If no focused editor, use the first one
                if (!activeEditorInstance) {
                    console.log("No focused editor found, using the first available editor");
                    activeEditorInstance = editorInstances[0];
                }
                
                if (typeof activeEditorInstance.trigger !== 'function') {
                    console.error("Editor instance doesn't support the trigger method");
                    return null;
                }
                
                // Execute the "Select All" command to ensure the entire document is loaded
                console.log("Triggering 'Select All' command...");
                activeEditorInstance.trigger('monacoSelectAllExtractor', 'editor.action.selectAll', {});
                
                // Get the model and selection
                const model = activeEditorInstance.getModel();
                if (!model) {
                    console.error("No model found for this editor");
                    return null;
                }
                
                // Get text from the entire document
                const content = model.getValue();
                console.log(`Retrieved ${content.length} characters from the document`);
                
                // Restore selection state (deselect)
                activeEditorInstance.setSelection({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1
                });
                
                processContent(content);
                return content;
            } else if (result.type === "instance") {
                // Direct instance access
                const instance = result.instance;
                
                // Try to execute select all command if available
                if (instance.trigger) {
                    instance.trigger('monacoSelectAllExtractor', 'editor.action.selectAll', {});
                }
                
                const model = instance.getModel();
                if (model) {
                    const content = model.getValue();
                    console.log(`Retrieved ${content.length} characters from editor instance`);
                    processContent(content);
                    return content;
                }
            } else if (result.type === "dom") {
                // Fallback to DOM-based extraction
                return getContentFromDOM(result.element);
            }
            
            return null;
        } catch (error) {
            console.error("Error getting editor content:", error);
            console.log("Trying DOM fallback method as last resort...");
            
            try {
                // Attempt DOM-based extraction as last resort
                const editorElements = document.querySelectorAll('.monaco-editor');
                if (editorElements.length > 0) {
                    return getContentFromDOM(editorElements[0]);
                }
            } catch (fallbackError) {
                console.error("DOM fallback method also failed:", fallbackError);
            }
            
            return null;
        }
    }
    
    return tryGetContent();
})();
