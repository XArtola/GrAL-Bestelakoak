/**
 * VS Code Editor Content Extractor using Keyboard Shortcut Simulation
 * Run in VS Code's Developer Tools console to extract text from editors
 * that don't expose the Monaco API directly
 */
(function extractEditorContent() {
    console.log("🔍 VS Code Keyboard Shortcut Extractor starting...");
    
    // Find editor's input textarea
    const textareas = document.querySelectorAll('textarea.inputarea');
    if (!textareas || textareas.length === 0) {
        console.error("❌ No editor textarea found! Are you in an editor context?");
        return null;
    }
    
    console.log(`Found ${textareas.length} editor textareas`);
    
    // Find the most likely active textarea (in a visible editor)
    let bestTextarea = textareas[0];
    if (textareas.length > 1) {
        // Try to find visible textarea with focus or in a visible editor
        for (const textarea of textareas) {
            const editorElement = textarea.closest('.monaco-editor');
            // Prefer the textarea that's in a focused editor or visible
            if (editorElement && (
                editorElement.classList.contains('focused') || 
                (editorElement.offsetWidth > 0 && editorElement.offsetHeight > 0)
            )) {
                bestTextarea = textarea;
                break;
            }
        }
    }
    
    console.log("Executing steps:");
    
    try {
        // Step 1: Focus the textarea
        console.log("1. Focusing editor textarea...");
        bestTextarea.focus();
        
        // Give browser a moment to process the focus
        setTimeout(() => {
            try {
                // Step 2: Select all text
                console.log("2. Selecting all text with execCommand...");
                document.execCommand('selectAll');
                
                // Step 3: Copy to clipboard
                console.log("3. Copying selection to clipboard...");
                const copySuccess = document.execCommand('copy');
                
                // If we didn't get a good selection, try programmatic keyboard shortcuts
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed || selection.toString().split('\n').length <= 1) {
                    console.log("⚠️ Single-line or no selection detected. Trying alternative approaches...");
                    
                    // Approach 1: Try simulating actual Ctrl+A keyboard event
                    try {
                        console.log("Trying programmatic Ctrl+A keyboard event...");
                        bestTextarea.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'a',
                            code: 'KeyA',
                            keyCode: 65,
                            which: 65,
                            ctrlKey: true,
                            bubbles: true
                        }));
                        
                        // Give it a moment to process
                        setTimeout(() => {
                            document.execCommand('copy');
                            console.log("Keyboard event dispatched - check clipboard");
                        }, 100);
                    } catch (kbdErr) {
                        console.error("Keyboard event simulation failed:", kbdErr);
                    }
                    
                    // Approach 2: Try DOM-based extraction as fallback
                    console.log("Attempting DOM-based extraction as fallback...");
                    try {
                        const editorElement = bestTextarea.closest('.monaco-editor');
                        if (editorElement) {
                            // Get lines container
                            const linesContainer = editorElement.querySelector('.view-lines');
                            if (linesContainer) {
                                // Find all visible lines and sort them by position
                                const visibleLines = Array.from(linesContainer.querySelectorAll('.view-line'));
                                if (visibleLines.length > 0) {
                                    visibleLines.sort((a, b) => {
                                        return (parseInt(a.style.top) || 0) - (parseInt(b.style.top) || 0);
                                    });
                                    
                                    // Extract text content from visible lines
                                    const visibleContent = visibleLines.map(line => line.textContent).join('\n');
                                    console.log(`📄 Extracted ${visibleContent.length} characters from ${visibleLines.length} visible lines`);
                                    console.log("Preview:", visibleContent.substring(0, 100) + (visibleContent.length > 100 ? "..." : ""));
                                    
                                    // Copy visible content to clipboard directly
                                    navigator.clipboard.writeText(visibleContent)
                                        .then(() => console.log("✅ DOM content copied to clipboard!"))
                                        .catch(clipErr => console.error("Navigator clipboard failed:", clipErr));
                                    
                                    // Attempt to scroll to load more content
                                    const scrollable = editorElement.querySelector('.monaco-scrollable-element');
                                    if (scrollable) {
                                        const originalScroll = scrollable.scrollTop;
                                        console.log("Scrolling to reveal more content...");
                                        
                                        // Scroll down then back up to trigger rendering more lines
                                        scrollable.scrollTop = scrollable.scrollHeight;
                                        setTimeout(() => {
                                            // After scrolling down, try to get all lines again
                                            const allLines = Array.from(linesContainer.querySelectorAll('.view-line'));
                                            allLines.sort((a, b) => {
                                                return (parseInt(a.style.top) || 0) - (parseInt(b.style.top) || 0);
                                            });
                                            
                                            const fullContent = allLines.map(line => line.textContent).join('\n');
                                            if (fullContent.length > visibleContent.length) {
                                                console.log(`📈 After scrolling: Found ${allLines.length} lines (${fullContent.length} chars)`);
                                                navigator.clipboard.writeText(fullContent)
                                                    .then(() => console.log("✅ Full DOM content copied to clipboard!"))
                                                    .catch(fullClipErr => console.error("Full clipboard write failed:", fullClipErr));
                                            }
                                            
                                            // Restore original scroll position
                                            scrollable.scrollTop = originalScroll;
                                        }, 300);
                                    }
                                }
                            }
                        }
                    } catch (domErr) {
                        console.error("DOM extraction fallback failed:", domErr);
                    }
                }

                if (copySuccess) {
                    console.log("✅ Content successfully copied to clipboard!");
                    console.log("📋 You can now paste the content elsewhere (Ctrl+V)");
                } else {
                    console.error("❌ Copy command failed! This may be due to permissions.");
                    console.log("Try using Ctrl+A and Ctrl+C manually on the editor.");
                }
                
                // Step 4: Provide user feedback based on selected content
                if (selection && !selection.isCollapsed) {
                    const selectedText = selection.toString();
                    if (selectedText) {
                        console.log(`📄 Selected ${selectedText.length} characters`);
                        const lineCount = selectedText.split('\n').length;
                        console.log(`📝 Contains ${lineCount} lines`);
                        if (selectedText.length > 100) {
                            console.log("Preview:", selectedText.substring(0, 100) + "...");
                        } else {
                            console.log("Content:", selectedText);
                        }
                    }
                } else {
                    console.log("⚠️ No visible selection. The content may still be in clipboard.");
                }
                
            } catch (e) {
                console.error("Error during selection/copy commands:", e);
            }
        }, 100);
    } catch (e) {
        console.error("Failed to access editor textarea:", e);
    }
    
    return "Extraction process initiated - check clipboard for content";
})();
