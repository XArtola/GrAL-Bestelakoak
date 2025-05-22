/**
 * VS Code Explorer - Lightweight version
 * Finds and processes .spec.txt files in the preparePrompts/prompts folder
 */
function explorerLite() {
    // Core data storage
    const fileContents = [];
    let isRunning = true;
    let processedFiles = new Set();
    
    // Simple logging and utils
    const log = msg => console.log(`[Explorer] ${msg}`);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    
    log('Starting lightweight explorer...');
    
    // Find explorer element using simplified selector logic
    const explorer = document.querySelector('.explorer-folders-view .monaco-list') || 
                     document.querySelector('.monaco-list') ||
                     document.querySelector('.sidebar');
    
    if (!explorer) {
        log('❌ Could not find VS Code explorer');
        return { getFileContents: () => fileContents };
    }
    
    // DOM navigation helpers
    const getVisibleRows = () => Array.from(document.querySelectorAll('.monaco-list-row'));
    const findElementByText = text => getVisibleRows().find(row => row.textContent.includes(text));
    const isFolderExpanded = el => el?.querySelector('.monaco-tl-twistie')?.getAttribute('aria-expanded') === 'true';
    
    // Basic interactions
    const sendKey = async (key, modifiers = {}) => {
        const keyMap = { 'ArrowDown': 40, 'ArrowUp': 38, 'ArrowRight': 39, 'ArrowLeft': 37, 'Enter': 13 };
        const keyCode = keyMap[key] || key.charCodeAt(0);
        
        explorer.focus();
        explorer.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true,
            key, 
            code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
            keyCode,
            ctrlKey: !!modifiers.ctrl,
            metaKey: !!modifiers.meta,
            shiftKey: !!modifiers.shift,
            altKey: !!modifiers.alt
        }));
        await wait(50);
    };
    
    const clickElement = async (el, doubleClick = false) => {
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        await wait(100);
        
        if (!doubleClick && isFolderExpanded(el)) return true;
        
        el.dispatchEvent(new MouseEvent(doubleClick ? 'dblclick' : 'click', {
            bubbles: true, cancelable: true
        }));
        await wait(doubleClick ? 300 : 100);
        return true;
    };
    
    // Capture file content - simplified version
    const captureFileContent = async () => {
        const editor = document.querySelector('.monaco-editor');
        const textarea = editor?.querySelector('textarea.inputarea');
        if (!textarea) return null;
        
        textarea.focus();
        await wait(100);
        document.execCommand('selectAll');
        await wait(100);
        
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) return null;
        
        const content = selection.toString().replace(/\r\n/g, '\n');
        
        setTimeout(() => window.getSelection()?.removeAllRanges(), 100);
        return content;
    };
    
    // Navigation functions
    const navigateToFolder = async (folderName) => {
        log(`Looking for ${folderName}...`);
        
        // Start at top
        await sendKey('Home');
        await wait(100);
        
        // Try finding without scrolling
        let folder = findElementByText(folderName);
        if (folder) {
            log(`✓ Found ${folderName}`);
            await clickElement(folder);
            
            if (!isFolderExpanded(folder)) {
                await sendKey('ArrowRight');
                await wait(100);
            }
            return true;
        }
        
        // Try with keyboard navigation
        for (let i = 0; i < 15 && isRunning; i++) {
            folder = findElementByText(folderName);
            if (folder) {
                log(`✓ Found ${folderName}`);
                await clickElement(folder);
                
                if (!isFolderExpanded(folder)) {
                    await sendKey('ArrowRight');
                    await wait(100);
                }
                return true;
            }
            await sendKey('ArrowDown');
        }
        
        log(`× Could not find ${folderName}`);
        return false;
    };
    
    // Process a single file
    const processFile = async (fileElement) => {
        if (!fileElement) return false;
        
        const fileName = fileElement.textContent.trim();
        log(`Processing: ${fileName}`);
        
        await clickElement(fileElement, true);
        const content = await captureFileContent();
        
        if (content) {
            log(`✓ Captured ${fileName}`);
            fileContents.push({ fileName, content });
        } else {
            log(`× Failed to capture ${fileName}`);
        }
        
        processedFiles.add(fileName);
        
        // Close tab
        document.execCommand('close');
        await wait(200);
        return true;
    };
    
    // Process all visible .spec.txt files
    const processVisibleFiles = async () => {
        let processed = 0;
        
        for (let attempt = 0; attempt < 2 && isRunning; attempt++) {
            // Find visible .spec.txt files not already processed
            const files = getVisibleRows().filter(row => {
                const name = row.textContent.trim();
                return name.endsWith('.spec.txt') && !processedFiles.has(name);
            });
            
            if (files.length === 0) {
                // Try scrolling down a bit
                for (let i = 0; i < 5; i++) await sendKey('ArrowDown');
                await wait(100);
                continue;
            }
            
            // Process each found file
            for (const file of files) {
                if (!isRunning) break;
                await processFile(file);
                processed++;
            }
        }
        
        log(`✓ Processed ${processed} files`);
        return processed > 0;
    };
    
    // Main execution
    const execute = async () => {
        try {
            // Navigate to required folders
            if (!await navigateToFolder('preparePrompts')) return false;
            if (!await navigateToFolder('prompts')) return false;
            
            // Process files
            await processVisibleFiles();
            
            log(`✓ Complete! Captured ${fileContents.length} files`);
            return true;
        } catch (error) {
            log(`× Error: ${error.message}`);
            return false;
        } finally {
            isRunning = false;
        }
    };
    
    // Start execution
    const processPromise = execute();
    
    // Return control API
    return {
        promise: processPromise,
        stop: () => { isRunning = false; log('Stopped'); },
        getFileContents: () => fileContents,
        getFileContentsAsJson: () => JSON.stringify(fileContents, null, 2)
    };
}

