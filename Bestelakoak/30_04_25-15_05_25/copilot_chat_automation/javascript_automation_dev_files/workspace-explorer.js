/**
 * VS Code Workspace Explorer
 * 
 * Forces VS Code to update and render workspace files by simulating
 * user interaction through multiple methods (scrolling, keyboard, clicks)
 */
function forceVSCodeWorkspaceUpdate() {
    // Simple logging with timestamp
    const log = (msg) => console.log(`[Workspace Explorer] ${msg}`);
    log('Starting workspace exploration...');
    
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
    let methodIndex = 0;
    const methods = ['expand-all', 'recursive-nav', 'deep-scroll', 'wheel'];
    let processedFolders = new Set(); // Track expanded folders
    
    // Helper to get visible list rows
    const getVisibleRows = () => {
        return Array.from(document.querySelectorAll('.monaco-list-row'));
    };
    
    // Helper to get expandable folders - look for twisties that aren't yet expanded
    const getExpandableFolders = () => {
        return Array.from(document.querySelectorAll('.monaco-tl-twistie.collapsible')).filter(el => {
            // Get parent row to check if we've already processed this folder
            const row = el.closest('.monaco-list-row');
            if (!row) return false;
            
            // Get folder name or some identifier
            const label = row.textContent.trim();
            if (processedFolders.has(label)) return false;
            
            // Mark as processed
            processedFolders.add(label);
            return true;
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
        
        return new Promise(r => setTimeout(r, 50));
    };
    
    // Direct scrolling helper
    const scrollTo = async (position) => {
        // Find scrollable container
        const scrollable = element.querySelector('.monaco-scrollable-element') || element;
        scrollable.scrollTop = position;
        await new Promise(r => setTimeout(r, 100));
    };
    
    // Create a wheel event
    const wheelScroll = (deltaY) => {
        const scrollable = element.querySelector('.monaco-scrollable-element') || element;
        const event = new WheelEvent('wheel', {
            bubbles: true, cancelable: true, view: window,
            deltaY: deltaY
        });
        scrollable.dispatchEvent(event);
        return new Promise(r => setTimeout(r, 30));
    };
    
    // Click on an element with improved reliability
    const clickElement = async (el) => {
        if (!el) return;
        
        // First try normal click
        const clickEvent = new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window
        });
        el.dispatchEvent(clickEvent);
        await new Promise(r => setTimeout(r, 150));
        
        // Then try mousedown + mouseup
        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true, cancelable: true, view: window
        });
        el.dispatchEvent(mouseDownEvent);
        await new Promise(r => setTimeout(r, 50));
        
        const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true, cancelable: true, view: window
        });
        el.dispatchEvent(mouseUpEvent);
        
        await new Promise(r => setTimeout(r, 150));
    };
    
    // Determine if an element is visible in the viewport
    const isElementVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    };
    
    // Implementation of different exploration methods
    // Method 1: Try to expand all folders found
    const expandAllFolders = async () => {
        log('📂 Finding and expanding ALL folders...');
        
        // Focus the explorer to ensure it receives events
        element.focus();
        await new Promise(r => setTimeout(r, 100));
        
        // Find all expandable folders
        const folders = getExpandableFolders();
        log(`Found ${folders.length} unexpanded folders`);
        
        // If no folders to expand, use keyboard to navigate and find more
        if (folders.length === 0) {
            log('No new folders found, using keyboard to navigate...');
            // Home to go to the top
            await sendKey('Home');
            await new Promise(r => setTimeout(r, 300));
            
            // Press right arrow to try expanding folders we encounter
            for (let i = 0; i < 20 && isRunning; i++) {
                await sendKey('ArrowRight'); // Try to expand
                await new Promise(r => setTimeout(r, 100));
                await sendKey('ArrowDown'); // Move to next item
                await new Promise(r => setTimeout(r, 100));
            }
            
            return;
        }
        
        // Expand the folders we found
        for (let i = 0; i < Math.min(8, folders.length) && isRunning; i++) {
            const folder = folders[i];
            if (!isElementVisible(folder)) {
                // Scroll to make the folder visible if needed
                const parent = folder.closest('.monaco-list-row');
                if (parent) {
                    parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 200));
                }
            }
            
            log(`Expanding folder #${i+1}`);
            await clickElement(folder);
            await new Promise(r => setTimeout(r, 200));
            
            // After clicking, also try keyboard shortcut as backup
            await sendKey('ArrowRight');
            await new Promise(r => setTimeout(r, 100));
        }
    };
    
    // Method 2: Recursive keyboard navigation - very thorough
    const recursiveKeyboardNavigation = async () => {
        log('🔍 Using recursive keyboard navigation to find all items...');
        
        // We'll use the keyboard to navigate the tree structure recursively
        // First, go to the top
        await sendKey('Home');
        await new Promise(r => setTimeout(r, 300));
        
        // Track our recursion depth
        let depth = 0;
        let maxDepth = 5; // Limit recursion depth to avoid infinite loops
        
        // Recursive helper function to navigate through the tree
        const navigateLevel = async (depth) => {
            if (depth > maxDepth || !isRunning) return;
            
            // Expand the current node
            await sendKey('ArrowRight');
            await new Promise(r => setTimeout(r, 150));
            
            // Get the current visible items before we continue
            const beforeCount = getVisibleRows().length;
            log(`Depth ${depth}: ${beforeCount} visible items`);
            
            // Move down and explore children
            for (let i = 0; i < 10 && isRunning; i++) {
                await sendKey('ArrowDown');
                await new Promise(r => setTimeout(r, 80));
                
                // Occasionally go deeper
                if (i % 3 === 0 && depth < maxDepth) {
                    await navigateLevel(depth + 1);
                }
            }
            
            // Return to parent level
            if (depth > 0) {
                await sendKey('ArrowLeft');
                await new Promise(r => setTimeout(r, 150));
            }
        };
        
        // Start the recursive navigation
        await navigateLevel(0);
        
        // End by going back to the top
        await sendKey('Home');
    };
    
    // Method 3: Deep scrolling through the whole list
    const deepScrollExploration = async () => {
        log('📜 Performing deep scroll exploration...');
        
        // Find scrollable container
        const scrollable = element.querySelector('.monaco-scrollable-element') || element;
        const maxScroll = scrollable.scrollHeight;
        
        // First go to top
        await scrollTo(0);
        await new Promise(r => setTimeout(r, 300));
        
        // Track what we've seen to detect when we stop finding new items
        const seenPositions = new Set();
        let prevRowCount = getVisibleRows().length;
        
        // Scroll in many small increments to ensure VS Code loads everything
        const scrollSteps = 20;
        const stepSize = maxScroll / scrollSteps;
        
        for (let i = 0; i <= scrollSteps && isRunning; i++) {
            // Calculate next position with slight variation to avoid exact same positions
            const targetPos = Math.min(i * stepSize + (Math.random() * 10 - 5), maxScroll);
            
            // Skip positions we've already seen (within a threshold)
            if ([...seenPositions].some(pos => Math.abs(pos - targetPos) < 30)) {
                continue;
            }
            
            // Record this position
            seenPositions.add(targetPos);
            
            // Scroll to the position
            await scrollTo(targetPos);
            await new Promise(r => setTimeout(r, 250));
            
            // Check if we found new rows
            const currentRowCount = getVisibleRows().length;
            if (currentRowCount !== prevRowCount) {
                log(`Found ${currentRowCount - prevRowCount} new rows at position ${Math.round(targetPos)}`);
                prevRowCount = currentRowCount;
                
                // Try to expand folders at this position
                await expandAllFolders();
            }
        }
        
        // Return to top when done
        await scrollTo(0);
    };
    
    // Method 4: Enhanced wheel events that better simulate natural scrolling
    const enhancedWheelScrolling = async () => {
        log('⚙️ Using enhanced wheel events...');
        
        // Focus the list first
        element.focus();
        await new Promise(r => setTimeout(r, 100));
        
        // Use wheel events in varying intensities and with pauses
        for (let i = 0; i < 25 && isRunning; i++) {
            // Vary the delta to simulate natural scrolling
            const delta = 100 + Math.floor(Math.random() * 200);
            
            await wheelScroll(delta);
            
            // Occasionally pause to let VS Code catch up and render
            if (i % 5 === 0) {
                await new Promise(r => setTimeout(r, 300));
                
                // Try expanding any new folders we find
                const expandable = getExpandableFolders();
                if (expandable.length > 0) {
                    await clickElement(expandable[0]);
                }
            }
        }
        
        // Scroll back up
        for (let i = 0; i < 15 && isRunning; i++) {
            const delta = -(100 + Math.floor(Math.random() * 200));
            await wheelScroll(delta);
            await new Promise(r => setTimeout(r, 80));
        }
    };
    
    // Start the exploration interval
    const interval = setInterval(async () => {
        if (!isRunning) {
            clearInterval(interval);
            return;
        }
        
        // Rotate through different methods
        const method = methods[methodIndex % methods.length];
        
        switch(method) {
            case 'expand-all':
                await expandAllFolders();
                break;
            case 'recursive-nav':
                await recursiveKeyboardNavigation();
                break;
            case 'deep-scroll':
                await deepScrollExploration();
                break;
            case 'wheel':
                await enhancedWheelScrolling();
                break;
        }
        
        // Count visible rows after each method
        const visibleRows = getVisibleRows().length;
        log(`Method: ${method} - Visible rows: ${visibleRows} - Expanded folders: ${processedFolders.size}`);
        
        methodIndex++;
        
        // Stop after running for a while
        if (methodIndex >= methods.length * 3) {
            log(`✅ Workspace exploration completed - Found ${visibleRows} items in ${processedFolders.size} folders`);
            clearInterval(interval);
            isRunning = false;
        }
    }, 3000); // Longer interval to give each method more time to work
    
    // Return control object with enhanced info
    return {
        stop: () => {
            isRunning = false;
            clearInterval(interval);
            log(`⏹️ Exploration stopped manually - Found ${getVisibleRows().length} items in ${processedFolders.size} folders`);
        },
        stats: () => {
            return {
                visibleRows: getVisibleRows().length,
                expandedFolders: processedFolders.size
            };
        }
    };
}

// Usage: 
// const explorer = forceVSCodeWorkspaceUpdate();
// To see current stats: explorer.stats()
// To stop early: explorer.stop();
