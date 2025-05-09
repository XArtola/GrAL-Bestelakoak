/**
 * VS Code Workspace Explorer
 * Simulates keyboard navigation to reveal all elements in the workspace
 */
function exploreVSCodeWorkspace() {
    // Utility for logging with timestamp
    const log = (msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`);
    
    // Find the explorer view
    const findExplorer = () => {
        const explorers = [
            document.querySelector('.explorer-folders-view'),
            document.querySelector('.monaco-list'),
            document.querySelector('.explorer-viewlet')
        ];
        
        for (const explorer of explorers) {
            if (explorer && explorer.getBoundingClientRect().height > 0) {
                return explorer;
            }
        }
        return null;
    };
    
    // Create a keyboard event
    const createKeyEvent = (type, key, keyCode) => {
        const event = new KeyboardEvent(type, {
            key: key,
            code: `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        });
        return event;
    };
    
    // Send keyboard event to an element
    const sendKey = (element, key) => {
        let keyCode;
        switch (key) {
            case 'ArrowDown': keyCode = 40; break;
            case 'ArrowUp': keyCode = 38; break;
            case 'ArrowRight': keyCode = 39; break;
            case 'ArrowLeft': keyCode = 37; break;
            case 'Enter': keyCode = 13; break;
            default: keyCode = key.charCodeAt(0);
        }
        
        element.dispatchEvent(createKeyEvent('keydown', key, keyCode));
        element.dispatchEvent(createKeyEvent('keyup', key, keyCode));
        
        return new Promise(resolve => setTimeout(resolve, 100));
    };
    
    // Actual exploration function
    const explore = async () => {
        const explorer = findExplorer();
        if (!explorer) {
            log("⚠️ Could not find VS Code explorer");
            return { stop: () => {} };
        }
        
        log("🔍 Found VS Code explorer, starting navigation");
        
        // Focus the explorer to ensure it receives keyboard events
        explorer.focus();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Store seen items to detect when we're done
        const seenItems = new Set();
        let totalSeen = 0;
        let noNewItemsCounter = 0;
        let running = true;
        
        // Get visible items
        const getVisibleItems = () => {
            const rows = document.querySelectorAll('.monaco-list-row');
            return Array.from(rows).filter(row => {
                const rect = row.getBoundingClientRect();
                return rect.height > 0 && rect.width > 0;
            });
        };
        
        // Collect current items
        const recordCurrentItems = () => {
            const visibleItems = getVisibleItems();
            let newItemsFound = 0;
            
            visibleItems.forEach(item => {
                const text = item.textContent;
                if (!seenItems.has(text)) {
                    seenItems.add(text);
                    newItemsFound++;
                    totalSeen++;
                }
            });
            
            return newItemsFound;
        };
        
        // Initial recording
        recordCurrentItems();
        log(`👁️ Initial scan: found ${totalSeen} items`);
        
        // Start exploration interval
        const interval = setInterval(async () => {
            if (!running) {
                clearInterval(interval);
                return;
            }
            
            // Press Down arrow to navigate
            await sendKey(explorer, 'ArrowDown');
            
            // Occasionally try to expand folder with Right arrow
            if (Math.random() < 0.3) {
                await sendKey(explorer, 'ArrowRight');
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Record new items
            const newItems = recordCurrentItems();
            
            // Log progress every few items
            if (totalSeen % 10 === 0 || newItems > 0) {
                log(`🔍 Explored ${totalSeen} items total (${newItems} new)`);
            }
            
            // Check if we're still finding new items
            if (newItems === 0) {
                noNewItemsCounter++;
            } else {
                noNewItemsCounter = 0;
            }
            
            // Stop if we've gone a while without finding new items
            if (noNewItemsCounter >= 20) {
                log(`✅ Exploration complete: revealed ${totalSeen} total items`);
                clearInterval(interval);
                running = false;
            }
        }, 200);
        
        return {
            stop: () => {
                running = false;
                clearInterval(interval);
                log("⏹️ Exploration stopped manually");
            }
        };
    };
    
    // Add a reverse exploration function that works bottom-to-top
    const exploreReverse = async () => {
        const explorer = findExplorer();
        if (!explorer) {
            log("⚠️ Could not find VS Code explorer");
            return { stop: () => {} };
        }
        
        log("🔄 Found VS Code explorer, starting REVERSE navigation (bottom to top)");
        
        // Focus the explorer
        explorer.focus();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // First press End key to go to the bottom
        await sendKey(explorer, 'End');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Store seen items
        const seenItems = new Set();
        let totalSeen = 0;
        let noNewItemsCounter = 0;
        let running = true;
        
        // Get visible items
        const getVisibleItems = () => {
            const rows = document.querySelectorAll('.monaco-list-row');
            return Array.from(rows).filter(row => {
                const rect = row.getBoundingClientRect();
                return rect.height > 0 && rect.width > 0;
            });
        };
        
        // Collect current items
        const recordCurrentItems = () => {
            const visibleItems = getVisibleItems();
            let newItemsFound = 0;
            
            visibleItems.forEach(item => {
                const text = item.textContent;
                if (!seenItems.has(text)) {
                    seenItems.add(text);
                    newItemsFound++;
                    totalSeen++;
                }
            });
            
            return newItemsFound;
        };
        
        // Initial recording at the bottom
        recordCurrentItems();
        log(`👁️ Initial scan at bottom: found ${totalSeen} items`);
        
        // Start exploration interval - going UPWARD
        const interval = setInterval(async () => {
            if (!running) {
                clearInterval(interval);
                return;
            }
            
            // Press UP arrow to navigate (opposite direction)
            await sendKey(explorer, 'ArrowUp');
            
            // Occasionally try to expand folder
            if (Math.random() < 0.3) {
                await sendKey(explorer, 'ArrowRight');
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Record new items
            const newItems = recordCurrentItems();
            
            // Log progress
            if (totalSeen % 10 === 0 || newItems > 0) {
                log(`🔍 Reverse explored ${totalSeen} items total (${newItems} new)`);
            }
            
            // Check if we're still finding new items
            if (newItems === 0) {
                noNewItemsCounter++;
            } else {
                noNewItemsCounter = 0;
            }
            
            // Stop if we've gone a while without finding new items
            if (noNewItemsCounter >= 20) {
                log(`✅ Reverse exploration complete: revealed ${totalSeen} total items`);
                clearInterval(interval);
                running = false;
            }
        }, 200);
        
        return {
            stop: () => {
                running = false;
                clearInterval(interval);
                log("⏹️ Reverse exploration stopped manually");
            }
        };
    };
    
    // Create a method that combines both directions for thorough exploration
    const exploreCompletely = async () => {
        log("🚀 Starting complete workspace exploration");
        
        // First explore from top to bottom
        const forwardExplorer = await explore();
        
        // Wait for forward exploration to finish
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (!forwardExplorer.running) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
        });
        
        log("↪️ Forward exploration complete, starting reverse exploration");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Then explore from bottom to top
        return exploreReverse();
    };
    
    // Return an object with different exploration options
    return {
        forward: explore,
        reverse: exploreReverse,
        complete: exploreCompletely
    };
}

// Updated usage:
// const explorer = exploreVSCodeWorkspace();
// To explore top-down: explorer.forward()
// To explore bottom-up: explorer.reverse()
// To do both directions: explorer.complete()