// Quick chat function that only adds context
async function addContextToChat() {
    const log = msg => console.log(`[Chat] ${msg}`);
    
    try {
        // Open chat panel if not open
        const chatPanel = document.querySelector('#workbench\\.panel\\.chat');
        if (!chatPanel) {
            const chatButton = document.querySelector('#workbench\\.parts\\.titlebar a[title*="Chat"]');
            if (chatButton) chatButton.click();
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // Click Add Context button
        const addContextButton = document.querySelector('.chat-attachment-toolbar a');
        if (!addContextButton) {
            log('× Context button not found');
            return false;
        }
        addContextButton.click();
        await new Promise(r => setTimeout(r, 500));
        
        // Select Files & Folders option
        const items = document.querySelectorAll('.quick-input-list .monaco-list-row');
        let clicked = false;
        for (const item of items) {
            if (item.textContent.includes('Files & Folders')) {
                item.click();
                clicked = true;
                break;
            }
        }
        
        if (!clicked) {
            log('× Files & Folders option not found');
            return false;
        }
        await new Promise(r => setTimeout(r, 500));
        
        // Enter preparePrompts in search box
        const input = document.querySelector('.quick-input-box input');
        if (input) {
            input.focus();
            input.value = 'preparePrompts';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, 500));
            
            // Press Enter to select
            input.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
            }));
        }
        
        log('✓ Context added');
        return true;
    } catch (error) {
        log(`× Error: ${error.message}`);
        return false;
    }
}

