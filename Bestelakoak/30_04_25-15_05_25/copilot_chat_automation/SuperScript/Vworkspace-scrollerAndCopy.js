/**
 * VS Code Workspace Explorer - Modified for preparePrompts folder
 * 
 * This script specifically finds the preparePrompts folder,
 * navigates to the prompts subfolder, and clicks all .spec.txt files inside.
 */
function explorePreparePromptsFolder() {
    // Simple logging with timestamp
    const log = (msg) => console.log(`[PreparePrompts Explorer] ${msg}`);
    log('Starting targeted exploration of preparePrompts folder for .spec.txt files...');
    
    // Collection to store file contents
    const fileContents = [];
    
    // Find explorers in VS Code UI - simplificado para mantener solo los selectores esenciales
    const findTargets = () => {
        const targets = [
            // Primary targets
            {
                element: document.querySelector('.explorer-folders-view .monaco-list'),
                name: 'Explorer Folders',
                priority: 1
            },
            {
                element: document.querySelector('.monaco-list'),
                name: 'Monaco List',
                priority: 2
            },
            // Fallback
            {
                element: document.querySelector('.sidebar'),
                name: 'Sidebar',
                priority: 3
            }
        ].filter(t => t.element && t.element.getBoundingClientRect().height > 0)
         .sort((a, b) => a.priority - b.priority);
        
        return targets.length > 0 ? targets[0] : null;
    };
    
    // Get the target explorer element
    const target = findTargets();
    if (!target) {
        log('❌ Could not find VS Code explorer elements');
        return { stop: () => {}, getFileContents: () => fileContents };
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
        return rows.find(row => row.textContent.trim().includes(text));
    };

    // Helper to check if folder is expanded
    const isFolderExpanded = (folderElement) => {
        if (!folderElement) return false;
        
        // Look for the twistie element that indicates expansion state
        const twistie = folderElement.querySelector('.monaco-tl-twistie');
        if (twistie) {
            // Check aria-expanded attribute
            const expanded = twistie.getAttribute('aria-expanded');
            return expanded === 'true';
        }
        return false;
    };
    
    // Helper to find all visible files
    const findVisibleFiles = () => {
        // Look for file items (not folders) - files usually don't have twisties
        return Array.from(document.querySelectorAll('.monaco-list-row:not(:has(.monaco-tl-twistie.collapsible))'))
            .filter(row => {
                // Filter out already processed files
                const label = row.textContent.trim();
                // Only process files ending with .spec.txt
                return !processedFiles.has(label) && label.endsWith('.spec.txt');
            });
    };
    
    // Keyboard navigation helper - simplificado
    const sendKey = async (key, modifiers = {}) => {
        const keyMap = {
            'ArrowDown': 40, 'ArrowUp': 38, 'ArrowRight': 39, 
            'ArrowLeft': 37, 'End': 35, 'Home': 36,
            'Enter': 13, 'Space': 32, 'a': 65, 'c': 67, 
            'F4': 115 // Added F4 key code
        };
        
        const keyCode = keyMap[key] || key.charCodeAt(0);
        element.focus();
        element.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true, 
            cancelable: true,
            key, 
            code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
            keyCode, 
            which: keyCode,
            ctrlKey: !!modifiers.ctrl,
            metaKey: !!modifiers.meta,
            shiftKey: !!modifiers.shift,
            altKey: !!modifiers.alt
        }));
        
        return new Promise(r => setTimeout(r, 100));
    };
    
    // Helper function to read from clipboard 
    const readFromClipboard = async () => {
        try {
            return await navigator.clipboard.readText();
        } catch (error) {
            log('Failed to read clipboard: ' + error.message);
            return null;
        }
    };
    
    // Direct scrolling helper
    const scrollTo = async (position) => {
        const scrollable = element.querySelector('.monaco-scrollable-element') || element;
        scrollable.scrollTop = position;
        await new Promise(r => setTimeout(r, 150));
    };
    
    // Modified: Check if folder is already expanded before clicking
    const clickFolder = async (el) => {
        if (!el) return false;
        
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        
        // Check if folder is already expanded
        const isExpanded = isFolderExpanded(el);
        if (isExpanded) {
            log('Folder is already expanded, skipping click');
            return true;
        }
        
        // Para carpetas solo necesitamos un click normal
        el.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window
        }));
        
        await new Promise(r => setTimeout(r, 200));
        return true;
    };
    
    // Helper function to read from clipboard - improved with direct selection method
    const captureEditorContent = async () => {
        try {
            // Find editor elements (single DOM query)
            const editorElement = document.querySelector('.monaco-editor');
            if (!editorElement) {
                log("❌ No editor found!");
                return null;
            }
            
            // Get textarea to focus
            const textarea = editorElement.querySelector('textarea.inputarea');
            if (!textarea) {
                log("❌ No textarea element found!");
                return null;
            }
            
            // Focus editor and trigger Ctrl+A shortcut
            textarea.focus();
            await new Promise(r => setTimeout(r, 150));
            
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'a', code: 'KeyA', keyCode: 65, ctrlKey: true, bubbles: true
            }));
            
            // Wait for selection to take effect
            await new Promise(r => setTimeout(r, 150));
            
            // Get selection
            const selection = window.getSelection();
            if (!selection || selection.toString().length === 0) {
                log("❌ Failed to select editor content!");
                return null;
            }
            
            // Extract content directly from selection
            const content = selection.toString();
            
            // Try to copy to clipboard as backup
            try {
                await navigator.clipboard.writeText(content);
                log("📋 Content also copied to clipboard");
            } catch (e) {
                log("⚠️ Clipboard access denied - content extracted directly");
            }
            
            // Clear selection to avoid interference with editor
            setTimeout(() => {
                if (window.getSelection) {
                    window.getSelection().removeAllRanges();
                }
            }, 100);
            
            return content;
        } catch (error) {
            log('Failed to capture editor content: ' + error.message);
            return null;
        }
    };
    
    // Función específica para archivos - modified to use better content capture method
    const openAndCloseFile = async (el) => {
        if (!el) return false;
        
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        
        // Get the filename before opening
        const fileName = el.textContent.trim();
        log(`Opening file: ${fileName}`);
        
        // Para archivos usamos doble click para abrir
        el.dispatchEvent(new MouseEvent('dblclick', {
            bubbles: true, cancelable: true, view: window
        }));
        
        // Wait for the file to open properly
        await new Promise(r => setTimeout(r, 800));
        
        // Use improved content capture method
        const fileContent = await captureEditorContent();
        
        if (fileContent) {
            log(`Successfully captured content for ${fileName} (${fileContent.length} characters)`);
            // Store the file content
            fileContents.push({
                fileName: fileName,
                content: fileContent
            });
        } else {
            log(`Failed to capture content for ${fileName}`);
        }
        
        // Agregar a archivos procesados
        processedFiles.add(fileName);
        
        // Close file with Ctrl+F4 instead of Ctrl+W
        await new Promise(r => setTimeout(r, 200));
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'F4', code: 'F4', keyCode: 115, 
            ctrlKey: true,
            bubbles: true, cancelable: true
        }));
        
        await new Promise(r => setTimeout(r, 400)); // Increased wait time to ensure file closes
        return true;
    };
    
    // Función unificada para encontrar carpetas - elimina la duplicación
    const findFolder = async (folderName) => {
        log(`Looking for ${folderName} folder...`);
        
        // Ir al inicio de la lista
        await sendKey('Home');
        await new Promise(r => setTimeout(r, 300));
        
        // Primero intentamos encontrar la carpeta en la vista actual
        let folder = findFolderByText(folderName);
        if (folder) return folder;
        
        // Si no se encuentra, intentamos con scroll
        const scrollable = element.querySelector('.monaco-scrollable-element') || element;
        const scrollHeight = scrollable.scrollHeight;
        
        for (let i = 0; i < 5 && isRunning; i++) {
            await scrollTo(i * (scrollHeight / 5));
            await new Promise(r => setTimeout(r, 300));
            
            folder = findFolderByText(folderName);
            if (folder) return folder;
        }
        
        // Si todavía no encontramos, usamos navegación por teclado
        await sendKey('Home');
        await new Promise(r => setTimeout(r, 300));
        
        for (let i = 0; i < 20 && isRunning; i++) {
            folder = findFolderByText(folderName);
            if (folder) return folder;
            
            await sendKey('ArrowDown');
            await new Promise(r => setTimeout(r, 100));
        }
        
        return null;
    };
    
    // Funciones de navegación simplificadas que usan findFolder
    const findPreparePromptsFolder = async () => {
        const folder = await findFolder('preparePrompts');
        
        if (folder) {
            log('✅ Found preparePrompts folder');
            await clickFolder(folder);
            
            // Only expand if not already expanded
            if (!isFolderExpanded(folder)) {
                await sendKey('ArrowRight');
                await new Promise(r => setTimeout(r, 300));
            } else {
                log('preparePrompts folder was already expanded');
            }
            
            foundPreparePromptsFolder = true;
            return true;
        }
        
        log('❌ Could not find preparePrompts folder');
        return false;
    };
    
    const findPromptsSubFolder = async () => {
        if (!foundPreparePromptsFolder) {
            log('Cannot find prompts subfolder without first finding preparePrompts');
            return false;
        }
        
        const folder = await findFolder('prompts');
        
        if (folder) {
            log('✅ Found prompts subfolder');
            await clickFolder(folder);
            
            // Only expand if not already expanded
            if (!isFolderExpanded(folder)) {
                await sendKey('ArrowRight');
                await new Promise(r => setTimeout(r, 300));
            } else {
                log('prompts folder was already expanded');
            }
            
            foundPromptFolder = true;
            return true;
        }
        
        log('❌ Could not find prompts subfolder');
        return false;
    };
    
    // Click on all .spec.txt files in the prompts folder
    const clickAllPromptFiles = async () => {
        if (!foundPromptFolder) {
            log('Cannot click on prompt files without first finding prompts folder');
            return false;
        }
        
        log('Starting to click all .spec.txt files in the prompts folder...');
        
        let totalClicked = 0;
        let noNewFilesCounter = 0;
        
        while (noNewFilesCounter < 2 && isRunning) {
            const visibleFiles = findVisibleFiles();
            
            if (visibleFiles.length > 0) {
                log(`Found ${visibleFiles.length} new .spec.txt files to click`);
                noNewFilesCounter = 0;
                
                for (const file of visibleFiles) {
                    if (!isRunning) break;
                    await openAndCloseFile(file);
                    totalClicked++;
                }
            } else {
                noNewFilesCounter++;
                log(`No new .spec.txt files found, scrolling to look for more (attempt ${noNewFilesCounter}/2)`);
                
                const scrollable = element.querySelector('.monaco-scrollable-element') || element;
                const currentPos = scrollable.scrollTop;
                await scrollTo(currentPos + scrollable.clientHeight * 0.8);
                
                // Si el scroll no funcionó bien, usamos teclado
                if (Math.abs(scrollable.scrollTop - currentPos) < 50) {
                    for (let i = 0; i < 8; i++) {
                        await sendKey('ArrowDown');
                    }
                }
                
                await new Promise(r => setTimeout(r, 200));
            }
        }
        
        log(`✅ Processed ${totalClicked} .spec.txt files in the prompts folder`);
        return totalClicked > 0;
    };
    
    // Ejecutar todo el proceso
    const executeFullProcess = async () => {
        try {
            log('Starting exploration for .spec.txt files in preparePrompts/prompts');
            
            if (!await findPreparePromptsFolder()) {
                return false;
            }
            
            if (!await findPromptsSubFolder()) {
                return false;
            }
            
            await clickAllPromptFiles();
            
            log(`🎉 Process complete! Explored ${processedFiles.size} .spec.txt files.`);
            log(`Captured content for ${fileContents.length} files.`);
            return true;
            
        } catch (error) {
            log(`❌ Error: ${error.message}`);
            console.error(error);
            return false;
        } finally {
            isRunning = false;
        }
    };
    
    // Iniciar el proceso
    const processPromise = executeFullProcess();
    
    // Add export functionality
    const getFileContentsAsJson = () => {
        return JSON.stringify(fileContents, null, 2);
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
                foundPrompts: foundPromptFolder,
                contentsCaptured: fileContents.length
            };
        },
        getFileContents: () => fileContents,
        getFileContentsAsJson
    };
}

// Usage: 
// const explorer = explorePreparePromptsFolder();
// To see stats: explorer.stats()
// To get file contents: explorer.getFileContents()
// To get JSON representation: explorer.getFileContentsAsJson()
// To stop early: explorer.stop();
