/**
 * VS Code List Scroller
 * 
 * This utility helps programmatically scroll through VS Code's virtualized lists
 * to interact with elements that may not be rendered in the DOM yet.
 */
(function() {
    // Configuration
    const config = {
        scrollStep: 100,        // Pixels to scroll per step
        scrollDelay: 30,        // Milliseconds between scroll steps
        maxTimeout: 10000,      // Maximum time to spend scrolling (ms)
        debug: true,            // Whether to log debug information
        useInstanceApiWhenAvailable: true, // Try to use internal APIs when possible
        useWheelEventsAsFallback: true,    // Use wheel events if direct scrolling fails
        maxRetries: 3                      // Number of retries when scrolling gets stuck
    };
    
    // Common list selectors in VS Code UI
    const listSelectors = [
        '.explorer-folders-view .monaco-list',         // Explorer folders
        '.explorer-open-editors .monaco-list',         // Open editors
        '.search-view .monaco-list',                   // Search results
        '.outline-pane .monaco-list',                  // Outline view
        '.scm-view .monaco-list',                      // Source Control
        '.monaco-list'                                 // Generic fallback
    ];
    
    // Helper function to log information if debug is enabled
    function log(message) {
        if (config.debug) {
            console.log(`%c[VS Code Scroller] ${message}`, 'color: #6f42c1');
        }
    }

    // Try to get the ListView instance from a DOM element
    function getListViewInstance(element) {
        try {
            // First try to get the parent list element if we have a scrollable element
            if (element.classList.contains('monaco-scrollable-element')) {
                const parent = element.closest('.monaco-list');
                if (parent) {
                    // Try to find instance on parent first
                    const parentInstance = tryGetInstanceFromElement(parent);
                    if (parentInstance) return parentInstance;
                }
            }
            
            return tryGetInstanceFromElement(element);
        } catch (err) {
            log('Error accessing ListView instance: ' + err.message);
        }
        
        return null;
    }
    
    // Helper to extract instance from element
    function tryGetInstanceFromElement(element) {
        // Check common VS Code component patterns
        if (element._lstkind) {
            log('Found list kind: ' + element._lstkind);
        }

        // Access internal stored data through _dataList or similar properties
        for (let key of Object.keys(element)) {
            // Look for ListView instance or related properties
            if ((key.startsWith('_list') || key === 'list' || key.includes('List')) && 
                element[key] && typeof element[key].setScrollTop === 'function') {
                log('Found ListView instance via ' + key);
                return element[key];
            }
            
            // Look for data objects that might contain the list
            if (key.includes('data') || key.includes('view')) {
                const obj = element[key];
                if (obj && typeof obj === 'object') {
                    // Check if this object or its view property has scroll methods
                    if (typeof obj.setScrollTop === 'function') {
                        log('Found scroll controller via ' + key);
                        return obj;
                    } else if (obj.view && typeof obj.view.setScrollTop === 'function') {
                        log('Found scroll controller via ' + key + '.view');
                        return obj.view;
                    }
                }
            }
            
            // Look for scrollable instance
            if ((key.startsWith('_scrollable') || key === 'scrollable') && 
                element[key] && typeof element[key].setScrollPosition === 'function') {
                log('Found Scrollable instance via ' + key);
                return {
                    setScrollTop: (pos) => element[key].setScrollPosition({ scrollTop: pos })
                };
            }
        }
        
        // Try to find via __proto__ properties or private fields
        const protoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(element) || {});
        for (const key of protoKeys) {
            if (key.includes('scroll') && typeof element[key] === 'function') {
                log('Found potential scroll method via prototype: ' + key);
                return { 
                    setScrollTop: (pos) => element[key].call(element, { scrollTop: pos })
                };
            }
        }
        
        return null;
    }
    
    // Find the first visible list element matching our selectors
    function findVisibleList() {
        for (const selector of listSelectors) {
            const elements = Array.from(document.querySelectorAll(selector));
            
            // Find the first visible list
            const visibleList = elements.find(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            
            if (visibleList) {
                log(`Found list with selector: ${selector}`);
                return visibleList;
            }
        }
        
        throw new Error('Could not find a visible list element in the current view');
    }
    
    // Get the scrollable element from a list
    function getScrollableElement(listElement) {
        const scrollable = listElement.querySelector('.monaco-scrollable-element');
        if (!scrollable) {
            throw new Error('Could not find scrollable element within the list');
        }
        return scrollable;
    }
    
    // Simulate a wheel event to scroll
    function simulateWheelEvent(element, deltaY) {
        log(`Simulating wheel event with deltaY=${deltaY}`);
        
        const wheelEvent = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            view: window,
            deltaY: deltaY
        });
        
        element.dispatchEvent(wheelEvent);
        return true;
    }
    
    // Simulate mouse wheel scrolling
    async function simulateScrollWithWheel(element, targetPosition, currentPosition) {
        const direction = targetPosition > currentPosition ? 1 : -1;
        const stepSize = 120 * direction; // Standard wheel delta
        let simulated = false;
        
        log(`Simulating wheel scroll to ${targetPosition} from ${currentPosition}`);
        
        // Try up to 3 wheel events to get unstuck
        for (let i = 0; i < 3; i++) {
            simulateWheelEvent(element, stepSize);
            simulated = true;
            
            // Give the browser time to process
            await new Promise(resolve => setTimeout(resolve, config.scrollDelay));
            
            // Check if we made progress
            const newPosition = element.scrollTop;
            log(`After wheel event ${i+1}, position is ${newPosition}`);
            
            if (Math.abs(newPosition - currentPosition) > 5) {
                // We made some progress
                return true;
            }
        }
        
        return simulated;
    }
    
    // Scroll to a specific position with improved instance-aware implementation and fallbacks
    async function scrollToPosition(scrollableElement, position) {
        const previousPosition = scrollableElement.scrollTop;
        let scrollSuccess = false;
        
        // Try to use the ListView instance if available and enabled
        if (config.useInstanceApiWhenAvailable) {
            const instance = getListViewInstance(scrollableElement);
            if (instance) {
                if (typeof instance.setScrollTop === 'function') {
                    instance.setScrollTop(position);
                    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to let scrolling take effect
                    
                    const newPosition = scrollableElement.scrollTop;
                    if (Math.abs(newPosition - position) < 5 || 
                        Math.abs(newPosition - previousPosition) > 5) {
                        log(`Used ListView instance to scroll to position ${position}, got ${newPosition}`);
                        return true;
                    } else {
                        log(`ListView instance scroll didn't work as expected, falling back`);
                    }
                }
            }
        }
        
        // Try direct DOM method
        scrollableElement.scrollTop = position;
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
        
        // Check if scroll was successful
        let newPosition = scrollableElement.scrollTop;
        if (Math.abs(newPosition - position) < 5) {
            log(`Successfully scrolled to position ${position}`);
            return true;
        } else if (Math.abs(newPosition - previousPosition) > 5) {
            // We made some progress, even if not to the exact position
            log(`Partially scrolled to ${newPosition} (wanted ${position})`);
            return true;
        } else {
            log(`Failed to scroll to ${position}, still at ${newPosition}`);
            
            // If we're stuck at the same position, try wheel events
            if (config.useWheelEventsAsFallback) {
                return await simulateScrollWithWheel(scrollableElement, position, previousPosition);
            }
            
            return false;
        }
    }
    
    // Get the visible items in the current view
    function getVisibleItems(listElement) {
        return Array.from(listElement.querySelectorAll('.monaco-list-row'));
    }
    
    // Scroll through the entire list with options to detect new elements
    async function scrollEntireList(options = {}) {
        const {
            targetSelector = null,       // Optional CSS selector to find
            onNewElementsFound = null,   // Callback when new elements are found
            scrollToEnd = true,          // Whether to scroll to the end or stop when found
            returnToStart = true,        // Whether to return to starting position afterwards
            forceRefreshDOM = true       // Force DOM refreshing when stuck
        } = options;
        
        try {
            // Find the list and scrollable elements
            const listElement = findVisibleList();
            const scrollable = getScrollableElement(listElement);
            
            // Store initial state
            const startPosition = scrollable.scrollTop;
            const startTime = Date.now();
            let foundTarget = false;
            let previousVisibleIds = new Set();
            let stuckCounter = 0;
            let lastPosition = startPosition;
            
            // Get initial visible items
            getVisibleItems(listElement).forEach(item => {
                previousVisibleIds.add(item.getAttribute('data-index') || item.innerText);
            });
            
            // Start scrolling
            log('Starting to scroll through list...');
            let currentPosition = startPosition;
            const maxPosition = scrollable.scrollHeight;
            
            while (currentPosition < maxPosition) {
                // Check if we've exceeded the maximum timeout
                if (Date.now() - startTime > config.maxTimeout) {
                    log('Reached maximum timeout, stopping scroll');
                    break;
                }
                
                // Scroll to next position
                currentPosition += config.scrollStep;
                if (currentPosition > maxPosition) currentPosition = maxPosition;
                
                // Try to scroll and handle potential stuck situations
                await scrollToPosition(scrollable, currentPosition);
                
                // Get actual new position
                const actualPosition = scrollable.scrollTop;
                
                // Check if we're stuck at the same position
                if (Math.abs(actualPosition - lastPosition) < 2) {
                    stuckCounter++;
                    
                    // If we're stuck for several attempts, try more aggressive measures
                    if (stuckCounter >= config.maxRetries) {
                        log(`Scroll appears stuck at ${actualPosition}, trying to unstick...`);
                        
                        // Try a faster scroll to jump past whatever's blocking
                        if (config.useWheelEventsAsFallback) {
                            // Use multiple wheel events to try to force scrolling
                            for (let i = 0; i < 5; i++) {
                                await simulateScrollWithWheel(scrollable, currentPosition + 200, actualPosition);
                                await new Promise(resolve => setTimeout(resolve, config.scrollDelay));
                            }
                        }
                        
                        // If we're still stuck, we may have reached the end
                        if (Math.abs(scrollable.scrollTop - actualPosition) < 2) {
                            log('Failed to unstick scrolling - assuming end of list reached');
                            break;
                        } else {
                            // Reset stuck counter if we made progress
                            stuckCounter = 0;
                        }
                    }
                } else {
                    // Reset stuck counter when we make progress
                    stuckCounter = 0;
                }
                
                lastPosition = scrollable.scrollTop;
                
                // Wait for rendering to complete
                await new Promise(resolve => setTimeout(resolve, config.scrollDelay));
                
                // Detect new elements
                const currentVisibleElements = getVisibleItems(listElement);
                const newItems = [];
                
                currentVisibleElements.forEach(item => {
                    const id = item.getAttribute('data-index') || item.innerText;
                    if (!previousVisibleIds.has(id)) {
                        previousVisibleIds.add(id);
                        newItems.push(item);
                        
                        // Check if this is our target
                        if (targetSelector && 
                           (item.matches(targetSelector) || 
                            item.querySelector(targetSelector))) {
                            foundTarget = item;
                        }
                    }
                });
                
                // Call the callback with new items if provided
                if (newItems.length > 0 && onNewElementsFound) {
                    onNewElementsFound(newItems);
                }
                
                // If we found our target and don't need to scroll to the end, break
                if (foundTarget && !scrollToEnd) {
                    log('Found target element, stopping scroll');
                    break;
                }
                
                // If we've reached the end, break
                if (scrollable.scrollTop >= maxPosition - 10) {
                    log('Reached end of list based on scroll position');
                    break;
                }
                
                // If we haven't found any new items in a while, try refreshing
                if (newItems.length === 0 && forceRefreshDOM && stuckCounter > 0) {
                    // Try to force DOM refresh by moving back and forth
                    await scrollToPosition(scrollable, scrollable.scrollTop - 20);
                    await new Promise(resolve => setTimeout(resolve, config.scrollDelay));
                    await scrollToPosition(scrollable, scrollable.scrollTop + 20);
                    await new Promise(resolve => setTimeout(resolve, config.scrollDelay));
                }
            }
            
            // Force scroll to the absolute bottom if requested
            if (options.scrollToBottom) {
                log('Forcing scroll to absolute bottom of the list');
                
                // Try multiple approaches to reach the bottom
                const attemptScrollToBottom = async () => {
                    // 1. Use direct approach - scroll to a very large number (effectively bottom)
                    await scrollToPosition(scrollable, 999999);
                    await new Promise(resolve => setTimeout(resolve, config.scrollDelay * 2));
                    
                    // 2. If that didn't work, try the wheel approach
                    if (config.useWheelEventsAsFallback) {
                        for (let i = 0; i < 5; i++) {
                            simulateWheelEvent(scrollable, 1000); // Large positive value scrolls down
                            await new Promise(resolve => setTimeout(resolve, config.scrollDelay));
                        }
                    }
                    
                    // 3. Try one more direct scroll to max position for good measure
                    const scrollHeight = Math.max(scrollable.scrollHeight, maxPosition);
                    await scrollToPosition(scrollable, scrollHeight);
                };
                
                await attemptScrollToBottom();
                
                // Verify we've reached the bottom by checking for list end indicators
                const isAtBottom = Math.abs(scrollable.scrollTop + scrollable.clientHeight - scrollable.scrollHeight) < 5;
                log(`Reached absolute bottom: ${isAtBottom ? 'YES' : 'NO'}`);
                
                // Try once more if we haven't reached the bottom
                if (!isAtBottom) {
                    await new Promise(resolve => setTimeout(resolve, config.scrollDelay * 2));
                    await attemptScrollToBottom();
                }
            }
            
            // Return to the starting position if requested
            if (returnToStart) {
                log('Returning to starting position');
                await scrollToPosition(scrollable, startPosition);
            }
            
            return foundTarget || true;
            
        } catch (error) {
            console.error('Error scrolling through list:', error);
            return false;
        }
    }

    // Helper function to scroll directly to the absolute bottom of a list
    async function scrollToBottom() {
        try {
            // Find list and scrollable elements 
            const listElement = findVisibleList();
            const scrollable = getScrollableElement(listElement);
            
            log(`Scrolling directly to bottom of list`);
            
            // First try direct jump to force VS Code to load all items
            scrollable.scrollTop = scrollable.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Because VS Code might adjust the scrollHeight after loading more items,
            // do one more direct scroll to make sure we're at the bottom
            const maxScrollHeight = scrollable.scrollHeight;
            scrollable.scrollTop = maxScrollHeight;
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // One final check - if we're not at the bottom, try wheel events
            if (scrollable.scrollTop + scrollable.clientHeight < maxScrollHeight - 5) {
                log('Using wheel events to reach bottom');
                
                // Use a few wheel events for good measure
                for (let i = 0; i < 3; i++) {
                    simulateWheelEvent(scrollable, 1000);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // One final direct scroll
                scrollable.scrollTop = scrollable.scrollHeight;
            }
            
            // Just confirm we're at the bottom for debugging
            const bottomGap = Math.abs(scrollable.scrollHeight - scrollable.scrollTop - scrollable.clientHeight);
            log(`At bottom, gap: ${bottomGap}px`);
            
            return true;
        } catch (error) {
            console.error('Error scrolling to bottom:', error);
            return false;
        }
    }
    
    // Explore entire workspace by progressively loading all items from bottom to top
    async function exploreEntireWorkspace() {
        try {
            // Find list and scrollable elements 
            const listElement = findVisibleList();
            const scrollable = getScrollableElement(listElement);
            
            log(`Starting complete workspace exploration from BOTTOM to TOP`);
            
            // Track seen items to detect when we've reached the end
            const allSeenItems = new Set();
            let previousItemCount = 0;
            let noNewItemsStreak = 0;
            let totalNewItemsFound = 0;
            
            // Store initial position in case we need to restore it
            const startPosition = scrollable.scrollTop;
            
            // First scroll to the absolute bottom
            log(`First scrolling to bottom to start exploration...`);
            scrollable.scrollTop = scrollable.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Make sure we really reached the bottom
            scrollable.scrollTop = scrollable.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // First collect initial visible items at the bottom
            let currentItems = getVisibleItems(listElement);
            currentItems.forEach(item => {
                const itemText = item.textContent || item.innerText;
                allSeenItems.add(itemText);
            });
            previousItemCount = allSeenItems.size;
            
            log(`Initial visible items at bottom: ${previousItemCount}`);
            
            // Now progressively scroll UP until we don't discover new items
            while (noNewItemsStreak < 3) { // Try a few times before giving up
                // Get current position
                const currentScrollTop = scrollable.scrollTop;
                
                // If we're already at the top, break
                if (currentScrollTop <= 0) {
                    log(`Reached the top of scrollable area`);
                    break;
                }
                
                // Calculate next position (up)
                const nextPosition = Math.max(0, currentScrollTop - scrollable.clientHeight * 0.8);
                
                // Try to scroll up
                scrollable.scrollTop = nextPosition;
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // If we didn't move, try using wheel events (negative deltaY scrolls up)
                if (Math.abs(scrollable.scrollTop - currentScrollTop) < 10) {
                    log(`Direct scroll didn't work, using wheel events to scroll up`);
                    for (let i = 0; i < 5; i++) {
                        simulateWheelEvent(scrollable, -300);  // Negative for upward
                        await new Promise(resolve => setTimeout(resolve, 80));
                    }
                }
                
                // Collect new items after scrolling
                await new Promise(resolve => setTimeout(resolve, 300)); // Give time for VS Code to render
                currentItems = getVisibleItems(listElement);
                let newInThisScroll = 0;
                
                currentItems.forEach(item => {
                    const itemText = item.textContent || item.innerText;
                    if (!allSeenItems.has(itemText)) {
                        allSeenItems.add(itemText);
                        newInThisScroll++;
                        totalNewItemsFound++;
                    }
                });
                
                // Check if we found new items
                if (newInThisScroll > 0) {
                    log(`Found ${newInThisScroll} new items, total unique: ${allSeenItems.size}`);
                    noNewItemsStreak = 0;
                } else {
                    noNewItemsStreak++;
                    log(`No new items found (attempt ${noNewItemsStreak} of 3)`);
                }
                
                // If we reached very near the top, break
                if (scrollable.scrollTop < 10) {
                    log(`Reached the top of the list`);
                    break;
                }
            }
            
            // Final confirmation that we explored the whole workspace
            log(`Exploration complete: Found ${totalNewItemsFound} total new items`);
            log(`Total unique items discovered: ${allSeenItems.size}`);
            
            // One final scroll to the top to show the beginning items
            scrollable.scrollTop = 0;
            
            return allSeenItems.size;
        } catch (error) {
            console.error('Error exploring workspace:', error);
            return false;
        }
    }
    
    // Function to scroll to an item matching a selector
    async function scrollToItem(selector) {
        // Extend the selector to include direct text content matches
        const extendedSelector = typeof selector === 'string' && selector.indexOf(':contains') >= 0 
            ? selector  // JQuery-style selector with :contains, leave as is
            : [
                selector,
                `[title*="${selector}"]`,
                `[label*="${selector}"]`,
                `div:has(span:contains("${selector}"))`
              ].join(', ');
            
        return scrollEntireList({
            targetSelector: extendedSelector,
            scrollToEnd: false,
            onNewElementsFound: (items) => {
                log(`Found ${items.length} new item(s)`);
                items.forEach((item, i) => {
                    // Check for direct match or nested match
                    const matches = item.matches(extendedSelector) || item.querySelector(extendedSelector);
                    const text = item.textContent || item.innerText;
                    
                    if (matches || (typeof selector === 'string' && text && text.includes(selector))) {
                        log(`Found potential target item: ${text}`);
                    }
                });
            }
        });
    }
    
    // Function to click an item by its text content
    async function clickItemByText(textContent) {
        // Build a complex selector to try to match the item by text
        let foundItem = await scrollToItem(textContent);
        
        // If found, attempt to click it
        if (foundItem && foundItem !== true) {
            log(`Clicking item: ${textContent}`);
            foundItem.click();
            return true;
        }
        
        // Try a second pass if not found, using getAllItems
        log(`Trying alternative approach to find: ${textContent}`);
        const allItems = await getAllItems();
        foundItem = allItems.find(item => {
            const text = item.textContent || item.innerText || '';
            const title = item.getAttribute('title') || '';
            return text.includes(textContent) || title.includes(textContent);
        });
        
        if (foundItem) {
            log(`Found item via text search: ${textContent}`);
            foundItem.click();
            return true;
        }
        
        log(`Could not find item with text: ${textContent}`);
        return false;
    }
    
    // Get all items that have been rendered during our scrolling
    async function getAllItems() {
        const items = [];
        
        await scrollEntireList({
            onNewElementsFound: (newItems) => {
                items.push(...newItems);
            }
        });
        
        return items;
    }
    
    // A basic function that just scrolls directly to the bottom with no fancy detection logic
    async function scrollBottomAndStay() {
        try {
            // Simple and direct approach
            const listElement = findVisibleList();
            const scrollable = getScrollableElement(listElement);
            
            log('*** Starting direct scroll to bottom (no fancy detection) ***');
            
            // First go to the top
            log('First scrolling to top...');
            scrollable.scrollTop = 0;
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Do it gradually in chunks to ensure VS Code has time to update its virtualized list
            const maxPosition = scrollable.scrollHeight;
            const chunks = 4; // Do it in just a few big jumps
            
            for (let i = 1; i <= chunks; i++) {
                const targetPosition = Math.floor((maxPosition * i) / chunks);
                log(`Scrolling to position ${targetPosition} (chunk ${i}/${chunks})...`);
                
                // Direct DOM method, no fancy wrappers
                scrollable.scrollTop = targetPosition;
                
                // Give VS Code time to update the DOM
                await new Promise(resolve => setTimeout(resolve, 600));
            }
            
            // Do one final jump to the absolute bottom
            log('Final jump to absolute bottom...');
            scrollable.scrollTop = scrollable.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Double check we're at the bottom
            scrollable.scrollTop = scrollable.scrollHeight;
            
            log('Scroll complete. Current position:', scrollable.scrollTop);
            return true;
            
        } catch (error) {
            console.error('Error in direct scroll:', error);
            return false;
        }
    }
    
    // Simplest possible function to force scroll to the bottom using continuous scrolling
    function forceScrollToBottom() {
        try {
            const listElement = findVisibleList();
            const scrollable = getScrollableElement(listElement);
            
            // Log initial position
            log(`Starting force scroll. Initial position: ${scrollable.scrollTop}, height: ${scrollable.scrollHeight}`);
            
            // Create a counter to track progress
            let scrollAttempts = 0;
            let lastScrollHeight = scrollable.scrollHeight;
            let stuckCounter = 0;
            
            // Use interval for continuous scrolling
            const scrollInterval = setInterval(() => {
                scrollAttempts++;
                
                // Force scroll to bottom directly
                scrollable.scrollTop = scrollable.scrollHeight;
                
                // Log progress every few attempts
                if (scrollAttempts % 5 === 0) {
                    const currentPos = scrollable.scrollTop;
                    const maxPos = scrollable.scrollHeight;
                    log(`Scroll progress: At ${currentPos}/${maxPos} (${Math.round(currentPos / maxPos * 100)}%)`);
                    
                    // Detect if we're stuck
                    if (Math.abs(lastScrollHeight - scrollable.scrollHeight) < 1) {
                        stuckCounter++;
                    } else {
                        stuckCounter = 0;
                        lastScrollHeight = scrollable.scrollHeight;
                    }
                    
                    // If we're at the bottom or stuck for too long, we're done
                    const isAtBottom = (scrollable.scrollTop + scrollable.clientHeight + 5 >= scrollable.scrollHeight);
                    
                    if (isAtBottom || stuckCounter > 3 || scrollAttempts > 30) {
                        clearInterval(scrollInterval);
                        
                        // Ensure we're at the very bottom with one final scroll
                        setTimeout(() => {
                            scrollable.scrollTop = scrollable.scrollHeight;
                            log(`Force scroll complete. Final position: ${scrollable.scrollTop}/${scrollable.scrollHeight}`);
                        }, 200);
                    }
                }
            }, 300); // Try scrolling every 300ms
            
            // Return an object with a stop method
            return {
                stop: () => {
                    clearInterval(scrollInterval);
                    log('Scroll interval stopped manually');
                }
            };
        } catch (error) {
            console.error('Error in force scroll:', error);
            return { stop: () => {} };
        }
    }
    
    // Expose public API
    window.VSCodeScroller = {
        scrollEntireList,
        scrollToItem,
        clickItemByText,
        findVisibleList,
        getScrollableElement,
        getAllItems,
        simulateWheelEvent,
        scrollToBottom,
        exploreEntireWorkspace,
        scrollBottomAndStay, // Add this simple direct function
        forceScrollToBottom // Add our new simplest method
    };
    
    log('VS Code Scroller initialized and ready to use.');
    console.log(`
    Usage:
    - VSCodeScroller.scrollEntireList() - Scroll through entire list
    - VSCodeScroller.scrollToBottom() - Scroll to absolute bottom of list
    - VSCodeScroller.forceScrollToBottom() - SIMPLEST method to force scroll to bottom
    - VSCodeScroller.exploreEntireWorkspace() - Explore entire workspace, revealing all files
    - VSCodeScroller.scrollBottomAndStay() - Simple direct scroll to bottom (try this one!)
    - VSCodeScroller.scrollToItem('filename.txt') - Scroll until matching item found
    - VSCodeScroller.clickItemByText('filename.txt') - Scroll to and click item
    - VSCodeScroller.getAllItems() - Get all items after scrolling through list
    `);
    
    return window.VSCodeScroller;
})();
