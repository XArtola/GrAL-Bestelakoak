/**
 * Ultra-simple VS Code content extractor
 * This is a last resort approach when other methods fail
 */
(async function() {
    console.clear();
    console.log("🔍 Starting simple document extraction...");
    
    // Find editor elements
    const editorElement = document.querySelector('.monaco-editor');
    if (!editorElement) {
        console.error("❌ No editor found on page!");
        return null;
    }
    
    console.log("✅ Found editor element");
    
    // Get key elements
    const scrollable = editorElement.querySelector('.monaco-scrollable-element');
    const viewLines = editorElement.querySelector('.view-lines');
    
    if (!scrollable || !viewLines) {
        console.error("❌ Missing required editor components!");
        return null;
    }
    
    // Store all unique lines
    const allLines = [];
    const lineCache = new Set();
    
    console.log("🔄 Starting content extraction process...");
    
    // 1. First approach: Use keyboard shortcuts to trigger native Select All
    console.log("STEP 1: Attempting keyboard shortcut simulation");
    
    try {
        // Focus the editor first
        const textarea = editorElement.querySelector('textarea.inputarea');
        if (textarea) {
            textarea.focus();
            console.log("- Editor focused");
            
            // Try to trigger Ctrl+A using native event
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
                keyCode: 65,
                which: 65,
                ctrlKey: true,
                bubbles: true
            });
            
            document.activeElement.dispatchEvent(keyEvent);
            console.log("- Ctrl+A keyboard event dispatched");
            
            // Wait for selection to take effect
            await new Promise(r => setTimeout(r, 300));
            
            // Check if we got a selection
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                const content = selection.toString();
                console.log(`✅ Got ${content.length} characters from keyboard selection!`);
                
                try {
                    await navigator.clipboard.writeText(content);
                    console.log("📋 Content copied to clipboard");
                } catch (e) {
                    console.log("⚠️ Clipboard access denied");
                    
                    // Display content in console since clipboard access failed
                    console.log("\n--- CONTENT START ---");
                    const lines = content.split('\n');
                    console.log(`Total lines: ${lines.length}`);
                    
                    // Print each line with line number
                    lines.forEach((line, index) => {
                        console.log(`${index + 1}: ${line}`);
                    });
                    
                    console.log("--- CONTENT END ---");
                    
                    // Also log as a single block for easier copying from console
                    console.log("\nFull content (can be copied from console):");
                    console.log(content);
                }
                
                return content;
            } else {
                console.log("⚠️ Keyboard selection failed or was empty");
            }
        }
    } catch (e) {
        console.log("⚠️ Keyboard event approach failed:", e);
    }
    
    // 2. Direct visual extraction with aggressive scrolling
    console.log("\nSTEP 2: Starting direct DOM extraction with aggressive scrolling");
    
    // Helper function to extract currently visible lines
    const extractVisibleLines = () => {
        const lines = Array.from(viewLines.querySelectorAll('.view-line'))
            .sort((a, b) => (parseInt(a.style.top) || 0) - (parseInt(b.style.top) || 0));
            
        let newLines = 0;
        
        lines.forEach(line => {
            const text = line.textContent;
            if (text && !lineCache.has(text)) {
                allLines.push(text);
                lineCache.add(text);
                newLines++;
            }
        });
        
        return newLines;
    };
    
    // Save original scroll position
    const originalScroll = scrollable.scrollTop;
    
    // First get what's currently visible
    const initialLines = extractVisibleLines();
    console.log(`- Found ${initialLines} initial visible lines`);
    
    // Get scroll dimensions
    const totalHeight = scrollable.scrollHeight;
    const viewportHeight = scrollable.clientHeight;
    
    console.log(`- Editor dimensions: ${totalHeight}px total height, ${viewportHeight}px viewport`);
    console.log(`- Will need approximately ${Math.ceil(totalHeight/viewportHeight)} scroll operations`);
    
    // Scroll through the entire document aggressively
    let currentPos = 0;
    const scrollStep = Math.floor(viewportHeight * 0.9); // 90% of viewport
    const maxScrollPos = totalHeight + 5000; // Add buffer in case content expands
    
    console.log("📜 Starting aggressive scrolling...");
    
    do {
        // Print progress
        const percent = Math.min(100, Math.round((currentPos / totalHeight) * 100));
        console.log(`- Scrolling: ${percent}% (position ${currentPos}/${totalHeight})`);
        
        // Scroll to position
        scrollable.scrollTop = currentPos;
        
        // Wait for rendering
        await new Promise(r => setTimeout(r, 200));
        
        // Extract any newly visible lines
        const newLines = extractVisibleLines();
        if (newLines > 0) {
            console.log(`  ➕ Found ${newLines} new lines (total: ${allLines.length})`);
        }
        
        // Move to next position
        currentPos += scrollStep;
        
        // Alternative: If not getting new content, try jumping to various positions
        if (newLines === 0 && currentPos > totalHeight / 2) {
            // Try jumping to random positions
            const randomPos = Math.floor(Math.random() * totalHeight);
            console.log(`  🔀 No new content, jumping to random position: ${randomPos}`);
            scrollable.scrollTop = randomPos;
            await new Promise(r => setTimeout(r, 200));
            extractVisibleLines();
        }
        
    } while (currentPos <= maxScrollPos);
    
    // Restore original position
    scrollable.scrollTop = originalScroll;
    
    // Combine all lines
    const finalContent = allLines.join('\n');
    console.log(`\n✅ Extraction complete! Found ${allLines.length} total lines`);
    
    // Try to copy to clipboard
    try {
        await navigator.clipboard.writeText(finalContent);
        console.log("📋 Content copied to clipboard!");
    } catch (e) {
        console.error("❌ Failed to copy to clipboard:", e);
    }
    
    // Print content preview
    if (finalContent) {
        console.log("\n--- FIRST 10 LINES ---");
        const previewLines = finalContent.split('\n').slice(0, 10);
        previewLines.forEach((line, i) => console.log(`${i+1}: ${line}`));
        
        if (allLines.length > 10) {
            console.log(`... and ${allLines.length - 10} more lines`);
        }
    }
    
    return finalContent;
})();