// Lightweight combined function
async function exploreAndAddContext() {
    console.log("🚀 Starting keyboard-based exploration...");
    
    // Load file list from JSON
    let filesToProcess = [];
    try {
        // You can use fetch if running in browser context, or require fs if in Node.js
        const response = await fetch('c:/Users/xabia/OneDrive/Documentos/4.Maila/TFG-Bestelakoak/Bestelakoak/VsCode/SuperScript/workspace-files-preparePrompts.json');
        const data = await response.json();
        filesToProcess = data.files;
        console.log(`Loaded ${filesToProcess.length} files from JSON`);
    } catch (error) {
        console.error("Failed to load file list:", error);
        // Fallback to sample files
        filesToProcess = [
            { file: "auth1.spec.txt", location: "preparePrompts/prompts" },
            { file: "auth2.spec.txt", location: "preparePrompts/prompts" }
        ];
    }
    
    const fileContents = [];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    
    // Function to send keyboard shortcuts
    const sendShortcut = async (key, modifiers = {}) => {
        const keyCode = typeof key === 'string' ? key.charCodeAt(0) : key;
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: typeof key === 'string' ? key : String.fromCharCode(key),
            code: typeof key === 'string' ? `Key${key.toUpperCase()}` : `Key${String.fromCharCode(key)}`,
            keyCode: keyCode,
            which: keyCode,
            ctrlKey: !!modifiers.ctrl,
            shiftKey: !!modifiers.shift,
            altKey: !!modifiers.alt,
            metaKey: !!modifiers.meta
        }));
        await wait(150);
    };
    
    // Function to type text
    const typeText = async (text) => {
        const input = document.activeElement;
        if (input) {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await wait(200);
        }
    };
    
    // Capture file content - same logic as before
    const captureFileContent = async () => {
        const editor = document.querySelector('.monaco-editor');
        const textarea = editor?.querySelector('textarea.inputarea');
        if (!textarea) return null;
        
        textarea.focus();
        await wait(100);
        document.execCommand('selectAll');
        await wait(100);
        
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) return null;
        
        const content = selection.toString().replace(/\r\n/g, '\n');
        
        setTimeout(() => window.getSelection()?.removeAllRanges(), 100);
        return content;
    };
    
    // Process files using keyboard shortcuts
    for (const fileInfo of filesToProcess) {
        const fileName = fileInfo.file;
        const fileLocation = fileInfo.location;
        console.log(`Processing: ${fileName} at ${fileLocation}`);
        
        // Open file using Ctrl+E
        await sendShortcut('e', { ctrl: true });
        await wait(300);
        
        // Type the filename followed by space and location
        await typeText(`${fileName} ${fileLocation}`);
        await wait(200);
        
        // Press Enter to open the file
        await sendShortcut('Enter');
        await wait(500);
        
        // Capture content with simplified logic
        const editor = document.querySelector('.monaco-editor');
        const textarea = editor?.querySelector('textarea.inputarea');
        if (textarea) {
            textarea.focus();
            await wait(50); // Reduced wait time
            
            // Combine selection actions
            document.execCommand('selectAll');
            const selection = window.getSelection();
            const content = selection?.toString()?.replace(/\r\n/g, '\n') || '';
            
            if (content) {
                console.log(`✓ Captured ${fileName}`);
                fileContents.push({ fileName, content });
                window.getSelection()?.removeAllRanges();
            } else {
                console.log(`× Failed to capture ${fileName}`);
            }
        }
        
        // Close file with Ctrl+W instead of Ctrl+F4 (as requested)
        await sendShortcut('w', { ctrl: true });
        await wait(200); // Reduced wait time
    }
    
    console.log(`Found ${fileContents.length} files`);
    
    // Open chat with Ctrl+Shift+I
    await sendShortcut('i', { ctrl: true, shift: true });
    await wait(800);
    
    // Add context with Ctrl+ç
    await sendShortcut('ç', { ctrl: true });
    await wait(500);
    
    // Type "Files & Folders"
    await typeText("Files & Folders");
    await wait(300);
    
    // Press Enter to select
    await sendShortcut('Enter');
    await wait(500);
    
    // Type "preparePrompts" in search box
    await typeText("preparePrompts");
    await wait(300);
    
    // Press Enter to select
    await sendShortcut('Enter');
    await wait(300);
    
    // For each file, process and save the response cycle
    for (const fileContent of fileContents) {
        console.log(`Sending content from ${fileContent.fileName} to chat...`);
        
        // Type a prompt with the file content
        await typeText(`Analyze this file: ${fileContent.fileName}\n\n${fileContent.content}`);
        await wait(300);
        
        // Send the message by pressing Enter
        await sendShortcut('Enter');
        
        // Wait for response (estimated time - you might need to adjust this)
        console.log("Waiting for Copilot to respond...");
        await wait(5000); // Wait 5 seconds - adjust as needed
        
        // Focus back on chat with Ctrl+Shift+I
        await sendShortcut('i', { ctrl: true, shift: true });
        await wait(500);
        
        // Type /save to save the conversation
        await typeText("/save");
        await wait(200);
        await sendShortcut('Enter');
        await wait(1000); // Wait for save to complete
        
        // Type /clear to clear the conversation
        await typeText("/clear");
        await wait(200);
        await sendShortcut('Enter');
        await wait(1000); // Wait for clear to complete
        
        console.log(`✓ Processed and saved response for ${fileContent.fileName}`);
    }
    
    console.log("✓ All files processed and responses saved!");
    return fileContents;
}

