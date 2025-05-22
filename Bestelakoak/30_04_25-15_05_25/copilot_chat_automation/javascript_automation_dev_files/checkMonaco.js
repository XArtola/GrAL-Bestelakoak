/**
 * Diagnostic script to check if Monaco editor is available
 * Run this in the VS Code Developer Tools console
 */
(function checkMonacoAvailability() {
    console.log("🔍 Checking for Monaco editor availability...");
    console.log("📊 Environment info:", navigator.userAgent);
    
    let diagnosticResults = {
        monacoInWindow: false,
        monacoEditorInWindow: false,
        editorInstances: 0,
        domElements: 0,
        possibleAlternativeAccess: [],
        detailedChecks: []
    };
    
    // Check 1: Direct Monaco access
    try {
        diagnosticResults.monacoInWindow = typeof monaco !== 'undefined';
        console.log(`Monaco global object: ${diagnosticResults.monacoInWindow ? '✅ Available' : '❌ Not available'}`);
        
        if (diagnosticResults.monacoInWindow) {
            diagnosticResults.monacoEditorInWindow = typeof monaco.editor !== 'undefined';
            console.log(`Monaco editor API: ${diagnosticResults.monacoEditorInWindow ? '✅ Available' : '❌ Not available'}`);
            
            if (diagnosticResults.monacoEditorInWindow) {
                const editors = monaco.editor.getEditors();
                diagnosticResults.editorInstances = editors.length;
                console.log(`Monaco editor instances: ${diagnosticResults.editorInstances} found`);
                
                if (editors.length > 0) {
                    // Check editor capabilities
                    const firstEditor = editors[0];
                    console.log(`Editor instance has getModel: ${typeof firstEditor.getModel === 'function' ? '✅ Yes' : '❌ No'}`);
                    console.log(`Editor instance has trigger: ${typeof firstEditor.trigger === 'function' ? '✅ Yes' : '❌ No'}`);
                    
                    // Check model
                    const model = firstEditor.getModel();
                    if (model) {
                        console.log(`Editor model found: ✅ Yes`);
                        console.log(`Model has getValue: ${typeof model.getValue === 'function' ? '✅ Yes' : '❌ No'}`);
                        console.log(`Model has getFullModelRange: ${typeof model.getFullModelRange === 'function' ? '✅ Yes' : '❌ No'}`);
                    } else {
                        console.log(`Editor model found: ❌ No`);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error checking monaco global object:", e);
    }
    
    // Check 2: DOM-based checks
    try {
        const editorElements = document.querySelectorAll('.monaco-editor');
        diagnosticResults.domElements = editorElements.length;
        console.log(`Monaco editor DOM elements: ${diagnosticResults.domElements} found`);
        
        if (editorElements.length > 0) {
            // Enhanced DOM analysis
            console.log("\n--- DETAILED DOM ANALYSIS ---");
            editorElements.forEach((editor, index) => {
                console.log(`Editor Element #${index + 1}:`);
                console.log(`  - Class names: ${editor.className}`);
                console.log(`  - Dimensions: ${editor.offsetWidth}x${editor.offsetHeight}`);
                
                // Check if this looks like an active editor
                const isVisible = editor.offsetWidth > 0 && editor.offsetHeight > 0;
                const hasInputArea = !!editor.querySelector('textarea.inputarea');
                const hasViewLines = !!editor.querySelector('.view-lines');
                const lineCount = editor.querySelectorAll('.view-line').length;
                
                console.log(`  - Visible: ${isVisible ? '✅' : '❌'}`);
                console.log(`  - Has input area: ${hasInputArea ? '✅' : '❌'}`);
                console.log(`  - Has view lines: ${hasViewLines ? '✅' : '❌'}`);
                console.log(`  - Visible lines: ${lineCount}`);
                
                if (hasViewLines && lineCount > 0) {
                    // Try to extract content from this editor element
                    console.log("\n  📄 Attempting DOM-based content extraction:");
                    
                    // Method 1: Get content from view lines
                    try {
                        const viewLines = editor.querySelector('.view-lines');
                        const lines = Array.from(viewLines.querySelectorAll('.view-line'));
                        
                        // Sort lines by their vertical position
                        lines.sort((a, b) => {
                            const aTop = parseInt(a.style.top) || 0;
                            const bTop = parseInt(b.style.top) || 0;
                            return aTop - bTop;
                        });
                        
                        const content = lines.map(line => line.textContent).join('\n');
                        console.log(`  ✓ DOM Method: Extracted ${content.length} characters, ${lines.length} lines`);
                        
                        // Show sample
                        if (content.length > 0) {
                            console.log(`  📝 First 50 chars: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
                            console.log(`  Note: This may be incomplete if not all lines are rendered in the view`);
                        }
                    } catch (e) {
                        console.log(`  ❌ DOM content extraction failed:`, e);
                    }
                }
            });
            
            // DOM-based approaches for content access
            console.log("\n--- DOM-BASED CONTENT ACCESS OPTIONS ---");
            console.log("Since Monaco API is not directly accessible, try these techniques:");
            
            console.log(`
1. Use keyboard shortcut simulation:
   document.querySelector('textarea.inputarea').focus();
   document.execCommand('selectAll');
   document.execCommand('copy');
   // Content now in clipboard
`);

            console.log(`
2. Direct DOM content extraction:
   const lines = Array.from(document.querySelector('.view-lines').querySelectorAll('.view-line'));
   lines.sort((a, b) => parseInt(a.style.top || 0) - parseInt(b.style.top || 0));
   const content = lines.map(line => line.textContent).join('\\n');
   // Note: This will only get currently rendered lines
`);

            console.log(`
3. Force rendering more content:
   // Scroll through document to force rendering
   const scrollable = document.querySelector('.monaco-scrollable-element');
   const originalScroll = scrollable.scrollTop;
   
   // Scroll to bottom then back to original position
   const scrollDown = () => {
     scrollable.scrollTop = scrollable.scrollHeight;
     setTimeout(() => scrollable.scrollTop = originalScroll, 100);
   };
   
   scrollDown();
   // Then use approach #2 to extract content
`);
        }
    } catch (e) {
        console.error("Error performing DOM checks:", e);
    }
    
    // Check 3: Look for monaco in window properties
    try {
        for (const prop of Object.getOwnPropertyNames(window)) {
            try {
                const obj = window[prop];
                if (obj && typeof obj === 'object' && obj.editor && typeof obj.editor.getModels === 'function') {
                    diagnosticResults.possibleAlternativeAccess.push(prop);
                }
            } catch (e) {
                // Skip properties that can't be accessed
            }
        }
        
        if (diagnosticResults.possibleAlternativeAccess.length > 0) {
            console.log(`✅ Found alternative Monaco access via: ${diagnosticResults.possibleAlternativeAccess.join(', ')}`);
            
            // Check first alternative
            const altProp = diagnosticResults.possibleAlternativeAccess[0];
            const altMonaco = window[altProp];
            if (altMonaco && altMonaco.editor) {
                const altEditors = altMonaco.editor.getEditors();
                console.log(`Alternative access editors: ${altEditors.length} found`);
            }
        } else {
            console.log(`❌ No alternative Monaco access found in window properties`);
        }
    } catch (e) {
        console.error("Error checking window properties:", e);
    }
    
    // Conclusion and guidance
    console.log("\n--- DIAGNOSIS SUMMARY ---");
    
    if (diagnosticResults.monacoEditorInWindow && diagnosticResults.editorInstances > 0) {
        console.log("✅ MONACO EDITOR IS AVAILABLE AND WORKING");
        console.log("You can use the editor scripts in this environment.");
    } 
    else if (diagnosticResults.possibleAlternativeAccess.length > 0) {
        console.log("⚠️ MONACO EDITOR MAY BE AVAILABLE VIA ALTERNATIVE ACCESS");
        console.log(`Try using window.${diagnosticResults.possibleAlternativeAccess[0]} instead of monaco directly.`);
    }
    else if (diagnosticResults.domElements > 0) {
        console.log("⚠️ MONACO EDITOR DOM ELEMENTS FOUND BUT API IS NOT ACCESSIBLE");
        console.log("This suggests you're in a VS Code context without direct API access.");
        console.log("USE THE DOM-BASED CONTENT ACCESS OPTIONS SHOWN ABOVE");
        console.log("This is common in webviews or certain integrated panels within VS Code.");
        
        // Create a utility function for DOM-based content extraction
        const extractContentFromDOM = `
// Copy this function to extract content via DOM:
function getEditorContentFromDOM() {
  // Focus any textarea first (helps with keyboard simulation)
  const textarea = document.querySelector('textarea.inputarea');
  if (textarea) textarea.focus();
  
  // Find the editor containing visible content
  const editors = document.querySelectorAll('.monaco-editor');
  let bestEditor = null;
  let maxLines = 0;
  
  for (const editor of editors) {
    const lineCount = editor.querySelectorAll('.view-line').length;
    if (lineCount > maxLines) {
      maxLines = lineCount;
      bestEditor = editor;
    }
  }
  
  if (!bestEditor) return null;
  
  // Get and sort lines
  const lines = Array.from(bestEditor.querySelectorAll('.view-line'));
  lines.sort((a, b) => (parseInt(a.style.top) || 0) - (parseInt(b.style.top) || 0));
  return lines.map(line => line.textContent).join('\\n');
}

// You can then use it like:
const content = getEditorContentFromDOM();
console.log(content);
`;
        
        console.log("\nUTILITY FUNCTION:");
        console.log(extractContentFromDOM);
    }
    else {
        console.log("❌ MONACO EDITOR NOT DETECTED");
        console.log("Make sure you're running this script in:");
        console.log("1. VS Code's Developer Tools console (F12 or Ctrl+Shift+I)");
        console.log("2. With a text editor open and active");
        console.log("3. The correct context (some webviews might restrict access)");
    }
    
    return diagnosticResults;
})();
