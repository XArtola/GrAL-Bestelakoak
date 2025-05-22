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
    
    // Keyboard navigation helper
    const sendKey = (key) => {
        const keyMap = {
            'ArrowDown': 40, 'ArrowUp': 38, 'ArrowRight': 39, 
            'ArrowLeft': 37, 'End': 35, 'Home': 36,
            'Enter': 13, 'Space': 32
        };
        
        const keyCode = keyMap[key] || key.charCodeAt(0);
        const event = new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true,
            key, code: key, keyCode, which: keyCode
        });
        
        element.focus();
        element.dispatchEvent(event);
        
        return new Promise(r => setTimeout(r, 100)); // Slightly longer delay for keyboard actions
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
