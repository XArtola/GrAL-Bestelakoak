/**
 * Enhanced VS Code content extractor with large file support
 * Optimized for files of any size, including 400+ lines
 */
(async function() {
    console.clear();
    console.log("🔍 Starting enhanced extraction for large files...");
    
    // Find editor elements (single DOM query)
    const editorElement = document.querySelector('.monaco-editor');
    if (!editorElement) {
        console.error("❌ No editor found!");
        return null;
    }
    
    // Cache necessary DOM elements
    const textarea = editorElement.querySelector('textarea.inputarea');
    const scrollable = editorElement.querySelector('.monaco-scrollable-element');
    
    if (!textarea || !scrollable) {
        console.error("❌ Missing required editor components!");
        return null;
    }
    
    // PRE-SCROLL PHASE: Ensure the entire document is loaded
    console.log("📜 Pre-scrolling to ensure complete document is loaded...");
    
    // Store original position and dimensions
    const originalScroll = scrollable.scrollTop;
    const totalHeight = scrollable.scrollHeight;
    const viewportHeight = scrollable.clientHeight;
    
    // Scroll to ensure document is fully loaded
    async function preScroll() {
        // First scroll to bottom to force loading
        scrollable.scrollTop = totalHeight;
        await new Promise(r => setTimeout(r, 150));
        
        // Then scroll back to middle
        scrollable.scrollTop = totalHeight / 2;
        await new Promise(r => setTimeout(r, 150));
        
        // Then scroll to top for consistent starting point
        scrollable.scrollTop = 0;
        await new Promise(r => setTimeout(r, 150));
    }
    
    await preScroll();
    
    // APPROACH 1: Focused textarea + programmatic selection
    console.log("Attempting focused textarea selection...");
    textarea.focus();
    
    // Instead of KeyboardEvent, try direct Selection API approach first
    try {
        // Method A: Using document.execCommand
        if (document.execCommand) {
            document.execCommand('selectAll');
            await new Promise(r => setTimeout(r, 150));
            
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                const content = selection.toString();
                console.log(`✅ Selection via execCommand: ${content.length} characters`);
                return processResult(content);
            }
        }
    } catch (e) {
        console.log("execCommand selection failed:", e.message);
    }
    
    // Method B: Using KeyboardEvent
    try {
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'a', code: 'KeyA', keyCode: 65, ctrlKey: true, bubbles: true
        }));
        
        await new Promise(r => setTimeout(r, 150));
        
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            const content = selection.toString();
            console.log(`✅ Selection via KeyboardEvent: ${content.length} characters`);
            return processResult(content);
        }
    } catch (e) {
        console.log("KeyboardEvent selection failed:", e.message);
    }
    
    // APPROACH 2: Try direct access to Monaco model
    console.log("Attempting Monaco model access...");
    try {
        // Look for editor instance attached to the textarea or editor element
        const findEditorInstance = (element) => {
            // Common property names where editor instances might be stored
            const possibleProps = ['_modelData', 'editor', '_instance', '__editor'];
            
            for (const prop of possibleProps) {
                if (element[prop] && element[prop].getModel) {
                    return element[prop];
                }
            }
            
            // Look for properties that might contain the instance
            for (const key in element) {
                if (element[key] && typeof element[key] === 'object') {
                    if (element[key].getModel) {
                        return element[key];
                    }
                }
            }
            
            return null;
        };
        
        const editorInstance = findEditorInstance(textarea) || findEditorInstance(editorElement);
        
        if (editorInstance && editorInstance.getModel) {
            const model = editorInstance.getModel();
            if (model && model.getValue) {
                const content = model.getValue();
                if (content && content.length > 0) {
                    console.log(`✅ Direct model access: ${content.length} characters`);
                    return processResult(content);
                }
            }
        }
    } catch (e) {
        console.log("Monaco model access failed:", e.message);
    }
    
    // APPROACH 3: Fallback to DOM-based method for large files
    console.log("🔄 Falling back to DOM-based extraction for large files...");
    
    // Enhanced DOM extraction that accumulates lines by scrolling in chunks
    const extractedLines = new Map();
    
    // Extract visible lines at current scroll position
    const extractVisibleLines = () => {
        const viewLines = editorElement.querySelector('.view-lines');
        if (!viewLines) return 0;
        
        const lines = Array.from(viewLines.querySelectorAll('.view-line'));
        let newCount = 0;
        
        lines.forEach(line => {
            const top = parseInt(line.style.top) || 0;
            const text = line.textContent;
            if (text && !extractedLines.has(top)) {
                extractedLines.set(top, text);
                newCount++;
            }
        });
        
        return newCount;
    };
    
    // Scroll through the document with smaller steps for large files
    const scrollStep = Math.floor(viewportHeight * 0.7); // Smaller steps for more overlap
    let currentPos = 0;
    let lastLineCount = 0;
    let noNewContentCounter = 0;
    
    // Reset to top
    scrollable.scrollTop = 0;
    await new Promise(r => setTimeout(r, 150));
    
    // Initial extraction at top
    extractVisibleLines();
    
    // Progressive scrolling
    while (currentPos <= totalHeight + 1000) { // Add buffer at end
        currentPos += scrollStep;
        scrollable.scrollTop = currentPos;
        await new Promise(r => setTimeout(r, 100));
        
        const newLines = extractVisibleLines();
        console.log(`  Position ${Math.round(currentPos)}/${totalHeight}, found ${newLines} new lines (total: ${extractedLines.size})`);
        
        // Check if we're getting new content
        if (newLines === 0) {
            noNewContentCounter++;
            if (noNewContentCounter > 3) {
                // Try random positions before giving up
                if (noNewContentCounter <= 5) {
                    const randomPos = Math.floor(Math.random() * totalHeight);
                    console.log(`  No new content, trying random position: ${randomPos}`);
                    scrollable.scrollTop = randomPos;
                    await new Promise(r => setTimeout(r, 100));
                    extractVisibleLines();
                } else {
                    console.log("  No new content after multiple attempts, stopping");
                    break;
                }
            }
        } else {
            noNewContentCounter = 0;
        }
        
        // Another stopping condition - if we're not getting new lines after covering full height
        if (lastLineCount === extractedLines.size && currentPos > totalHeight) {
            console.log("  Line count stable and at end of document, stopping");
            break;
        }
        
        lastLineCount = extractedLines.size;
    }
    
    // Restore original position
    scrollable.scrollTop = originalScroll;
    
    // Construct final content in order
    if (extractedLines.size > 0) {
        const domContent = Array.from(extractedLines.entries())
            .sort((a, b) => a[0] - b[0])
            .map(entry => entry[1])
            .join('\n');
        
        console.log(`✅ DOM extraction complete: ${extractedLines.size} lines`);
        return processResult(domContent);
    }
    
    console.error("❌ All extraction methods failed!");
    return null;
    
    // Helper function to process and return the extracted content
    function processResult(content) {
        try {
            navigator.clipboard.writeText(content);
            console.log("📋 Content copied to clipboard");
        } catch (e) {
            console.log("⚠️ Clipboard access denied - content available in return value");
            
            // Store in a global variable for easy access
            window.extractedContent = content;
            console.log("\n📝 Full content stored in global variable 'extractedContent'");
        }
        
        // Show stats
        const lines = content.split('\n');
        console.log(`📊 Retrieved ${content.length} characters in ${lines.length} lines`);
        
        // Clear any selections we made
        try {
            window.getSelection().removeAllRanges();
        } catch (e) {}
        
        return content;
    }
})();

/**
 * ENHANCED FOR LARGE FILES:
 * ------------------------
 * 1. Added pre-scrolling phase to ensure content is loaded
 * 2. Tries multiple selection methods (execCommand, KeyboardEvent)
 * 3. Attempts direct Monaco model access if possible
 * 4. Enhanced DOM extraction with optimized scrolling and better stopping logic
 * 5. Improved line collection algorithm to handle virtualized content
 */