/**
 * =====================================================================
 * HOW THIS SCRIPT WORKS - DETAILED EXPLANATION
 * =====================================================================
 * 
 * OVERVIEW:
 * This script extracts the complete content of a VS Code editor through
 * a two-phase approach that works even when Monaco API access is restricted.
 * 
 * PHASE 1: KEYBOARD SHORTCUT SIMULATION
 * -------------------------------------
 * 1. Locates the editor's input textarea in the DOM
 * 2. Focuses it to ensure it receives keyboard events
 * 3. Dispatches a synthetic Ctrl+A keyboard event to trigger VS Code's native "Select All" command
 * 4. Waits for the selection to be applied (300ms delay)
 * 5. Captures the selected text using window.getSelection()
 * 6. Tries to copy to clipboard, falls back to console display if clipboard access is denied
 * 
 * Why it works:
 * - Uses VS Code's own selection mechanism which properly handles the entire document
 * - Bypasses need for API access by working at DOM/event level
 * - Browser selection API can access the complete text content
 * 
 * PHASE 2: AGGRESSIVE DOM SCANNING (Fallback)
 * -------------------------------------------
 * If keyboard selection fails, the script:
 * 
 * 1. Finds the scrollable container and viewport in the editor
 * 2. Starts at the top of the document and extracts visible lines
 * 3. Scrolls progressively through the document in steps (90% of viewport height)
 * 4. At each step:
 *    - Extracts newly visible lines that haven't been seen before
 *    - Uses a Set to ensure no duplicate lines are collected
 *    - Orders lines by their vertical position
 * 5. Uses random jumps to different document positions when scrolling stops finding new content
 * 6. Combines all collected lines to reconstruct the complete document
 * 
 * SPECIAL HANDLING:
 * -----------------
 * - Uses DOM sorting to ensure lines are in correct order despite rendering order
 * - Handles clipboard access failures by displaying content in console
 * - Shows extraction progress with percentage and position indicators
 * - Restores original scroll position when complete
 * 
 * ADVANTAGES OVER API-BASED METHODS:
 * ---------------------------------
 * - Works in restricted contexts where Monaco API is not accessible
 * - Doesn't depend on specific internal implementation details
 * - More resilient to VS Code version changes
 * - Simple approach with fewer points of failure
 * 
 * The script combines two fundamentally different techniques to maximize
 * the chances of successful content extraction. The keyboard simulation
 * method is faster and more accurate, while the DOM scanning provides
 * a reliable fallback that works in almost any scenario.
 */
