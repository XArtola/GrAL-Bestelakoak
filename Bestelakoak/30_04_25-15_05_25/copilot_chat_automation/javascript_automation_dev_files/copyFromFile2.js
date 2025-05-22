/**
 * VS Code File Content Logger
 * 
 * This script finds the currently opened file in VS Code
 * and logs its content to the console.
 */
function copyActiveFileToConsole() {
    // Simple logging with timestamp
    const log = (msg) => console.log(`[File Logger] ${new Date().toISOString().slice(11, 19)} - ${msg}`);
    log('Starting file content extraction...');
    
    // Find the active editor
    const findActiveEditor = () => {
        // Try multiple selector strategies to find the active editor
        const editors = [
            // Primary strategies
            document.querySelector('.editor-instance.active'),
            document.querySelector('.monaco-editor.focused'),
            document.querySelector('.monaco-editor[data-uri]'),
            
            // Fallbacks
            document.querySelector('.monaco-editor'),
            document.querySelector('.editor-container.active'),
            document.querySelector('.editor-container')
        ].filter(Boolean); // Remove null results
        
        if (editors.length === 0) {
            log('❌ No active editor found');
            return null;
        }
        
        log(`✅ Found editor element`);
        return editors[0];
    };
    
    // Enhanced method to verify content structure with more rigorous checks
    const verifyContent = (content, source) => {
        if (!content) return null;
        
        // Log how many blank lines the content has (for debugging)
        const blankLineCount = (content.match(/^\s*$/gm) || []).length;
        const totalLines = content.split('\n').length;
        
        log(`Content from ${source}: ${totalLines} total lines, ${blankLineCount} blank lines, ${content.length} characters`);
        
        // Add content summary for debugging (first and last few characters)
        const previewStart = content.substring(0, 50).replace(/\n/g, '\\n');
        const previewEnd = content.substring(Math.max(0, content.length - 50)).replace(/\n/g, '\\n');
        log(`Preview: "${previewStart}..." to "...${previewEnd}"`);
        
        // Check if content might be truncated based on line numbers
        if (content.includes("line 1") && !content.includes("line 1000") && totalLines < 300) {
            log("⚠️ WARNING: Content may be truncated - detected early lines but missing later ones");
        }
        
        return content;
    };
    
    // IMPROVED METHOD: Get content directly via Monaco's textModel with URI matching
    const getContentViaTextModel = (editor) => {
        try {
            log('Attempting to access text model directly (most accurate for preserving structure)...');
            
            // Try to directly find monaco editor instance from the DOM element
            if (!window.monaco || !window.monaco.editor) {
                log('Monaco API not globally available');
                return null;
            }
            
            // Get all editor instances
            const editors = window.monaco.editor.getEditors();
            if (!editors || editors.length === 0) {
                log('No editor instances found via Monaco API');
                return null;
            }
            
            // First try to find the exact editor instance that matches our DOM element
            let targetEditor = null;
            let targetModel = null;
            let editorUri = null;
            
            // Look for data attributes that might contain file path info
            if (editor) {
                const dataUri = editor.getAttribute('data-uri');
                if (dataUri) editorUri = dataUri;
                
                // Try to find an ID or other unique identifier
                const editorId = editor.id || editor.getAttribute('id');
                
                // Try to match the DOM element with an editor instance
                for (const ed of editors) {
                    try {
                        // Check if this editor's DOM element is or contains our target
                        if (ed._domElement && 
                            (ed._domElement === editor || editor.contains(ed._domElement) || ed._domElement.contains(editor))) {
                            log('Found exact matching editor instance!');
                            targetEditor = ed;
                            break;
                        }
                    } catch (e) { /* Continue with next editor */ }
                }
            }
            
            // If we found a specific editor, get its model
            if (targetEditor) {
                targetModel = targetEditor.getModel();
                if (targetModel) {
                    const fullText = targetModel.getValue();
                    const filename = targetModel.uri ? targetModel.uri.path.split('/').pop() : 'unknown';
                    log(`✅ Got exact content from matched editor for "${filename}"`);
                    return verifyContent(fullText, 'Exact Monaco Editor Match');
                }
            }
            
            // If we didn't find a specific match, try to find one with focus
            const focusedEditor = editors.find(ed => ed.hasTextFocus());
            if (focusedEditor) {
                const model = focusedEditor.getModel();
                if (model) {
                    const fullText = model.getValue();
                    const filename = model.uri ? model.uri.path.split('/').pop() : 'unknown';
                    log(`✅ Got content from focused editor for "${filename}"`);
                    return verifyContent(fullText, 'Focused Monaco Editor');
                }
            }
            
            // If still no match, try all models
            const models = window.monaco.editor.getModels();
            if (models && models.length > 0) {
                log(`Found ${models.length} text models, searching for best match...`);
                
                // If we have a URI hint from the DOM, try to match it
                if (editorUri && models.some(model => model.uri && model.uri.toString().includes(editorUri))) {
                    const matchingModel = models.find(model => model.uri && model.uri.toString().includes(editorUri));
                    const fullText = matchingModel.getValue();
                    const filename = matchingModel.uri ? matchingModel.uri.path.split('/').pop() : 'unknown';
                    log(`✅ Found model matching URI "${editorUri}" for "${filename}"`);
                    return verifyContent(fullText, `URI-matched Model (${editorUri})`);
                }
                
                // Otherwise use the first model as fallback
                const firstModel = models[0];
                const fullText = firstModel.getValue();
                const filename = firstModel.uri ? firstModel.uri.path.split('/').pop() : 'unknown';
                log(`✅ Using first available model for "${filename}"`);
                return verifyContent(fullText, 'First Available Model');
            }
            
            log('❌ Could not access any text models via Monaco API');
            return null;
        } catch (error) {
            log(`❌ Error accessing text model: ${error.message}`);
            return null;
        }
    };
    
    // Method 1: Get content via clipboard (select all + copy) - ENHANCED
    const getContentViaClipboard = async (editor) => {
        try {
            log('Attempting to get FULL content via clipboard (select all + copy)...');
            
            // Make sure the editor is really focused
            editor.scrollIntoView({ behavior: 'auto', block: 'center' });
            await new Promise(r => setTimeout(r, 300));
            
            // First try clicking to ensure focus
            const clickEvent = new MouseEvent('click', {
                bubbles: true, cancelable: true, view: window
            });
            editor.dispatchEvent(clickEvent);
            await new Promise(r => setTimeout(r, 300));
            
            // Force focus using multiple methods
            if (typeof editor.focus === 'function') {
                editor.focus();
            }
            document.activeElement.blur();  // Clear any other focus
            editor.focus();
            await new Promise(r => setTimeout(r, 300));
            
            log('Editor focused, selecting all text...');
            
            // Try multiple approaches for Select All
            
            // 1. Try standard keyboard event
            const selectAllEvent = new KeyboardEvent('keydown', {
                key: 'a', code: 'KeyA', 
                ctrlKey: true, 
                bubbles: true, cancelable: true
            });
            editor.dispatchEvent(selectAllEvent);
            await new Promise(r => setTimeout(r, 300));
            
            // 2. Try sending the event to document.body as well
            document.body.dispatchEvent(selectAllEvent);
            await new Promise(r => setTimeout(r, 300));
            
            // 3. Try with keypress + keyup sequence
            const selectAllPress = new KeyboardEvent('keypress', {
                key: 'a', code: 'KeyA', 
                ctrlKey: true, 
                bubbles: true, cancelable: true
            });
            editor.dispatchEvent(selectAllPress);
            await new Promise(r => setTimeout(r, 100));
            
            const selectAllUp = new KeyboardEvent('keyup', {
                key: 'a', code: 'KeyA', 
                ctrlKey: true, 
                bubbles: true, cancelable: true
            });
            editor.dispatchEvent(selectAllUp);
            await new Promise(r => setTimeout(r, 300));
            
            log('Select all attempted, now copying...');
            
            // Try multiple approaches for Copy
            
            // 1. Try standard keyboard event
            const copyEvent = new KeyboardEvent('keydown', {
                key: 'c', code: 'KeyC', 
                ctrlKey: true, 
                bubbles: true, cancelable: true
            });
            editor.dispatchEvent(copyEvent);
            await new Promise(r => setTimeout(r, 300));
            
            // 2. Try sending the event to document.body as well
            document.body.dispatchEvent(copyEvent);
            await new Promise(r => setTimeout(r, 300));
            
            // 3. Try with execCommand (may be deprecated but worth trying)
            try {
                document.execCommand('copy');
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                log('execCommand copy failed (expected in some browsers)');
            }
            
            log('Copy attempted, trying to read clipboard...');
            
            // Try to read from clipboard multiple ways
            try {
                // 1. Standard clipboard API
                const text = await navigator.clipboard.readText();
                log('✅ Successfully read from clipboard API!');
                return verifyContent(text, 'clipboard');
            } catch (clipboardError) {
                log('📋 Could not access clipboard via API: ' + clipboardError.message);
                
                // 2. Try alternate methods if available in the environment
                try {
                    // Check for VS Code specific clipboard API
                    if (window.vscode && window.vscode.env && window.vscode.env.clipboard) {
                        const text = await window.vscode.env.clipboard.readText();
                        log('✅ Successfully read from VS Code clipboard API!');
                        return verifyContent(text, 'clipboard');
                    }
                } catch (e) {
                    log('VS Code clipboard API not available');
                }
                
                log('Note: Clipboard access requires permission');
                return null;
            }
        } catch (error) {
            log('❌ Error in clipboard method: ' + error.message);
            return null;
        }
    };
    
    // Method 2: Try to get content directly from the editor's DOM - IMPROVED FOR BLANK LINES
    const getContentFromDOM = (editor) => {
        try {
            log('Attempting to extract content from editor DOM with blank line preservation...');
            
            // Try to find text content in various editor elements
            const viewLines = editor.querySelector('.view-lines');
            if (!viewLines) {
                log('❌ Could not find view-lines container');
                return null;
            }
            
            // Get all line elements including blank ones
            const lineElements = editor.querySelectorAll('.view-line');
            if (lineElements.length === 0) {
                log('❌ No line elements found in editor');
                return null;
            }
            
            // Try to get data attributes that might contain line numbers
            const linesWithData = Array.from(lineElements).map(line => {
                let lineNumber = parseInt(line.getAttribute('data-line-number') || line.getAttribute('line'), 10);
                if (isNaN(lineNumber)) {
                    // If no line number, try to infer from position
                    lineNumber = -1; // Will be fixed in sorting
                }
                return { 
                    lineNumber, 
                    content: line.textContent || '',
                    element: line
                };
            });
            
            // Sort by line number or DOM order if no line numbers
            const sortedLines = linesWithData.sort((a, b) => {
                if (a.lineNumber >= 0 && b.lineNumber >= 0) {
                    return a.lineNumber - b.lineNumber;
                }
                
                // Fall back to DOM order
                return Array.from(lineElements).indexOf(a.element) - 
                       Array.from(lineElements).indexOf(b.element);
            });
            
            // Extract the content
            const content = sortedLines.map(line => line.content).join('\n');
            
            // Verify and return
            return verifyContent(content, 'DOM extraction');
            
        } catch (error) {
            log('❌ Error extracting content from DOM: ' + error.message);
            return null;
        }
    };
    
    // Method 3: Try to access Monaco editor API directly - ENSURE COMPLETE CONTENT
    const getContentViaAPI = (editor) => {
        try {
            log('Attempting to access Monaco Editor API (most reliable method for complete content)...');
            
            // APPROACH 1: Find the editor model through exposed Monaco API
            if (window.monaco && window.monaco.editor) {
                log('Found Monaco editor API in global scope');
                
                // Try to get all editor models
                const models = window.monaco.editor.getModels();
                if (models && models.length) {
                    log(`Found ${models.length} editor model(s)`);
                    
                    // Try to identify the active model
                    let activeModel = null;
                    
                    // Look for the currently focused editor
                    const editors = window.monaco.editor.getEditors();
                    if (editors && editors.length) {
                        log(`Found ${editors.length} editor instance(s)`);
                        for (const ed of editors) {
                            if (ed.hasTextFocus()) {
                                log('Found editor with focus');
                                activeModel = ed.getModel();
                                break;
                            }
                        }
                    }
                    
                    // If no focused editor found, try the first model
                    if (!activeModel && models.length > 0) {
                        activeModel = models[0];
                        log('Using first available model');
                    }
                    
                    if (activeModel) {
                        // Get the full text content from the model
                        const text = activeModel.getValue();
                        const fileName = activeModel.uri ? activeModel.uri.path.split('/').pop() : 'unknown';
                        log(`✅ Successfully extracted complete content from model (${fileName})`);
                        return verifyContent(text, 'Monaco API');
                    }
                }
            }
            
            // APPROACH 2: Try to find editor instance through the DOM
            const editorElements = document.querySelectorAll('.monaco-editor');
            for (const editorElement of editorElements) {
                // Try to access the editor instance through __proto__ or related properties
                for (const key in editorElement) {
                    if (key.includes('editor') || key.includes('__') || key.includes('_instance')) {
                        try {
                            const possibleEditor = editorElement[key];
                            if (possibleEditor && typeof possibleEditor.getValue === 'function') {
                                const text = possibleEditor.getValue();
                                log(`✅ Found editor via DOM element property: ${key}`);
                                return verifyContent(text, 'Monaco API');
                            }
                        } catch (e) {
                            // Continue trying other properties
                        }
                    }
                }
                
                // Look for data attributes that might contain references
                if (editorElement.dataset) {
                    for (const key in editorElement.dataset) {
                        if (editorElement.dataset[key] && typeof editorElement.dataset[key] === 'object') {
                            try {
                                const obj = editorElement.dataset[key];
                                if (obj.getValue && typeof obj.getValue === 'function') {
                                    const text = obj.getValue();
                                    log(`✅ Found editor via dataset: ${key}`);
                                    return verifyContent(text, 'Monaco API');
                                }
                            } catch (e) {
                                // Continue trying
                            }
                        }
                    }
                }
            }
            
            // APPROACH 3: Search global scope for editor instances or services
            const editorGlobals = [
                'editor', 'vscodeEditor', 'codeEditor', 'textEditor', 'activeEditor',
                'editorService', 'textEditorService', 'editorInstance'
            ];
            
            for (const key of editorGlobals) {
                if (window[key] && typeof window[key].getValue === 'function') {
                    try {
                        const text = window[key].getValue();
                        log(`✅ Found editor via global variable: ${key}`);
                        return verifyContent(text, 'Monaco API');
                    } catch (e) {
                        // Continue trying other globals
                    }
                }
            }
            
            // APPROACH 4: Try to find in VS Code specific globals
            if (window.vscode) {
                try {
                    // VS Code might have editor service accessible
                    const editor = window.vscode.window && window.vscode.window.activeTextEditor;
                    if (editor && editor.document) {
                        const text = editor.document.getText();
                        log('✅ Found text via VS Code API');
                        return verifyContent(text, 'Monaco API');
                    }
                } catch (e) {
                    // Continue with other approaches
                }
            }
            
            // Try direct property access on the window object
            for (const key in window) {
                if (key.includes('EDITOR') || key.includes('editor')) {
                    try {
                        const possibleEditor = window[key];
                        if (possibleEditor && typeof possibleEditor.getValue === 'function') {
                            const text = possibleEditor.getValue();
                            log(`✅ Found editor via global ${key}`);
                            return verifyContent(text, 'Monaco API');
                        }
                    } catch (e) {
                        // Continue with other properties
                    }
                }
            }
            
            log('❌ Could not access Monaco Editor API through any approach');
            return null;
        } catch (error) {
            log('❌ Error accessing editor API: ' + error.message);
            return null;
        }
    };

    // Method 4: Try to access VS Code extension host API if available
    const getContentViaVSCodeAPI = () => {
        try {
            log('Attempting to access VS Code Extension API...');
            
            // Check for acquireVsCodeApi
            if (typeof acquireVsCodeApi === 'function') {
                const vscode = acquireVsCodeApi();
                log('Found VS Code API, attempting to get current document...');
                
                // Try to post a message to the extension host
                vscode.postMessage({ 
                    command: 'getDocumentText', 
                    requestId: Date.now() 
                });
                
                log('⚠️ Posted request to extension host. This requires a corresponding extension to handle it.');
                log('If you have such an extension, the content should be returned asynchronously.');
            }
            
            return null; // This method is mostly for notification, actual content would come via message
        } catch (error) {
            log('VS Code API not available: ' + error.message);
            return null;
        }
    };

    // NEW METHOD: Direct access to Monaco's internal data structures 
    const getContentViaDirectAccess = (editor) => {
        try {
            log('Attempting direct access to internal editor data structures...');
            
            // Find editor DOM element if not provided
            if (!editor) {
                editor = findActiveEditor();
                if (!editor) return null;
            }
            
            // Look for ___proto__ properties and internal fields
            const searchForModel = (obj, depth = 0, path = 'root') => {
                if (depth > 5) return null; // Limit recursion
                
                // Skip if not an object or null
                if (!obj || typeof obj !== 'object') return null;
                
                // Check if this is a model with getValue method
                if (obj.getValue && typeof obj.getValue === 'function') {
                    try {
                        const value = obj.getValue();
                        if (value && typeof value === 'string' && value.length > 0) {
                            log(`✅ Found model at path: ${path}`);
                            return value;
                        }
                    } catch (e) { /* Continue searching */ }
                }
                
                // Check if this is a text model with specific Monaco properties
                if (obj.getLineCount && obj.getLineContent) {
                    try {
                        const lineCount = obj.getLineCount();
                        if (lineCount > 0) {
                            const lines = [];
                            for (let i = 1; i <= lineCount; i++) {
                                lines.push(obj.getLineContent(i));
                            }
                            const content = lines.join('\n');
                            log(`✅ Found text model with ${lineCount} lines at path: ${path}`);
                            return content;
                        }
                    } catch (e) { /* Continue searching */ }
                }
                
                // Look through properties of the object
                for (const key in obj) {
                    try {
                        // Skip functions and DOM nodes
                        if (typeof obj[key] === 'function') continue;
                        if (obj[key] instanceof Node) continue;
                        
                        // Recursively check this property
                        const result = searchForModel(obj[key], depth + 1, `${path}.${key}`);
                        if (result) return result;
                    } catch (e) { /* Continue with next property */ }
                }
                
                // Check special property names separately (like _model or __proto__)
                const specialProps = ['_model', 'model', '_textModel', 'textModel', '_instance', '__proto__'];
                for (const prop of specialProps) {
                    try {
                        if (obj[prop] && typeof obj[prop] === 'object') {
                            const result = searchForModel(obj[prop], depth + 1, `${path}.${prop}`);
                            if (result) return result;
                        }
                    } catch (e) { /* Continue with next property */ }
                }
                
                return null;
            };
            
            // Start search from the editor DOM element
            let content = searchForModel(editor);
            if (content) return content;
            
            // Try to access Monaco internal data structures through known global objects
            const knownContainers = [
                window.monaco,
                window.__MONACO_EDITOR_DATA__,
                window.__VSCODE_EDITOR__,
                window.vscode
            ].filter(Boolean);
            
            for (const container of knownContainers) {
                content = searchForModel(container);
                if (content) return content;
            }
            
            // Use the window object itself (but search shallowly to avoid performance issues)
            for (const key in window) {
                if (key.includes('vscode') || key.includes('monaco') || key.includes('editor')) {
                    try {
                        // Only check immediate level properties
                        if (typeof window[key] === 'object' && window[key]) {
                            const directValue = window[key].getValue;
                            if (directValue && typeof directValue === 'function') {
                                content = window[key].getValue();
                                if (content && typeof content === 'string' && content.length > 0) {
                                    log(`✅ Found model in window.${key}`);
                                    return content;
                                }
                            }
                        }
                    } catch (e) { /* Continue with next key */ }
                }
            }
            
            return null;
        } catch (error) {
            log(`❌ Error in direct access method: ${error.message}`);
            return null;
        }
    };
    
    // NEW METHOD: Force selection via document commands
    const getContentViaCommands = async () => {
        try {
            log('Attempting to execute VS Code commands to select all text...');
            
            // Try using the command service if available
            if (window.monaco && window.monaco.editor && window.monaco.editor.getEditors) {
                const editors = window.monaco.editor.getEditors();
                if (editors && editors.length > 0) {
                    const activeEditor = editors.find(ed => ed.hasTextFocus()) || editors[0];
                    
                    log('Executing editor.action.selectAll command...');
                    await activeEditor.trigger('forceSelectAll', 'editor.action.selectAll');
                    await new Promise(r => setTimeout(r, 300));
                    
                    // Try getting the selected text
                    const selectionObj = activeEditor.getSelection();
                    const model = activeEditor.getModel();
                    
                    if (selectionObj && model) {
                        // This gets the entire text within the selection
                        const text = model.getValueInRange(selectionObj);
                        if (text && text.length > 0) {
                            log(`✅ Successfully extracted text via selection command (${text.length} chars)`);
                            return text;
                        }
                    }
                    
                    // Try getting model content directly
                    if (model && model.getValue) {
                        const text = model.getValue();
                        log(`✅ Retrieved model content after selection (${text.length} chars)`);
                        return text;
                    }
                }
            }
            
            // Try VS Code's command API
            if (window.vscode && window.vscode.commands) {
                try {
                    await window.vscode.commands.executeCommand('editor.action.selectAll');
                    await new Promise(r => setTimeout(r, 300));
                    
                    // Now try to get the selected text via clipboard
                    await window.vscode.commands.executeCommand('editor.action.clipboardCopyAction');
                    await new Promise(r => setTimeout(r, 300));
                    
                    // Try to read clipboard
                    if (window.vscode.env && window.vscode.env.clipboard) {
                        const text = await window.vscode.env.clipboard.readText();
                        log(`✅ Got text via VS Code command + clipboard (${text.length} chars)`);
                        return text;
                    }
                } catch (e) {
                    log('Command execution failed: ' + e.message);
                }
            }
            
            return null;
        } catch (error) {
            log(`❌ Error in commands method: ${error.message}`);
            return null;
        }
    };
    
    // Method 5: Get content via the editor's line cache - IMPROVED
    const getContentViaLineCache = async (editor) => {
        try {
            log('Attempting to extract content from editor line by line (improved method)...');
            
            // Find the view lines container
            const viewLines = editor.querySelector('.view-lines');
            if (!viewLines) {
                log('❌ Could not find view-lines container');
                return null;
            }
            
            // Aggressive approach: Force rendering of all lines
            const allLines = new Map();
            const scrollable = editor.querySelector('.monaco-scrollable-element');
            
            if (scrollable) {
                // Save current scroll position
                const originalScrollTop = scrollable.scrollTop;
                
                // First scroll to the very top
                scrollable.scrollTop = 0;
                await new Promise(r => setTimeout(r, 300));
                
                // Estimate total document height by checking scrollbar
                const totalHeight = scrollable.scrollHeight || 100000; // Use a large default if unknown
                const viewportHeight = scrollable.clientHeight || 500;
                log(`Document height: ${totalHeight}px, Viewport: ${viewportHeight}px`);
                
                // IMPORTANT: This aggressive approach scrolls through the entire document
                // using smaller increments to ensure all lines are rendered
                const collectLinesAggressively = async () => {
                    // Initialize with lines visible at the top
                    const collectCurrentLines = () => {
                        const lineElements = editor.querySelectorAll('.view-line');
                        lineElements.forEach(line => {
                            try {
                                // Try to extract line number
                                let lineNumber;
                                
                                // Method 1: Get from attributes
                                lineNumber = parseInt(line.getAttribute('data-line-number') || line.getAttribute('line'), 10);
                                
                                // Method 2: Try to infer from DOM structure if no attribute
                                if (isNaN(lineNumber)) {
                                    // Find all previous siblings to determine position
                                    let count = 0;
                                    let prev = line.previousElementSibling;
                                    while (prev) {
                                        count++;
                                        prev = prev.previousElementSibling;
                                    }
                                    lineNumber = allLines.size + count + 1;
                                }
                                
                                const content = line.textContent || '';
                                
                                // Only add if we have content and a line number
                                if (!isNaN(lineNumber) && content) {
                                    allLines.set(lineNumber, content);
                                }
                            } catch (e) {
                                // Skip lines that can't be processed
                            }
                        });
                    };
                    
                    // Collect initial set of lines
                    collectCurrentLines();
                    
                    // Use smaller increments for scrolling (25% of viewport)
                    const scrollIncrement = Math.max(50, viewportHeight * 0.25);
                    let currentPosition = 0;
                    let lastLineCount = 0;
                    let noNewLinesCounter = 0;
                    
                    // Scroll until we reach the end or detect no new content
                    while (currentPosition < totalHeight && noNewLinesCounter < 5) {
                        // Scroll down
                        currentPosition += scrollIncrement;
                        scrollable.scrollTop = currentPosition;
                        await new Promise(r => setTimeout(r, 200)); // Wait longer to ensure rendering
                        
                        // Collect lines at this position
                        collectCurrentLines();
                        
                        // Check if we found new lines
                        if (allLines.size === lastLineCount) {
                            noNewLinesCounter++;
                        } else {
                            lastLineCount = allLines.size;
                            noNewLinesCounter = 0;
                        }
                        
                        // Log progress
                        if (currentPosition % (viewportHeight * 2) < scrollIncrement) {
                            log(`Scrolled to position ${currentPosition}/${totalHeight}, found ${allLines.size} lines so far`);
                        }
                    }
                    
                    // As a final step, try scrolling to the very bottom
                    scrollable.scrollTop = totalHeight;
                    await new Promise(r => setTimeout(r, 300));
                    collectCurrentLines();
                    
                    // Restore original scroll position
                    scrollable.scrollTop = originalScrollTop;
                    
                    // Sort and combine lines
                    const sortedLines = Array.from(allLines.entries())
                        .sort(([a], [b]) => a - b)
                        .map(([_, content]) => content);
                    
                    const text = sortedLines.join('\n');
                    log(`✅ Collected ${sortedLines.length} lines via aggressive scrolling`);
                    
                    return text;
                };
                
                return await collectLinesAggressively();
            }
            
            return null;
        } catch (error) {
            log(`❌ Error in line cache method: ${error.message}`);
            return null;
        }
    };

    // NEW METHOD: Direct file system access via VS Code API
    const getContentViaFileSystem = async () => {
        try {
            log('Attempting to access file content directly via VS Code file system API...');
            
            // This requires VS Code extension context
            if (!window.vscode) {
                log('VS Code API not available');
                return null;
            }
            
            // Try to get current active editor info
            if (window.vscode.window && window.vscode.window.activeTextEditor) {
                const activeEditor = window.vscode.window.activeTextEditor;
                const document = activeEditor.document;
                
                if (document) {
                    // Get full text from the document
                    const text = document.getText();
                    const filename = document.fileName.split('/').pop() || document.fileName.split('\\').pop() || 'unknown';
                    log(`✅ Got complete file content via VS Code API for "${filename}"`);
                    return verifyContent(text, 'VS Code File System API');
                }
            }
            
            // Alternative approach for extension context
            if (window.vscode.workspace && window.vscode.window) {
                try {
                    // This will only work inside a VS Code extension with URI access
                    const activeEditor = window.vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document && activeEditor.document.uri) {
                        const uri = activeEditor.document.uri;
                        const doc = await window.vscode.workspace.openTextDocument(uri);
                        const content = doc.getText();
                        log(`✅ Got file content via workspace API for "${uri.fsPath}"`);
                        return verifyContent(content, 'VS Code Workspace API');
                    }
                } catch (e) {
                    log(`Workspace API access failed: ${e.message}`);
                }
            }
            
            return null;
        } catch (error) {
            log(`❌ Error accessing file system: ${error.message}`);
            return null;
        }
    };
    
    // IMPROVED: Get content for raw model access with line-by-line collection
    const getContentViaRawModelAccess = async (editor) => {
        try {
            log('Attempting to get content directly via raw model access with proper line ordering...');
            
            // Find models or editor instances
            if (!window.monaco || !window.monaco.editor) {
                return null;
            }
            
            const models = window.monaco.editor.getModels();
            if (!models || models.length === 0) return null;
            
            // Get a model
            const model = models[0];
            
            // Get line count
            const lineCount = model.getLineCount();
            log(`Found model with ${lineCount} lines`);
            
            if (lineCount > 0) {
                // Build the content line by line to ensure correct order
                const lines = [];
                for (let i = 1; i <= lineCount; i++) {
                    lines.push(model.getLineContent(i) || '');
                }
                
                // Join with newlines
                const content = lines.join('\n');
                log(`✅ Built content line-by-line from model (${lineCount} lines)`);
                return verifyContent(content, 'Line-by-Line Model');
            }
            
            return null;
        } catch (error) {
            log(`❌ Error in raw model access: ${error.message}`);
            return null;
        }
    };

    // NEW MOST RELIABLE METHOD - Direct content access via editor state
    const getContentViaEditorState = async () => {
        try {
            log('Attempting direct access to editor state (most reliable for complete content)...');
            
            // First check if Monaco API is available
            if (!window.monaco || !window.monaco.editor) {
                log('Monaco API not available');
                return null;
            }
            
            // Get editor instances
            const editors = window.monaco.editor.getEditors();
            if (!editors || editors.length === 0) {
                log('No editor instances found');
                return null;
            }
            
            // Get the active editor
            const editor = editors.find(ed => ed.hasTextFocus()) || editors[0];
            
            // Approach 1: Use internal state for complete access
            // This accesses the complete text model, bypassing partial renders
            if (editor && editor._codeEditorService) {
                log('Accessing editor via internal service');
                const model = editor.getModel();
                
                if (model) {
                    // Get info about the document
                    const lineCount = model.getLineCount();
                    const lastLineLength = model.getLineLength(lineCount);
                    const totalChars = model.getValueLength();
                    
                    log(`Document info: ${lineCount} lines, ${totalChars} total characters`);
                    
                    // Get the COMPLETE text content regardless of what's visible
                    // Using getLineContent ensures we get EVERY line, not just visible ones
                    const lines = [];
                    for (let i = 1; i <= lineCount; i++) {
                        lines.push(model.getLineContent(i));
                    }
                    
                    const content = lines.join('\n');
                    log(`✅ Extracted COMPLETE content: ${content.length} chars, ${lines.length} lines`);
                    return verifyContent(content, 'Complete Editor State');
                }
            }
            
            // Approach 2: Get full text range via position calculation
            if (editor && editor.getModel()) {
                const model = editor.getModel();
                const lineCount = model.getLineCount();
                const lastLineLength = model.getLineLength(lineCount);
                
                // Create a range from start to end of document
                const startPos = { lineNumber: 1, column: 1 };
                const endPos = { lineNumber: lineCount, column: lastLineLength + 1 };
                
                // Extract text from the entire range
                const text = model.getValueInRange({
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: endPos.lineNumber,
                    endColumn: endPos.column
                });
                
                if (text) {
                    log(`✅ Got complete text via range extraction: ${text.length} chars`);
                    return verifyContent(text, 'Full Range Model');
                }
            }
            
            return null;
        } catch (error) {
            log(`❌ Error accessing editor state: ${error.message}`);
            return null;
        }
    };

    // Main function to execute the content extraction
    const executeExtraction = async () => {
        // Step 1: Find the editor
        const editor = findActiveEditor();
        if (!editor) {
            log('❌ Cannot proceed without an editor element');
            return null;
        }
        
        // Step 2: Try all content extraction methods in sequence
        let content = null;
        let extractionMethod = '';
        
        // Try the new direct editor state method FIRST (most reliable)
        content = await getContentViaEditorState();
        if (content) extractionMethod = 'Direct Editor State (most reliable)';
        
        // Try improved raw model line-by-line access next
        if (!content) {
            content = await getContentViaRawModelAccess(editor);
            if (content) extractionMethod = 'Complete Line-by-Line Model';
        }
        
        // Try VS Code file system access
        if (!content) {
            content = await getContentViaFileSystem();
            if (content) extractionMethod = 'VS Code File System API';
        }
        
        // Continue with other methods in order of reliability
        // Try enhanced text model method
        if (!content) {
            content = getContentViaTextModel(editor);
            if (content) extractionMethod = 'Enhanced Monaco Text Model';
        }
        
        // If enhanced text model failed, try raw model line-by-line access
        if (!content) {
            content = await getContentViaRawModelAccess(editor);
            if (content) extractionMethod = 'Raw Model Line-by-Line';
        }
        
        // If raw model failed, try direct access
        if (!content) {
            content = getContentViaDirectAccess(editor);
            if (content) extractionMethod = 'Direct Access';
        }
        
        // If direct access failed, try the Monaco API method
        if (!content) {
            content = getContentViaAPI(editor);
            if (content) extractionMethod = 'Monaco API';
        }
        
        // If API method failed, try commands method
        if (!content) {
            content = await getContentViaCommands();
            if (content) extractionMethod = 'VS Code Commands';
        }
        
        // If commands method failed, try improved line cache method
        if (!content) {
            content = await getContentViaLineCache(editor);
            if (content) extractionMethod = 'Line Cache';
        }
        
        // If line cache failed, try clipboard method as fallback
        if (!content) {
            content = await getContentViaClipboard(editor);
            if (content) extractionMethod = 'Clipboard';
        }
        
        // If clipboard failed, try DOM extraction as last resort
        if (!content) {
            content = getContentFromDOM(editor);
            if (content) extractionMethod = 'DOM Extraction';
        }
        
        // Try VS Code specific API as a last resort
        if (!content) {
            getContentViaVSCodeAPI();
        }

        // Step 3: Output the results
        if (content) {
            log(`✅ Successfully extracted file content using: ${extractionMethod}`);
            
            // Log start and end for verification
            const firstLine = content.split('\n')[0] || '';
            const lastLine = content.split('\n').pop() || '';
            log(`First line: "${firstLine}"`);
            log(`Last line: "${lastLine}"`);
            
            console.log('--- FILE CONTENT START ---');
            console.log(content);
            console.log('--- FILE CONTENT END ---');
            
            // Get approximate file size
            const sizeInKB = (content.length / 1024).toFixed(2);
            log(`File size: approximately ${sizeInKB} KB (${content.length} characters)`);
            
            // Count lines and blank lines
            const lineCount = content.split('\n').length;
            const blankLineCount = (content.match(/^\s*$/gm) || []).length;
            log(`Line count: ${lineCount} total, ${blankLineCount} blank lines`);
            
            // Store this content in global variable for debugging if needed
            window.__extractedFileContent = content;
            log('Content stored in window.__extractedFileContent for debugging');
            
            return content;
        } else {
            log('❌ All content extraction methods failed');
            return null;
        }
    };
    
    // Execute and return control object
    const extractionPromise = executeExtraction();
    
    return {
        promise: extractionPromise,
        getContent: () => extractionPromise
    };
}

// Usage:
// const fileLogger = copyActiveFileToConsole();
// To get the content as a promise: fileLogger.getContent().then(content => { /* do something */ });
