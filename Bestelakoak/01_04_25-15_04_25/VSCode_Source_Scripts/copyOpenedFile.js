/**
 * Ultra-lightweight VS Code content extractor - Keyboard Shortcut Only Version
 * Based on testing results showing keyboard shortcut method is most reliable
 */
(async function() {
    console.clear();
    console.log("🔍 Starting extraction (keyboard shortcut only)...");
    
    // Find editor elements (single DOM query)
    const editorElement = document.querySelector('.monaco-editor');
    if (!editorElement) {
        console.error("❌ No editor found!");
        return null;
    }
    
    // Get textarea to focus
    const textarea = editorElement.querySelector('textarea.inputarea');
    if (!textarea) {
        console.error("❌ No textarea element found!");
        return null;
    }
    
    // Focus editor and trigger Ctrl+A shortcut
    textarea.focus();
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a', code: 'KeyA', keyCode: 65, ctrlKey: true, bubbles: true
    }));
    
    // Wait for selection to take effect
    await new Promise(r => setTimeout(r, 150));
    
    // Get selection
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
        console.error("❌ Failed to select editor content!");
        return null;
    }
    
    // Extract content
    const content = selection.toString();
    console.log(`✅ Successfully retrieved ${content.length} characters!`);
    
    // Try to copy to clipboard
    try {
        await navigator.clipboard.writeText(content);
        console.log("📋 Content copied to clipboard");
    } catch (e) {
        console.log("⚠️ Clipboard access denied - content available in return value");
        
        // Format and display content when clipboard fails
        console.log("\n--- CONTENT PREVIEW ---");
        const lines = content.split('\n');
        console.log(`Total lines: ${lines.length}`);
        
        // Print limited preview
        const previewLines = Math.min(lines.length, 20);
        for (let i = 0; i < previewLines; i++) {
            console.log(`${i + 1}: ${lines[i]}`);
        }
        
        if (lines.length > previewLines) {
            console.log(`... and ${lines.length - previewLines} more lines`);
        }
        
        // Store in a global variable for easy access in console
        window.extractedContent = content;
        console.log("\n📝 Full content stored in global variable 'extractedContent'");
        console.log("You can access it by typing 'extractedContent' in the console");
    }
    
    // Clear selection to avoid interference with editor
    const clearSelection = () => {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    };
    setTimeout(clearSelection, 100);
    
    return content;
})();

/**
 * HOW THIS SCRIPT WORKS
 * ---------------------
 * SIMPLIFIED IMPLEMENTATION:
 * 1. Focuses the editor's textarea
 * 2. Dispatches a Ctrl+A keyboard event
 * 3. Captures the selected text via window.getSelection()
 * 4. Makes content available via clipboard or global variable
 * 
 * This version removes the DOM extraction approach since testing showed
 * the keyboard shortcut method works reliably with your VS Code setup.
 */
