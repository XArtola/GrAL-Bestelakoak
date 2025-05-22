/**
 * VS Code Workspace Explorer - Modified for preparePrompts folder
 * 
 * This script specifically finds the preparePrompts folder,
 * navigates to the prompts subfolder, and clicks all files inside.
 */
function explorePreparePromptsFolder() {
    // Simple logging with timestamp
    const log = (msg) => console.log(`[PreparePrompts Explorer] ${msg}`);
    log('Starting targeted exploration of preparePrompts folder...');
    
    // Find explorers in VS Code UI
    const findTargets = () => {
        const targets = [
            // Primary targets
            {
                element: document.querySelector('.explorer-folders-view .monaco-list'),
                name: 'Explorer Folders',
                priority: 1
            },
            {
                element: document.querySelector('.monaco-list-rows'),
                name: 'List Rows',
                priority: 2
            },
            {
                element: document.querySelector('.monaco-list'),
                name: 'Monaco List',
                priority: 3
            },
            // Fallbacks
            {
                element: document.querySelector('.explorer-viewlet'),
                name: 'Explorer Viewlet',
                priority: 4
            },
            {
                element: document.querySelector('.sidebar'),
                name: 'Sidebar',
                priority: 5
            }
        ].filter(t => t.element && t.element.getBoundingClientRect().height > 0)
         .sort((a, b) => a.priority - b.priority);
        
        return targets.length > 0 ? targets[0] : null;
    };
    
    // Get the target explorer element
    const target = findTargets();
    if (!target) {
        log('❌ Could not find VS Code explorer elements');
        return { stop: () => {} };
    }
    
    log(`✅ Found target: ${target.name}`);
    const element = target.element;
    
    // Store state
    let isRunning = true;
    let processedFiles = new Set();
    let foundPromptFolder = false;
    let foundPreparePromptsFolder = false;
    
    // Helper to get visible list rows
    const getVisibleRows = () => {
        return Array.from(document.querySelectorAll('.monaco-list-row'));
    };
    
    // Helper to find a folder by its label text
    const findFolderByText = (text) => {
        const rows = getVisibleRows();
        return rows.find(row => {
            const label = row.textContent.trim();
            return label.includes(text);
        });
    };
    
    // Helper to find all visible files
    const findVisibleFiles = () => {
        // Look for file items (not folders) - files usually don't have twisties
        return Array.from(document.querySelectorAll('.monaco-list-row:not(:has(.monaco-tl-twistie.collapsible))'))
            .filter(row => {
                // Filter out already processed files
                const label = row.textContent.trim();
                return !processedFiles.has(label);
            });
    };
    
    // Keyboard navigation helper with modifier key support
    const sendKey = (key, options = {}) => {
        const keyMap = {
            'ArrowDown': 40, 'ArrowUp': 38, 'ArrowRight': 39, 
            'ArrowLeft': 37, 'End': 35, 'Home': 36,
            'Enter': 13, 'Space': 32, 'a': 65, 'c': 67, 'v': 86
        };
        
        const keyCode = keyMap[key] || key.charCodeAt(0);
        const event = new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true,
            key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
            keyCode, which: keyCode,
            ctrlKey: options.ctrl || false,
            shiftKey: options.shift || false,
            altKey: options.alt || false,
            metaKey: options.meta || false
        });
        
        const target = options.target || element;
        target.focus();
        target.dispatchEvent(event);
        
        return new Promise(r => setTimeout(r, 100)); // Slightly longer delay for keyboard actions
    };
    
    // Keyboard shortcut helper functions
    const simulateSelectAll = async (target = document.body) => {
        log('Simulating Ctrl+A (Select All)');
        await sendKey('a', { ctrl: true, target });
        return new Promise(r => setTimeout(r, 200));
    };
    
    const simulateCopy = async (target = document.body) => {
        log('Simulating Ctrl+C (Copy)');
        await sendKey('c', { ctrl: true, target });
        return new Promise(r => setTimeout(r, 200));
    };
    
    const simulatePaste = async (target = document.body) => {
        log('Simulating Ctrl+V (Paste)');
        await sendKey('v', { ctrl: true, target });
        return new Promise(r => setTimeout(r, 200));
    };
    
    // Helper to access clipboard (requires clipboard permissions)
    const getClipboardText = async () => {
        try {
            return await navigator.clipboard.readText();
        } catch (error) {
            log('❌ Could not read clipboard: ' + error.message);
            log('Note: Clipboard access requires permission and secure context (HTTPS)');
            return null;
        }
    };
    
    // Example usage: Copy text from a file
    const copyTextFromElement = async (element) => {
        if (!element) return false;
        
        // First make sure the element is in view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        
        // Click to focus the element
        await clickElement(element);
        
        // Select all text
        await simulateSelectAll(element);
        
        // Copy the text
        await simulateCopy(element);
        
        // Optionally verify what was copied (if permissions allow)
        const clipboardContent = await getClipboardText();
        if (clipboardContent) {
            log(`Copied to clipboard: ${clipboardContent.substring(0, 50)}${clipboardContent.length > 50 ? '...' : ''}`);
        }
        
        return true;
    };
    
    // Direct scrolling helper
    const scrollTo = async (position) => {
        // Find scrollable container
        const scrollable = element.querySelector('.monaco-scrollable-element') || element;
        scrollable.scrollTop = position;
        await new Promise(r => setTimeout(r, 150));
    };
    
    // Click on an element with improved reliability
    const clickElement = async (el) => {
        if (!el) return false;
        
        // Make sure the element is in view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        
        // First try normal click
        const clickEvent = new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window
        });
        el.dispatchEvent(clickEvent);
        await new Promise(r => setTimeout(r, 200));
        
        // Then try mousedown + mouseup sequence
        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true, cancelable: true, view: window
        });
        el.dispatchEvent(mouseDownEvent);
        await new Promise(r => setTimeout(r, 100));
        
        const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true, cancelable: true, view: window
        });
        el.dispatchEvent(mouseUpEvent);
        
        await new Promise(r => setTimeout(r, 200));
        return true;
    };
    
    // Double-click an element (used for opening files)
    const doubleClickElement = async (el) => {
        if (!el) return false;
        
        // Make sure the element is in view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        
        // Create a dblclick event
        const dblClickEvent = new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        el.dispatchEvent(dblClickEvent);
        await new Promise(r => setTimeout(r, 300)); // Wait longer for file to open
        
        // Add to processed set
        const label = el.textContent.trim();
        processedFiles.add(label);
        log(`Opened file: ${label}`);
        
        return true;
    };
    
    // Scan top level to find preparePrompts folder
    const findPreparePromptsFolder = async () => {
        log('Looking for preparePrompts folder...');
        
        // First go to the top of the list
        await sendKey('Home');
        await new Promise(r => setTimeout(r, 300));
        
        // Look for the folder in initial view
        let preparePromptsFolder = findFolderByText('preparePrompts');
        
        // If not found, scroll through the list to find it
        if (!preparePromptsFolder) {
            log('preparePrompts not immediately visible, searching...');
            
            const scrollable = element.querySelector('.monaco-scrollable-element') || element;
            const scrollHeight = scrollable.scrollHeight;
            let foundFolder = false;
            
            // Search by scrolling in chunks
            for (let i = 0; i < 10 && !foundFolder && isRunning; i++) {
                // Scroll down by a chunk
                await scrollTo(i * (scrollHeight / 10));
                await new Promise(r => setTimeout(r, 300));
                
                // Check if we found it
                preparePromptsFolder = findFolderByText('preparePrompts');
                
                if (preparePromptsFolder) {
                    log('Found preparePrompts folder!');
                    foundFolder = true;
                    break;
                }
            }
            
            // If still not found, try keyboard navigation
            if (!foundFolder) {
                log('Trying keyboard navigation to find preparePrompts...');
                await sendKey('Home');
                await new Promise(r => setTimeout(r, 300));
                
                // Press down key multiple times, checking each row
                for (let i = 0; i < 30 && !foundFolder && isRunning; i++) {
                    preparePromptsFolder = findFolderByText('preparePrompts');
                    if (preparePromptsFolder) {
                        log('Found preparePrompts folder with keyboard navigation!');
                        foundFolder = true;
                        break;
                    }
                    
                    await sendKey('ArrowDown');
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        }
        
        if (preparePromptsFolder) {
            log('✅ Successfully found preparePrompts folder');
            await clickElement(preparePromptsFolder);
            await sendKey('ArrowRight'); // Make sure it expands
            foundPreparePromptsFolder = true;
            return true;
        } else {
            log('❌ Could not find preparePrompts folder');
            return false;
        }
    };
    
    // Find prompts subfolder inside preparePrompts
    const findPromptsSubFolder = async () => {
        if (!foundPreparePromptsFolder) {
            log('Cannot find prompts subfolder without first finding preparePrompts');
            return false;
        }
        
        log('Looking for prompts subfolder...');
        
        // Wait for expansion to complete
        await new Promise(r => setTimeout(r, 500));
        
        // Try to find the prompts subfolder
        let promptsFolder = findFolderByText('prompts');
        
        if (!promptsFolder) {
            log('prompts folder not immediately visible, searching...');
            
            // Try keyboard navigation to find it
            for (let i = 0; i < 15 && isRunning; i++) {
                await sendKey('ArrowDown');
                await new Promise(r => setTimeout(r, 100));
                
                promptsFolder = findFolderByText('prompts');
                if (promptsFolder) {
                    break;
                }
            }
        }
        
        if (promptsFolder) {
            log('✅ Found prompts subfolder!');
            await clickElement(promptsFolder);
            await sendKey('ArrowRight'); // Expand it
            foundPromptFolder = true;
            return true;
        } else {
            log('❌ Could not find prompts subfolder');
            return false;
        }
    };
    
    // Click on all files in the prompts folder
    const clickAllPromptFiles = async () => {
        if (!foundPromptFolder) {
            log('Cannot click on prompt files without first finding prompts folder');
            return false;
        }
        
        log('Starting to click all files in the prompts folder...');
        
        // Wait for expansion to complete
        await new Promise(r => setTimeout(r, 500));
        
        let totalClicked = 0;
        let noNewFilesCounter = 0;
        
        // Keep scrolling and clicking until we don't find any new files
        while (noNewFilesCounter < 3 && isRunning) {
            // Find visible files that haven't been processed
            const visibleFiles = findVisibleFiles();
            
            if (visibleFiles.length > 0) {
                log(`Found ${visibleFiles.length} new files to click`);
                noNewFilesCounter = 0;
                
                // Click on each file
                for (const file of visibleFiles) {
                    if (!isRunning) break;
                    
                    await doubleClickElement(file);
                    totalClicked++;
                    
                    // Close the file with Ctrl+W
                    await new Promise(r => setTimeout(r, 200));
                    const closeEvent = new KeyboardEvent('keydown', {
                        key: 'w',
                        code: 'KeyW',
                        ctrlKey: true,
                        bubbles: true,
                        cancelable: true
                    });
                    document.body.dispatchEvent(closeEvent);
                    await new Promise(r => setTimeout(r, 200));
                }
            } else {
                // No new files found, scroll down to look for more
                noNewFilesCounter++;
                log(`No new files found, scrolling to look for more (attempt ${noNewFilesCounter}/3)`);
                
                // Try scrolling down
                const scrollable = element.querySelector('.monaco-scrollable-element') || element;
                const currentPos = scrollable.scrollTop;
                await scrollTo(currentPos + scrollable.clientHeight * 0.8);
                
                // If scroll didn't change position enough, try arrow down keys
                if (Math.abs(scrollable.scrollTop - currentPos) < 50) {
                    log('Scrolling ineffective, using keyboard navigation');
                    for (let i = 0; i < 10; i++) {
                        await sendKey('ArrowDown');
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
                
                await new Promise(r => setTimeout(r, 300));
            }
        }
        
        log(`✅ Completed clicking on ${totalClicked} files in the prompts folder`);
        return totalClicked > 0;
    };
    
    // Execute the entire process in sequence
    const executeFullProcess = async () => {
        try {
            log('Starting full process to explore preparePrompts/prompts files');
            
            // Step 1: Find and open preparePrompts folder
            const foundPrepare = await findPreparePromptsFolder();
            if (!foundPrepare) {
                log('❌ Process stopped: Could not find preparePrompts folder');
                return false;
            }
            
            // Step 2: Find and open prompts subfolder
            const foundPrompts = await findPromptsSubFolder();
            if (!foundPrompts) {
                log('❌ Process stopped: Could not find prompts subfolder');
                return false;
            }
            
            // Step 3: Click on all files
            const clickedFiles = await clickAllPromptFiles();
            
            log(`🎉 Process complete! Explored ${processedFiles.size} files.`);
            return true;
            
        } catch (error) {
            log(`❌ Error during execution: ${error.message}`);
            console.error(error);
            return false;
        } finally {
            isRunning = false;
        }
    };
    
    // Start the process and return control object
    const processPromise = executeFullProcess();
    
    /**
     * Copies content from source element and pastes it to target element
     * Simulates the entire manual workflow of select all → copy → click destination → paste
     */
    const copyAndPasteBetweenElements = async (sourceElement, targetElement) => {
        if (!sourceElement || !targetElement) {
            log('❌ Invalid source or target element for copy-paste operation');
            return false;
        }
        
        try {
            log('Starting copy-paste operation between elements');
            
            // Step 1: Focus and activate the source element
            log('Focusing source element');
            await clickElement(sourceElement);
            await new Promise(r => setTimeout(r, 300));
            
            // Step 2: Select all text in the source element
            await simulateSelectAll(sourceElement);
            log('Selected all text in source element');
            
            // Step 3: Copy the selected text
            await simulateCopy(sourceElement);
            log('Copied text from source element');
            
            // Optional: Verify copy worked if permissions allow
            let clipboardContent = null;
            try {
                clipboardContent = await navigator.clipboard.readText();
                const previewText = clipboardContent ? 
                    (clipboardContent.length > 30 ? 
                        clipboardContent.substring(0, 30) + '...' : 
                        clipboardContent) : 
                    'unknown content';
                log(`Clipboard contains: ${previewText}`);
            } catch (err) {
                log('Note: Could not verify clipboard content (permission denied)');
            }
            
            // Step 4: Focus and activate the target element
            log('Focusing target element');
            await clickElement(targetElement);
            await new Promise(r => setTimeout(r, 300));
            
            // Step 5: Paste the content into the target element
            await simulatePaste(targetElement);
            log('Pasted text into target element');
            
            log('✅ Copy-paste operation completed successfully');
            return true;
        } catch (error) {
            log(`❌ Error during copy-paste operation: ${error.message}`);
            console.error(error);
            return false;
        }
    };
    
    // Helper function to find editor content areas
    const findEditors = () => {
        // Try to find editor areas in VS Code
        const editors = Array.from(document.querySelectorAll('.editor-instance, .monaco-editor, .editor-container'))
            .filter(el => el.offsetParent !== null); // Filter for visible editors
        
        return editors.length > 0 ? editors : null;
    };
    
    // Example: Copy content between two editors
    const copyBetweenEditors = async () => {
        const editors = findEditors();
        
        if (!editors || editors.length < 2) {
            log('❌ Need at least 2 visible editors to copy between them');
            return false;
        }
        
        log(`Found ${editors.length} editor instances`);
        return await copyAndPasteBetweenElements(editors[0], editors[1]);
    };
    
    // Example: Copy content from an editor to another UI element (like an input field)
    const copyFromEditorToElement = async (targetSelector) => {
        const editors = findEditors();
        
        if (!editors || editors.length < 1) {
            log('❌ No visible editors found');
            return false;
        }
        
        const targetElement = document.querySelector(targetSelector);
        if (!targetElement) {
            log(`❌ Target element not found: ${targetSelector}`);
            return false;
        }
        
        return await copyAndPasteBetweenElements(editors[0], targetElement);
    };
    
    return {
        promise: processPromise,
        stop: () => {
            isRunning = false;
            log('⏹️ Process stopped manually');
        },
        stats: () => {
            return {
                filesProcessed: processedFiles.size,
                foundPreparePrompts: foundPreparePromptsFolder,
                foundPrompts: foundPromptFolder
            };
        }
    };
}

// Usage: 
// const explorer = explorePreparePromptsFolder();
// To see stats: explorer.stats()
// To stop early: explorer.stop();
