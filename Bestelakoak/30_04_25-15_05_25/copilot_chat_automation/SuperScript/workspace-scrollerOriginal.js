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
    const sendKey = async (key) => {
        const keyMap = {
            'ArrowDown': 40, 'ArrowUp': 38, 'ArrowRight': 39, 
            'ArrowLeft': 37, 'End': 35, 'Home': 36,
            'Enter': 13, 'Space': 32
        };
        
        const keyCode = keyMap[key] || key.charCodeAt(0);
        element.focus();
        element.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true,
            key, code: key, keyCode, which: keyCode
        }));
        
        return new Promise(r => setTimeout(r, 100));
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
    
    // Función específica para archivos
    const openAndCloseFile = async (el) => {
        if (!el) return false;
        
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        
        // Para archivos usamos doble click para abrir
        el.dispatchEvent(new MouseEvent('dblclick', {
            bubbles: true, cancelable: true, view: window
        }));
        
        await new Promise(r => setTimeout(r, 300));
        
        // Agregar a archivos procesados
        const label = el.textContent.trim();
        processedFiles.add(label);
        log(`Opened file: ${label}`);
        
        // Cerrar archivo con Ctrl+W
        await new Promise(r => setTimeout(r, 200));
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'w', code: 'KeyW', ctrlKey: true,
            bubbles: true, cancelable: true
        }));
        
        await new Promise(r => setTimeout(r, 200));
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
