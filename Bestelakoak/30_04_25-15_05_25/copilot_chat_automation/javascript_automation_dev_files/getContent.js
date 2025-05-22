/**
 * Function to extract content from the currently active editor in VS Code
 * Run this in the Developer Tools console of VS Code
 */
function getVSCodeEditorContent() {
    try {
        // New method: Try to use Monaco's built-in "Select All" command
        // This forces the editor to load the entire document
        if (typeof monaco !== 'undefined' && monaco.editor) {
            const editorInstances = monaco.editor.getEditors();
            if (editorInstances && editorInstances.length > 0) {
                // Try with each editor instance
                for (const editorInstance of editorInstances) {
                    if (typeof editorInstance.trigger === 'function') {
                        try {
                            // Try to execute the Select All command
                            console.log("Attempting to trigger Select All command...");
                            editorInstance.trigger('getContent.js', 'editor.action.selectAll', {});
                            
                            // After selecting all text, get the selection
                            const selection = editorInstance.getSelection();
                            if (selection) {
                                const model = editorInstance.getModel();
                                if (model) {
                                    // Get text from the entire selection range
                                    const content = model.getValueInRange({
                                        startLineNumber: 1,
                                        startColumn: 1,
                                        endLineNumber: model.getLineCount(),
                                        endColumn: model.getLineMaxColumn(model.getLineCount())
                                    });
                                    
                                    console.log("Content retrieved after Select All command!");
                                    copyToClipboard(content);
                                    logFormattedContent(content);
                                    
                                    // Deselect to restore editor state
                                    editorInstance.setSelection({ startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 });
                                    return content;
                                }
                            }
                        } catch (e) {
                            console.log("Select All command failed:", e);
                        }
                    }
                }
            }
        }
        
        // Additional method 0: Try direct access to global editor instances first
        // This is more likely to access the full document content
        const globalVars = ['editor', 'vscodeEditor', 'currentEditor', '_editor'];
        for (const varName of globalVars) {
            if (window[varName] && typeof window[varName].getModel === 'function') {
                const model = window[varName].getModel();
                if (model && typeof model.getValue === 'function') {
                    const content = model.getValue();
                    console.log(`Content retrieved from global ${varName}!`);
                    copyToClipboard(content);
                    logFormattedContent(content);
                    return content;
                }
            }
        }

        // Method 1: Try to access through Monaco Editor's model registry first
        // This is the most reliable way to get the complete document content
        if (typeof monaco !== 'undefined' && monaco.editor) {
            // Get all models in the editor
            const models = monaco.editor.getModels();
            if (models.length > 0) {
                // Try to get the model of the active editor first
                let activeModel = null;
                
                // Find all editor instances
                const editorInstances = monaco.editor.getEditors();
                if (editorInstances && editorInstances.length > 0) {
                    // Try to find the currently focused editor
                    const activeEditor = editorInstances.find(e => e.hasTextFocus && e.hasTextFocus());
                    if (activeEditor) {
                        activeModel = activeEditor.getModel();
                        // Get the complete document content from the model
                        const content = activeModel.getValue();
                        console.log("Content retrieved from active editor model!");
                        copyToClipboard(content);
                        logFormattedContent(content);
                        return content;
                    }
                }
                
                // If no active editor is found, try all models
                // Usually the first model is the one currently being edited
                for (const model of models) {
                    const content = model.getValue();
                    if (content) {
                        console.log("Content retrieved from model registry!");
                        copyToClipboard(content);
                        logFormattedContent(content);
                        return content;
                    }
                }
            }
        }

        // New advanced method: directly look for model constructor instances
        if (typeof monaco !== 'undefined' && monaco.editor) {
            // Try to access internal TextModel instances
            if (monaco.editor.TextModel && monaco.editor.TextModel._instances) {
                const instances = monaco.editor.TextModel._instances;
                if (instances.size > 0) {
                    // Get the first instance or try to find one related to the active document
                    const firstInstance = instances.values().next().value;
                    if (firstInstance && typeof firstInstance.getValue === 'function') {
                        const content = firstInstance.getValue();
                        console.log("Content retrieved from TextModel instance!");
                        copyToClipboard(content);
                        logFormattedContent(content);
                        return content;
                    }
                }
            }
        }

        // New: Find active editor from CodeEditorService
        try {
            if (typeof require === 'function') {
                const editorService = require('vs/editor/browser/services/codeEditorService').CodeEditorService;
                if (editorService && editorService.getActiveCodeEditor) {
                    const activeEditor = editorService.getActiveCodeEditor();
                    if (activeEditor && activeEditor.getModel) {
                        const model = activeEditor.getModel();
                        if (model) {
                            const content = model.getValue();
                            console.log("Content retrieved via CodeEditorService!");
                            copyToClipboard(content);
                            logFormattedContent(content);
                            return content;
                        }
                    }
                }
            }
        } catch (e) {
            console.log("CodeEditorService approach failed:", e);
        }

        // Method 2: Try to access the CodeEditor API directly
        // VS Code specific approach
        try {
            const vscodeWindowAny = window;
            if (vscodeWindowAny.require) {
                const codeEditorService = vscodeWindowAny.require('vs/editor/browser/services/codeEditorService');
                if (codeEditorService && codeEditorService.getCodeEditor) {
                    // Get all editor instances
                    const editors = codeEditorService.getCodeEditor();
                    if (editors) {
                        // Find active editor
                        const activeEditor = Array.isArray(editors) ? 
                            editors.find(e => e.hasTextFocus && e.hasTextFocus()) : editors;
                        
                        if (activeEditor && activeEditor.getModel) {
                            const model = activeEditor.getModel();
                            if (model) {
                                const content = model.getValue();
                                console.log("Content retrieved from VS Code editor service!");
                                copyToClipboard(content);
                                logFormattedContent(content);
                                return content;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log("VS Code specific approach failed:", e);
        }
        
        // Method 3: Try to get the editor instance through DOM elements
        const editors = Array.from(document.querySelectorAll('.monaco-editor'))
            .filter(editor => editor.classList.contains('focused') || 
                   editor.closest('.editor-instance.active'));
        
        if (editors.length > 0) {
            const editorElement = editors[0];
            // Try to access the editor instance through different properties
            const possibleInstanceProps = ['_modelData', '__proto__', 'editor'];
            
            for (const prop of possibleInstanceProps) {
                if (editorElement[prop]) {
                    let instance = editorElement[prop];
                    
                    // If it's a prototype, try to find the instance
                    if (prop === '__proto__' && instance.constructor && instance.constructor._instances) {
                        instance = instance.constructor._instances.find(
                            i => i.domNode === editorElement
                        );
                    }
                    
                    // Try to get model from instance
                    if (instance && typeof instance.getModel === 'function') {
                        const model = instance.getModel();
                        if (model && typeof model.getValue === 'function') {
                            const content = model.getValue();
                            console.log(`Content retrieved from editor DOM element via ${prop}!`);
                            copyToClipboard(content);
                            logFormattedContent(content);
                            return content;
                        }
                    }
                }
            }
        }

        // New: Try to get at the internal text buffer directly
        const inputAreas = document.querySelectorAll('textarea.inputarea');
        console.log(`Found ${inputAreas.length} input areas in the DOM`);
        if (inputAreas.length > 0) {
            // Try each input area, starting with the focused one
            for (let i = 0; i < inputAreas.length; i++) {
                const textarea = inputAreas[i];
                console.log(`Examining input area ${i+1} of ${inputAreas.length}`);
                
                // Deep inspection of textarea for buffer access
                if (textarea) {
                    // Look for _buffer or textBuffer properties at various depths
                    const checkForBuffer = (obj, depth = 0, path = 'textarea') => {
                        if (!obj || depth > 3 || typeof obj !== 'object') return null;
                        
                        // Check for buffer properties
                        if (obj._buffer && obj._buffer.getLineCount && obj._buffer.getLineContent) {
                            const lineCount = obj._buffer.getLineCount();
                            const lines = [];
                            for (let i = 1; i <= lineCount; i++) {
                                lines.push(obj._buffer.getLineContent(i));
                            }
                            console.log(`Content retrieved from ${path}._buffer`);
                            return lines.join('\n');
                        }
                        
                        if (obj.textBuffer && obj.textBuffer.getLineCount && obj.textBuffer.getLineContent) {
                            const lineCount = obj.textBuffer.getLineCount();
                            const lines = [];
                            for (let i = 1; i <= lineCount; i++) {
                                lines.push(obj.textBuffer.getLineContent(i));
                            }
                            console.log(`Content retrieved from ${path}.textBuffer`);
                            return lines.join('\n');
                        }
                        
                        // Recursively check properties
                        for (const key of Object.keys(obj)) {
                            try {
                                const result = checkForBuffer(obj[key], depth + 1, `${path}.${key}`);
                                if (result) return result;
                            } catch (e) {
                                // Skip inaccessible properties
                            }
                        }
                        
                        return null;
                    };
                    
                    const bufferContent = checkForBuffer(textarea);
                    if (bufferContent) {
                        copyToClipboard(bufferContent);
                        logFormattedContent(bufferContent);
                        return bufferContent;
                    }
                }
            }
        }

        // New: Force editor to render entire document content
        try {
            console.log("Attempting to force complete document rendering...");
            const editorElements = document.querySelectorAll('.monaco-editor');
            for (const editorElement of editorElements) {
                // Approach 1: Access internal scroll methods to force full document rendering
                const scrollable = editorElement.querySelector('.monaco-scrollable-element');
                if (scrollable && scrollable._scrollable) {
                    const scrollHeight = scrollable._scrollable.getScrollHeight();
                    const viewportHeight = scrollable._scrollable.getViewportSize();
                    console.log(`Scroll height: ${scrollHeight}, Viewport height: ${viewportHeight}`);
                    
                    // Store original scroll position to restore later
                    const originalScrollTop = scrollable.scrollTop;
                    
                    // Scroll to bottom to force rendering
                    scrollable._scrollable.setScrollPosition({ scrollTop: scrollHeight });
                    
                    // Small delay to allow rendering
                    setTimeout(() => {
                        // Scroll back to original position
                        scrollable._scrollable.setScrollPosition({ scrollTop: originalScrollTop });
                    }, 100);
                    
                    console.log("Forced scroll to bottom and back to load entire document");
                }
                
                // Approach 2: Try to force model content loading via view
                const view = editorElement._dataAttr?.view;
                if (view && view._viewLines) {
                    // Force rendering of all lines
                    const lineCount = view._context?.model?.getLineCount();
                    if (lineCount) {
                        console.log(`Attempting to force render all ${lineCount} lines`);
                        
                        // Try to access the model directly after forcing rendering
                        if (view._context?.model?.getValue) {
                            const content = view._context.model.getValue();
                            console.log("Retrieved full content after forcing render!");
                            copyToClipboard(content);
                            logFormattedContent(content);
                            return content;
                        }
                    }
                }
            }
            
            // Add improved content forcing via keyboard events
            console.log("Attempting to force content loading via keyboard events...");
            const textareas = document.querySelectorAll('textarea.inputarea');
            if (textareas.length > 0) {
                for (const textarea of textareas) {
                    // First focus the textarea
                    textarea.focus();
                    
                    // Simulate pressing Ctrl+A to select all text
                    const keyDownCtrl = new KeyboardEvent('keydown', {
                        key: 'Control',
                        code: 'ControlLeft',
                        keyCode: 17,
                        ctrlKey: true,
                        bubbles: true
                    });
                    
                    const keyDownA = new KeyboardEvent('keydown', {
                        key: 'a',
                        code: 'KeyA',
                        keyCode: 65,
                        ctrlKey: true,
                        bubbles: true
                    });
                    
                    // Dispatch the events
                    textarea.dispatchEvent(keyDownCtrl);
                    textarea.dispatchEvent(keyDownA);
                    
                    // Give a little time for the editor to process the event
                    console.log("Dispatched Ctrl+A keyboard events");
                    
                    // Try to get selected text after a brief delay via method above
                }
            }
        } catch (e) {
            console.log("Force rendering attempt failed:", e);
        }

        // Method 4: Try to access through VSCode extension host API
        if (typeof acquireVsCodeApi === 'function') {
            try {
                const vscode = acquireVsCodeApi();
                if (vscode.postMessage) {
                    // Send a message to request the content
                    vscode.postMessage({
                        command: 'getDocumentText'
                    });
                    console.log("Message sent to VSCode API to request document text!");
                    // Note: This is asynchronous and won't return content immediately
                }
            } catch (e) {
                console.log("VSCode API not accessible:", e);
            }
        }

        // Method 5: Access internal model data from textarea
        const textareas = document.querySelectorAll('textarea.inputarea');
        console.log(`Checking ${textareas.length} textareas for model data`);
        if (textareas.length > 0) {
            // Try each textarea, not just the first one
            for (let i = 0; i < textareas.length; i++) {
                const textarea = textareas[i];
                console.log(`Examining textarea ${i+1} model data`);
                
                // Try multiple paths to access model data
                const possiblePaths = [
                    '_modelData.model',
                    'model',
                    '_editor.model',
                    '_editor._modelData.model'
                ];
                
                for (const path of possiblePaths) {
                    let obj = textarea;
                    for (const prop of path.split('.')) {
                        obj = obj?.[prop];
                        if (!obj) break;
                    }
                    
                    if (obj && typeof obj.getValue === 'function') {
                        const content = obj.getValue();
                        console.log(`Content retrieved from textarea ${i+1} via ${path}!`);
                        copyToClipboard(content);
                        logFormattedContent(content);
                        return content;
                    }
                }
            }
        }

        // Method 6: Try to extract from editor's viewModel
        const monacoEditors = document.querySelectorAll('.monaco-editor');
        console.log(`Found ${monacoEditors.length} monaco editor elements to check for viewModel`);
        for (let i = 0; i < monacoEditors.length; i++) {
            const editor = monacoEditors[i];
            console.log(`Examining monaco editor ${i+1} for viewModel`);
            
            // Look for the editor's viewModel which contains the full document
            if (editor._dataAttr && editor._dataAttr.view && editor._dataAttr.view.viewModel) {
                const viewModel = editor._dataAttr.view.viewModel;
                if (viewModel.model && typeof viewModel.model.getValue === 'function') {
                    const content = viewModel.model.getValue();
                    console.log("Content retrieved from editor viewModel!");
                    copyToClipboard(content);
                    logFormattedContent(content);
                    return content;
                }
            }
        }

        // New: Try to get at file system API if available
        try {
            if (window.vscode && window.vscode.workspace) {
                const activeDocumentUri = window.vscode.window?.activeTextEditor?.document?.uri;
                if (activeDocumentUri) {
                    window.vscode.workspace.fs.readFile(activeDocumentUri).then(content => {
                        const decoder = new TextDecoder();
                        const text = decoder.decode(content);
                        console.log("Content retrieved via VSCode file system API!");
                        copyToClipboard(text);
                        logFormattedContent(text);
                        return text;
                    });
                }
            }
        } catch (e) {
            console.log("VSCode file system API approach failed:", e);
        }

        // Method 7: Extract from internal _lines property if available
        const focusedEditor = document.querySelector('.monaco-editor.focused') || 
                            document.querySelector('.monaco-editor');
        if (focusedEditor) {
            // Try to access internal property that might contain all lines
            const viewLines = focusedEditor.querySelector('.view-lines');
            if (viewLines && viewLines._lines && Array.isArray(viewLines._lines)) {
                // This property sometimes contains all document lines
                const allLines = viewLines._lines
                    .filter(Boolean)
                    .map(line => typeof line === 'string' ? line : line.textContent || '')
                    .join('\n');
                
                if (allLines) {
                    console.log("Content retrieved from editor's internal lines array!");
                    copyToClipboard(allLines);
                    logFormattedContent(allLines);
                    return allLines;
                }
            }
        }

        // Method 8: Last resort - extract lines from the DOM (may be incomplete)
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

        console.error("Could not find complete editor content through any method");
        return null;
    } catch (e) {
        console.error("Error getting editor content:", e);
        return null;
    }
}

// Enhanced debugging function to also look for commands
function debugEditorObjects() {
    console.log("Attempting to find all possible editor interfaces...");
    
    // Check global monaco object
    if (typeof monaco !== 'undefined') {
        console.log("Monaco editor detected!");
        
        // Log all models - might help identify the one we need
        const models = monaco.editor.getModels();
        console.log(`Found ${models.length} models:`, models);
        
        // Try to find all editor instances
        const editors = monaco.editor.getEditors();
        console.log(`Found ${editors.length} editor instances:`, editors);
        
        // Look for any property that might be the active editor
        const props = ['activeEditor', 'focusedEditor', 'currentEditor'];
        props.forEach(prop => {
            if (monaco.editor[prop]) {
                console.log(`Found monaco.editor.${prop}:`, monaco.editor[prop]);
            }
        });

        // Check for select all command
        console.log("Checking for select all command...");
        if (editors.length > 0) {
            const firstEditor = editors[0];
            console.log("Editor commands:", firstEditor.getActions().map(a => a.id));
            
            // Check if select all is available
            const selectAllAction = firstEditor.getAction('editor.action.selectAll');
            if (selectAllAction) {
                console.log("Select All action found:", selectAllAction);
            } else {
                console.log("Select All action not found directly");
            }
        }
    }
    
    // Check for VS Code specific APIs
    if (window.vscode) {
        console.log("VS Code API available:", window.vscode);
    }
    
    // Find all editor elements in the DOM with more details
    const editorElements = document.querySelectorAll('.monaco-editor');
    console.log(`Found ${editorElements.length} editor elements in DOM`);
    
    // Investigate each editor element more thoroughly
    editorElements.forEach((editor, index) => {
        console.log(`Editor ${index + 1}:`);
        console.log(`  Classes: ${editor.className}`);
        console.log(`  Has input area: ${!!editor.querySelector('textarea.inputarea')}`);
        console.log(`  Has view lines: ${!!editor.querySelector('.view-lines')}`);
        
        // Check for potential model data
        const hasModelData = !!editor._modelData || 
                            !!editor.editor || 
                            !!editor.querySelector('textarea.inputarea')?._modelData;
        console.log(`  Has model data: ${hasModelData}`);
        
        // Check content
        const lines = editor.querySelectorAll('.view-line').length;
        console.log(`  Visible lines: ${lines}`);
    });
    
    return "Debug information logged to console";
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
// Run debugging first to help identify methods
debugEditorObjects();
getVSCodeEditorContent();