// Embedded file list for direct access without needing external JSON file
const EMBEDDED_FILE_LIST = {
  "files": [
    { "file": "auth1.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "auth2.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "auth3.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "auth4.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "auth5.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "auth6.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "auth7.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "auth8.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "bankaccounts1.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "bankaccounts2.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "bankaccounts3.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "bankaccounts4.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "new-transaction1.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "new-transaction2.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "new-transaction3.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "new-transaction4.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "new-transaction5.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "new-transaction6.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "notifications1.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "notifications2.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "notifications3.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "notifications4.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "notifications5.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "notifications6.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "notifications7.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds1.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds2.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds3.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds4.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds5.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds6.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds7.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds8.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds9.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds10.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-feeds11.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-view1.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-view2.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-view3.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-view4.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-view5.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "transaction-view6.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "user-settings1.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "user-settings2.spec.txt", "location": "preparePrompts/prompts" },
    { "file": "user-settings3.spec.txt", "location": "preparePrompts/prompts" }
  ]
};

// Modified function to use embedded file list instead of fetching
async function exploreAndAddContextWithEmbeddedList() {
    console.log("🚀 Starting with embedded file list...");
    
    const filesToProcess = EMBEDDED_FILE_LIST.files;
    console.log(`Using ${filesToProcess.length} files from embedded list`);
    
    // Rest of the function is the same as exploreAndAddContext but without the fetch logic
    const fileContents = [];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    
    // Function to send keyboard shortcuts
    const sendShortcut = async (key, modifiers = {}) => {
        const keyCode = typeof key === 'string' ? key.charCodeAt(0) : key;
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: typeof key === 'string' ? key : String.fromCharCode(key),
            code: typeof key === 'string' ? `Key${key.toUpperCase()}` : `Key${String.fromCharCode(key)}`,
            keyCode: keyCode,
            which: keyCode,
            ctrlKey: !!modifiers.ctrl,
            shiftKey: !!modifiers.shift,
            altKey: !!modifiers.alt,
            metaKey: !!modifiers.meta
        }));
        await wait(150);
    };
    
    // Function to type text
    const typeText = async (text) => {
        const input = document.activeElement;
        if (input) {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await wait(200);
        }
    };
    
    // Process files using keyboard shortcuts
    for (const fileInfo of filesToProcess) {
        const fileName = fileInfo.file;
        const fileLocation = fileInfo.location;
        console.log(`Processing: ${fileName} at ${fileLocation}`);
        
        // Open file using Ctrl+E
        await sendShortcut('e', { ctrl: true });
        await wait(300);
        
        // Type the filename followed by space and location
        await typeText(`${fileName} ${fileLocation}`);
        await wait(200);
        
        // Press Enter to open the file
        await sendShortcut('Enter');
        await wait(500);
        
        // Capture content with simplified logic
        const editor = document.querySelector('.monaco-editor');
        const textarea = editor?.querySelector('textarea.inputarea');
        if (textarea) {
            textarea.focus();
            await wait(50);
            
            document.execCommand('selectAll');
            const selection = window.getSelection();
            const content = selection?.toString()?.replace(/\r\n/g, '\n') || '';
            
            if (content) {
                console.log(`✓ Captured ${fileName}`);
                fileContents.push({ fileName, content });
                window.getSelection()?.removeAllRanges();
            } else {
                console.log(`× Failed to capture ${fileName}`);
            }
        }
        
        // Close file with Ctrl+W
        await sendShortcut('w', { ctrl: true });
        await wait(200);
    }
    
    console.log(`Found ${fileContents.length} files`);
    
    // Open chat with Ctrl+Shift+I
    await sendShortcut('i', { ctrl: true, shift: true });
    await wait(800);
    
    // Add context with Ctrl+ç
    await sendShortcut('ç', { ctrl: true });
    await wait(500);
    
    // Type "Files & Folders"
    await typeText("Files & Folders");
    await wait(300);
    
    // Press Enter to select
    await sendShortcut('Enter');
    await wait(500);
    
    // Type "preparePrompts" in search box
    await typeText("preparePrompts");
    await wait(300);
    
    // Press Enter to select
    await sendShortcut('Enter');
    await wait(300);
    
    // For each file, process and save the response cycle
    for (const fileContent of fileContents) {
        console.log(`Sending content from ${fileContent.fileName} to chat...`);
        
        // Type a prompt with the file content
        await typeText(`Analyze this file: ${fileContent.fileName}\n\n${fileContent.content}`);
        await wait(300);
        
        // Send the message by pressing Enter
        await sendShortcut('Enter');
        
        // Wait for response
        console.log("Waiting for Copilot to respond...");
        await wait(5000);
        
        // Focus back on chat with Ctrl+Shift+I
        await sendShortcut('i', { ctrl: true, shift: true });
        await wait(500);
        
        // Type /save to save the conversation
        await typeText("/save");
        await wait(200);
        await sendShortcut('Enter');
        await wait(1000);
        
        // Type /clear to clear the conversation
        await typeText("/clear");
        await wait(200);
        await sendShortcut('Enter');
        await wait(1000);
        
        console.log(`✓ Processed and saved response for ${fileContent.fileName}`);
    }
    
    console.log("✓ All files processed and responses saved!");
    return fileContents;
}

// Auto-execute the function when the script is loaded
console.log("🚀 Script loaded, starting execution...");
exploreAndAddContextWithEmbeddedList()
    .then(files => {
        console.log(`✅ Successfully processed ${files.length} files`);
        // Store the results in a global variable for access in console if needed
        window.processedFiles = files;
    })
    .catch(error => {
        console.error("❌ Error during execution:", error);
    });

// The results will be available in the global variable 'processedFiles'