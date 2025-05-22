/**
 * VS Code Workspace Explorer + Chat Integration
 * 
 * This script combines two functionalities:
 * 1. Finding and extracting content from .spec.txt files in the preparePrompts folder
 * 2. Adding context to the VS Code chat and submitting the extracted content
 */

function explorerAndChatAutomation() {
    // First, we'll define the file explorer functionality
    function explorePreparePromptsFolder() {
        // State and data storage
        const fileContents = [];
        let isRunning = true;
        let processedFiles = new Set();
        let foundPreparePromptsFolder = false;
        let foundPromptFolder = false;
        
        // Utility functions
        const log = (msg) => console.log(`[Explorer] ${msg}`);
        const wait = ms => new Promise(r => setTimeout(r, ms));
        
        log('Starting targeted exploration of preparePrompts folder for .spec.txt files...');
        
        // Find VS Code UI elements
        const findExplorer = () => {
            const selectors = [
                '.explorer-folders-view .monaco-list', // Primary target
                '.monaco-list',                        // Secondary target 
                '.sidebar'                             // Fallback
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.getBoundingClientRect().height > 0) {
                    return element;
                }
            }
            return null;
        };
        
        // Get explorer element
        const explorer = findExplorer();
        if (!explorer) {
            log('❌ Could not find VS Code explorer elements');
            return { stop: () => {}, getFileContents: () => fileContents };
        }
        
        log('✅ Found explorer element');
        
        // DOM and UI interaction helpers
        const getVisibleRows = () => Array.from(document.querySelectorAll('.monaco-list-row'));
        
        const findElementByText = text => getVisibleRows().find(row => 
            row.textContent.trim().includes(text));
            
        const isFolderExpanded = el => {
            if (!el) return false;
            const twistie = el.querySelector('.monaco-tl-twistie');
            return twistie && twistie.getAttribute('aria-expanded') === 'true';
        };
        
        const findVisibleFiles = () => Array.from(document.querySelectorAll(
            '.monaco-list-row:not(:has(.monaco-tl-twistie.collapsible))'
        )).filter(row => {
            const label = row.textContent.trim();
            return !processedFiles.has(label) && label.endsWith('.spec.txt');
        });
        
        // Keyboard and mouse interactions
        const sendKey = async (key, modifiers = {}) => {
            const keyMap = {
                'ArrowDown': 40, 'ArrowUp': 38, 'ArrowRight': 39, 'ArrowLeft': 37,
                'End': 35, 'Home': 36, 'Enter': 13, 'Space': 32,
                'a': 65, 'c': 67, 'F4': 115
            };
            
            const keyCode = keyMap[key] || key.charCodeAt(0);
            const options = {
                bubbles: true, cancelable: true,
                key, 
                code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
                keyCode, which: keyCode,
                ctrlKey: !!modifiers.ctrl,
                metaKey: !!modifiers.meta,
                shiftKey: !!modifiers.shift,
                altKey: !!modifiers.alt
            };
            
            explorer.focus();
            explorer.dispatchEvent(new KeyboardEvent('keydown', options));
            await wait(100);
        };
        
        const scrollTo = async (position) => {
            const scrollable = explorer.querySelector('.monaco-scrollable-element') || explorer;
            scrollable.scrollTop = position;
            await wait(150);
        };
        
        const clickElement = async (el, doubleClick = false) => {
            if (!el) return false;
            
            // Scroll element into view
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await wait(200);
            
            // For folders, check if already expanded
            if (!doubleClick && isFolderExpanded(el)) {
                log('Element already expanded, skipping click');
                return true;
            }
            
            // Send click event
            const eventType = doubleClick ? 'dblclick' : 'click';
            el.dispatchEvent(new MouseEvent(eventType, {
                bubbles: true, cancelable: true, view: window
            }));
            
            await wait(doubleClick ? 800 : 200);
            return true;
        };
        
        // Content extraction helper
        const captureFileContent = async () => {
            try {
                // Find editor and focus on textarea
                const editor = document.querySelector('.monaco-editor');
                if (!editor) return null;
                
                const textarea = editor.querySelector('textarea.inputarea');
                if (!textarea) return null;
                
                // Select all text
                textarea.focus();
                await wait(150);
                document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'a', code: 'KeyA', keyCode: 65, ctrlKey: true, bubbles: true
                }));
                await wait(150);
                
                // Get selection content
                const selection = window.getSelection();
                if (!selection || selection.toString().length === 0) return null;
                
                // Clean the content while maintaining formatting
                const rawContent = selection.toString();
                // Replace special characters but keep line breaks and indentation
                const content = rawContent
                    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control chars
                    .replace(/\r\n/g, '\n') // Normalize line endings
                    .replace(/\u2028|\u2029/g, '\n') // Replace line/paragraph separators
                    .replace(/\uFEFF/g, ''); // Remove BOM
                
                // Try copying to clipboard as backup
                try {
                    await navigator.clipboard.writeText(content);
                    log("📋 Cleaned content copied to clipboard");
                } catch (e) {
                    log("⚠️ Clipboard access denied - content extracted directly");
                }
                
                // Clear selection
                setTimeout(() => window.getSelection()?.removeAllRanges(), 100);
                return content;
            } catch (error) {
                log(`Error capturing content: ${error.message}`);
                return null;
            }
        };
        
        // Core navigation functions
        const findFolder = async (folderName) => {
            log(`Looking for ${folderName} folder...`);
            
            // Try finding folder with initial view
            await sendKey('Home');
            await wait(300);
            let folder = findElementByText(folderName);
            if (folder) return folder;
            
            // Try with scrolling
            const scrollable = explorer.querySelector('.monaco-scrollable-element') || explorer;
            const scrollHeight = scrollable.scrollHeight;
            
            // Scroll through list in chunks
            for (let i = 0; i < 5 && isRunning; i++) {
                await scrollTo(i * (scrollHeight / 5));
                await wait(300);
                folder = findElementByText(folderName);
                if (folder) return folder;
            }
            
            // Try with keyboard navigation
            await sendKey('Home');
            await wait(300);
            
            for (let i = 0; i < 20 && isRunning; i++) {
                folder = findElementByText(folderName);
                if (folder) return folder;
                await sendKey('ArrowDown');
            }
            
            return null;
        };
        
        const navigateToFolder = async (folderName, setFlag) => {
            const folder = await findFolder(folderName);
            if (!folder) {
                log(`❌ Could not find ${folderName} folder`);
                return false;
            }
            
            log(`✅ Found ${folderName} folder`);
            await clickElement(folder);
            
            // Expand folder if needed
            if (!isFolderExpanded(folder)) {
                await sendKey('ArrowRight');
                await wait(300);
            } else {
                log(`${folderName} folder was already expanded`);
            }
            
            if (setFlag) setFlag(true);
            return true;
        };
        
        // Process a single file
        const processFile = async (fileElement) => {
            if (!fileElement) return false;
            
            const fileName = fileElement.textContent.trim();
            log(`Processing file: ${fileName}`);
            
            // Open file
            await clickElement(fileElement, true);
            
            // Capture content
            const fileContent = await captureFileContent();
            
            if (fileContent) {
                log(`✅ Captured content from ${fileName} (${fileContent.length} chars)`);
                fileContents.push({ fileName, content: fileContent });
            } else {
                log(`❌ Failed to capture content for ${fileName}`);
            }
            
            // Mark as processed
            processedFiles.add(fileName);
            
            // Close file with Ctrl+F4
            document.body.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'F4', code: 'F4', keyCode: 115,
                ctrlKey: true, bubbles: true, cancelable: true
            }));
            
            await wait(400);
            return true;
        };
        
        // Process all visible files
        const processVisibleFiles = async () => {
            if (!foundPromptFolder) {
                log('Cannot process files without first finding prompts folder');
                return false;
            }
            
            log('Starting to process .spec.txt files...');
            let totalProcessed = 0;
            let noNewFilesCounter = 0;
            
            while (noNewFilesCounter < 2 && isRunning) {
                const visibleFiles = findVisibleFiles();
                
                if (visibleFiles.length > 0) {
                    log(`Found ${visibleFiles.length} new .spec.txt files to process`);
                    noNewFilesCounter = 0;
                    
                    for (const file of visibleFiles) {
                        if (!isRunning) break;
                        await processFile(file);
                        totalProcessed++;
                    }
                } else {
                    noNewFilesCounter++;
                    log(`No new files found, scrolling to look for more (attempt ${noNewFilesCounter}/2)`);
                    
                    // Try scrolling down
                    const scrollable = explorer.querySelector('.monaco-scrollable-element') || explorer;
                    const currentPos = scrollable.scrollTop;
                    await scrollTo(currentPos + scrollable.clientHeight * 0.8);
                    
                    // If scroll didn't work, try keyboard navigation
                    if (Math.abs(scrollable.scrollTop - currentPos) < 50) {
                        for (let i = 0; i < 8; i++) await sendKey('ArrowDown');
                    }
                    
                    await wait(200);
                }
            }
            
            log(`✅ Processed ${totalProcessed} .spec.txt files`);
            return totalProcessed > 0;
        };
        
        // Main execution function
        const execute = async () => {
            try {
                // Navigate to preparePrompts folder
                if (!await navigateToFolder('preparePrompts', () => foundPreparePromptsFolder = true)) {
                    return false;
                }
                
                // Navigate to prompts subfolder
                if (!await navigateToFolder('prompts', () => foundPromptFolder = true)) {
                    return false;
                }
                
                // Process all files
                await processVisibleFiles();
                
                log(`🎉 Process complete! Explored ${processedFiles.size} files, captured ${fileContents.length} contents`);
                return true;
            } catch (error) {
                log(`❌ Error: ${error.message}`);
                console.error(error);
                return false;
            } finally {
                isRunning = false;
            }
        };
        
        // Start execution and return control interface
        const processPromise = execute();
        
        return {
            promise: processPromise,
            stop: () => {
                isRunning = false;
                log('⏹️ Process stopped manually');
            },
            stats: () => ({
                filesProcessed: processedFiles.size,
                foundPreparePrompts: foundPreparePromptsFolder,
                foundPrompts: foundPromptFolder,
                contentsCaptured: fileContents.length
            }),
            getFileContents: () => fileContents,
            getFileContentsAsJson: () => JSON.stringify(fileContents, null, 2)
        };
    }

    // Now, let's define the chat automation functionality
    async function addContextAndSendText(text = "") {
        const chatLog = (msg) => console.log(`[Chat] ${msg}`);
        
        // Helper function to click an element
        const clickElement = (selector) => {
            return new Promise((resolve, reject) => {
                try {
                    const element = document.querySelector(selector);
                    if (!element) throw new Error(`Element not found: ${selector}`);
                    element.click();
                    setTimeout(resolve, 500);
                } catch (error) {
                    reject(error);
                }
            });
        };

        // Helper function to enter text in an input field
        const enterText = (selector, text) => {
            return new Promise((resolve, reject) => {
                try {
                    const element = document.querySelector(selector);
                    if (!element) throw new Error(`Input not found: ${selector}`);
                    element.value = text;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    setTimeout(resolve, 500);
                } catch (error) {
                    reject(error);
                }
            });
        };

        // Helper function to focus an element
        const focusElement = (selector) => {
            return new Promise((resolve, reject) => {
                try {
                    const element = document.querySelector(selector);
                    if (!element) throw new Error(`Focus target not found: ${selector}`);
                    element.focus();
                    setTimeout(resolve, 500);
                } catch (error) {
                    reject(error);
                }
            });
        };

        // Helper function to simulate pressing Enter
        const pressEnter = (selector) => {
            return new Promise((resolve, reject) => {
                try {
                    const element = document.querySelector(selector);
                    if (!element) throw new Error(`Enter target not found: ${selector}`);
                    element.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter', 
                        code: 'Enter', 
                        keyCode: 13, 
                        which: 13, 
                        bubbles: true
                    }));
                    setTimeout(resolve, 500);
                } catch (error) {
                    reject(error);
                }
            });
        };

        // Helper function to check if an element exists
        const elementExists = (selector) => {
            return document.querySelector(selector) !== null;
        };

        // Helper function to check if text is in an element
        const elementContainsText = (selector, text) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            return element.textContent.toLowerCase().includes(text.toLowerCase());
        };

        // Helper function to enter text into the chat input area
        const enterChatText = async (text) => {
            try {
                chatLog("Entering text in chat input...");
                
                // Target the chat input container
                const chatInputContainerSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar";
                
                // Get the actual input element (textarea) inside the container
                const container = document.querySelector(chatInputContainerSelector);
                if (!container) {
                    throw new Error("Chat input container not found");
                }
                
                // Find the textarea within the container
                const textarea = container.querySelector('textarea');
                if (!textarea) {
                    throw new Error("Chat textarea not found");
                }
                
                // Focus on the textarea
                textarea.focus();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try multiple methods to set the text
                // Method 1: Set value and dispatch input event
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Method 2: Use clipboard API as fallback
                if (!textarea.value) {
                    const originalClipboard = await navigator.clipboard.readText().catch(() => '');
                    await navigator.clipboard.writeText(text);
                    document.execCommand('paste');
                    await navigator.clipboard.writeText(originalClipboard);
                }
                
                // Method 3: Use insertText command as last resort
                if (!textarea.value) {
                    document.execCommand('insertText', false, text);
                }
                
                chatLog("✓ Text entered successfully");
                return true;
            } catch (error) {
                chatLog("× Failed to enter text: " + error.message);
                return false;
            }
        };

        // Helper function to click the send button and wait for response
        const clickSendAndWaitForResponse = async () => {
            try {
                chatLog("Sending message and waiting for response...");
                
                // Send button selector
                const sendButtonSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-input-toolbars > div.monaco-toolbar.chat-execute-toolbar > div > ul > li.action-item.monaco-dropdown-with-primary > div.action-container.menu-entry > a";
                
                // Check if the send button exists
                const sendButton = document.querySelector(sendButtonSelector);
                if (!sendButton) throw new Error("Send button not found");
                
                // Click the send button
                sendButton.click();
                
                // Wait for the response to complete by checking when the button changes back
                let isResponding = true;
                const maxWaitTime = 120000; // 2 minutes maximum wait time
                const startTime = Date.now();
                
                // Poll for button state change
                while (isResponding && (Date.now() - startTime < maxWaitTime)) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
                    
                    const currentButton = document.querySelector(sendButtonSelector);
                    if (!currentButton) continue;
                    
                    // Check if it's still the stop button (during response generation)
                    const isStopButton = 
                        currentButton.classList.contains("codicon-stop-circle") || 
                        currentButton.getAttribute("aria-label")?.includes("Cancel");
                    
                    if (!isStopButton) {
                        isResponding = false;
                        chatLog("✓ Response completed");
                    }
                }
                
                if (isResponding) {
                    chatLog("⚠ Maximum wait time reached, response may not be complete");
                }
                
                return !isResponding;
            } catch (error) {
                chatLog("× Failed to send or wait for response: " + error.message);
                return false;
            }
        };

        // Function to find and click the "Files & Folders..." option
        const clickFilesAndFolders = async () => {
            try {
                chatLog("Selecting 'Files & Folders...' option...");
                
                // Wait for dropdown to appear
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Find all dropdown items
                const listItems = document.querySelectorAll('.quick-input-list .monaco-list-row');
                
                if (listItems.length === 0) return false;
                
                // First look specifically for "Files & Folders..." text (exact match)
                for (let i = 0; i < listItems.length; i++) {
                    const item = listItems[i];
                    const itemText = item.textContent.trim().toLowerCase();
                    
                    // Look for exact match first
                    if (itemText === "files & folders..." || itemText.startsWith("files & folders...")) {
                        item.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        return true;
                    }
                }
                
                // Look for close matches if exact match not found
                for (let i = 0; i < listItems.length; i++) {
                    const item = listItems[i];
                    const itemText = item.textContent.trim().toLowerCase();
                    
                    if (itemText.includes("files & folders")) {
                        item.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        return true;
                    }
                }
                
                chatLog("Could not find 'Files & Folders...' option");
                return false;
            } catch (error) {
                chatLog("Error finding Files & Folders option: " + error.message);
                return false;
            }
        };

        try {
            // Step 1: Check if chat is already open, if not, click on chat button
            const chatPanelSelector = '#workbench\\.panel\\.chat';
            const chatButtonSelector = '#workbench\\.parts\\.titlebar > div > div.titlebar-center > div > div > div > div > ul > li.action-item.monaco-dropdown-with-primary > div.action-container.menu-entry';
            
            if (!elementExists(chatPanelSelector)) {
                chatLog("Opening chat panel...");
                await clickElement(chatButtonSelector);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Check if context is already added
            const contextAttachmentSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attached-context > div";
            
            if (elementExists(contextAttachmentSelector) && 
                elementContainsText(contextAttachmentSelector, "preparePrompts")) {
                chatLog("✓ Context is already added");
            } else {
                chatLog("Adding context...");
                // Step 2: Click on Add Context button
                await clickElement('#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attachment-toolbar > div > div > ul > li > a');
                
                // Step 3: Click on the Files & Folders option
                const filesAndFoldersSelected = await clickFilesAndFolders();
                
                // If we didn't find and click on the Files & Folders option, notify the user
                if (!filesAndFoldersSelected) {
                    chatLog("⚠ Could not find Files & Folders option. Please manually click on it and run the script again.");
                    return false;
                }
                
                // Wait for the input field to appear
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Step 4: Focus and enter text in search field
                const inputSelector = "body > div.file-icons-enabled.enable-motion.monaco-workbench.windows.chromium.maximized.vs-dark.vscode-theme-defaults-themes-dark_plus-json > div.quick-input-widget.show-file-icons > div.quick-input-header > div.quick-input-and-message > div.quick-input-filter > div.quick-input-box > div > div.monaco-inputbox.idle > div > input";
                
                await focusElement(inputSelector);
                await enterText(inputSelector, 'preparePrompts');
                
                // Wait briefly for search results
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Step 5: Now press enter to select the result
                await focusElement(inputSelector);
                await pressEnter(inputSelector);
                
                chatLog("✓ Context added");
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // Step 6: Enter text in the chat input field
            if (text && text.length > 0) {
                await enterChatText(text);
                
                // Step 7: Click send button and wait for response
                await clickSendAndWaitForResponse();
            } else {
                chatLog("No text to send - skipping send step");
            }
            
            chatLog("✓ All chat steps completed");
            return true;
        } catch (error) {
            chatLog("× Failed: " + error.message);
            return false;
        }
    }

    // Function to combine exploration and chat automation
    async function runFullAutomation() {
        console.log("🚀 Starting combined file exploration and chat automation...");
        
        try {
            // Step 1: Run the explorer to collect file contents
            console.log("Step 1: Exploring files to collect contents...");
            const explorer = explorePreparePromptsFolder();
            
            // Wait for the explorer to complete
            await explorer.promise;
            
            // Step 2: Get the collected file contents
            const fileContents = explorer.getFileContents();
            console.log(`Found ${fileContents.length} files with content.`);
            
            if (fileContents.length === 0) {
                console.log("No file contents found to send to chat.");
                return;
            }
            
            // Step 3: Prepare the content for the chat
            // Format the text to include filenames and their content
            let formattedContent = "I've collected the content from .spec.txt files. Please analyze these files:\n\n";
            
            fileContents.forEach((file, index) => {
                formattedContent += `==== FILE ${index + 1}: ${file.fileName} ====\n\n${file.content}\n\n`;
            });
            
            formattedContent += "\nPlease analyze these specification files and provide insights.";
            
            // Step 4: Send the content to chat
            console.log("Step 3: Sending collected content to chat...");
            await addContextAndSendText(formattedContent);
            
            console.log("✅ Full automation complete!");
        } catch (error) {
            console.error("❌ Automation failed:", error);
        }
    }

    // Expose the API for users
    return {
        // Run the full automation pipeline
        runFull: runFullAutomation,
        
        // Run only file exploration
        exploreFiles: () => {
            console.log("Running file exploration only...");
            return explorePreparePromptsFolder();
        },
        
        // Run only chat with provided text
        sendToChat: (text) => {
            console.log("Running chat automation only...");
            return addContextAndSendText(text);
        },
        
        // Run chat with explorer results
        exploreAndSend: async () => {
            const explorer = explorePreparePromptsFolder();
            await explorer.promise;
            const contents = explorer.getFileContents();
            
            let formattedContent = "I've collected the content from .spec.txt files. Please analyze these files:\n\n";
            contents.forEach((file, index) => {
                formattedContent += `==== FILE ${index + 1}: ${file.fileName} ====\n\n${file.content}\n\n`;
            });
            formattedContent += "\nPlease analyze these specification files and provide insights.";
            
            return addContextAndSendText(formattedContent);
        }
    };
}

// Create the automation instance
const automation = explorerAndChatAutomation();

// Usage examples:
// Run full automation (explore files and send to chat):
// automation.runFull();

// Run only file exploration:
// const explorer = automation.exploreFiles();
// explorer.getFileContents(); // Access contents later

// Send specific text to chat:
// automation.sendToChat("Please analyze this code...");

// Explore files and then send to chat:
// automation.exploreAndSend();
