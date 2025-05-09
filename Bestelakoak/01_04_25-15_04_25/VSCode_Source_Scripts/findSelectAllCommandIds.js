/**
 * Script to discover all selection-related commands in VS Code, especially "select all"
 * Run this in the Developer Tools console of VS Code
 */
(function() {
    console.log("VS Code Command ID Finder - Searching for selection commands...");
    
    const COMMAND_SOURCES = [
        {
            name: "Monaco Editor Commands",
            finder: () => {
                if (typeof monaco === 'undefined' || !monaco.editor) return [];
                
                // Get editor instances first
                const editors = monaco.editor.getEditors();
                if (!editors || !editors.length) return [];
                
                // Get all available actions from the first editor
                const editor = editors[0];
                if (!editor || !editor.getActions) return [];
                
                return editor.getActions().map(action => ({
                    id: action.id,
                    label: action.label || "No Label",
                    source: "Monaco Editor",
                    action: action
                }));
            }
        },
        {
            name: "VS Code CommandRegistry",
            finder: () => {
                try {
                    // Try to access VS Code's command registry if available
                    if (typeof require === 'function') {
                        const commandService = require('vs/platform/commands/common/commands');
                        if (commandService && commandService.CommandsRegistry) {
                            const commands = [];
                            commandService.CommandsRegistry.getCommands().forEach((value, key) => {
                                commands.push({
                                    id: key,
                                    label: value.description || "No Description",
                                    source: "VS Code CommandRegistry"
                                });
                            });
                            return commands;
                        }
                    }
                } catch (e) {
                    console.log("Could not access VS Code command registry:", e);
                }
                return [];
            }
        },
        {
            name: "DOM-Based Keybinding Inspector",
            finder: () => {
                // Look for keybinding data in the DOM
                const commands = [];
                
                // Try to find keybinding elements in the DOM
                const keybindingElements = document.querySelectorAll('[aria-label*="keyboard"]');
                if (keybindingElements.length) {
                    Array.from(keybindingElements).forEach(el => {
                        if (el.dataset && el.dataset.commandId) {
                            commands.push({
                                id: el.dataset.commandId,
                                label: el.getAttribute('aria-label') || "No Label",
                                source: "DOM Keybinding"
                            });
                        }
                    });
                }
                
                return commands;
            }
        }
    ];
    
    // Collect all commands from different sources
    let allCommands = [];
    COMMAND_SOURCES.forEach(source => {
        try {
            const commands = source.finder();
            console.log(`Found ${commands.length} commands from ${source.name}`);
            allCommands = allCommands.concat(commands);
        } catch (e) {
            console.error(`Error finding commands from ${source.name}:`, e);
        }
    });
    
    console.log(`Total commands found: ${allCommands.length}`);
    
    // Filter for selection-related commands
    const selectionCommands = allCommands.filter(cmd => 
        cmd.id.toLowerCase().includes('select') || 
        (cmd.label && cmd.label.toLowerCase().includes('select'))
    );
    
    // Further filter for 'select all' specifically
    const selectAllCommands = selectionCommands.filter(cmd => 
        cmd.id.toLowerCase().includes('selectall') ||
        cmd.id.toLowerCase().includes('select-all') ||
        cmd.id.toLowerCase().includes('select all') ||
        (cmd.label && cmd.label.toLowerCase().includes('select all'))
    );
    
    // Print results
    console.log("\n--- SELECTION COMMANDS ---");
    selectionCommands.forEach(cmd => {
        console.log(`ID: ${cmd.id} | Label: ${cmd.label} | Source: ${cmd.source}`);
    });
    
    console.log("\n--- SELECT ALL COMMANDS ---");
    if (selectAllCommands.length === 0) {
        console.log("No specific 'select all' commands found!");
        console.log("The standard command ID 'editor.action.selectAll' should still work.");
    } else {
        selectAllCommands.forEach(cmd => {
            console.log(`ID: ${cmd.id} | Label: ${cmd.label} | Source: ${cmd.source}`);
        });
    }
    
    // Try to execute select all with different command IDs
    console.log("\n--- TESTING SELECT ALL COMMANDS ---");
    const possibleSelectAllIds = [
        'editor.action.selectAll',
        'editor.selectAll',
        'selectAll',
        'workbench.action.selectAll',
        ...selectAllCommands.map(cmd => cmd.id)
    ];
    
    // Get unique command IDs
    const uniqueIds = [...new Set(possibleSelectAllIds)];
    
    // Try to execute each command if we have an editor
    if (typeof monaco !== 'undefined' && monaco.editor) {
        const editors = monaco.editor.getEditors();
        if (editors && editors.length > 0) {
            const editor = editors[0];
            
            // Test direct model range access - this is often more reliable than commands
            try {
                console.log("\n--- TESTING DIRECT MODEL RANGE ACCESS ---");
                const model = editor.getModel();
                if (model && typeof model.getFullModelRange === 'function') {
                    const fullRange = model.getFullModelRange();
                    console.log("Full model range:", fullRange);
                    
                    // Get text from this range
                    const fullText = model.getValueInRange(fullRange);
                    console.log(`Retrieved ${fullText.length} characters using direct model range access`);
                    console.log("First 50 chars:", fullText.substring(0, 50));
                    
                    // Demonstrate how to replace all content (commented out for safety)
                    console.log(`
To replace entire content, you can use:
editor.executeEdits("", [{
    range: editor.getModel().getFullModelRange(),
    text: "new content", 
    forceMoveMarkers: true
}]);`);
                    
                    console.log("✓ Direct model range access WORKED! This is the most reliable way to get full content.");
                } else {
                    console.log("✗ Model doesn't support getFullModelRange");
                }
            } catch (e) {
                console.log("✗ Error testing direct model range access:", e);
            }
            
            uniqueIds.forEach(id => {
                try {
                    console.log(`Testing command: ${id}`);
                    // Store selection before
                    const selBefore = editor.getSelection();
                    
                    // Try to execute the command
                    editor.trigger('findSelectAllCommandIds.js', id, {});
                    
                    // Check if selection changed
                    const selAfter = editor.getSelection();
                    const worked = selAfter && 
                                 (!selBefore || 
                                  selAfter.startLineNumber !== selBefore.startLineNumber || 
                                  selAfter.endLineNumber !== selBefore.endLineNumber);
                    
                    console.log(`Command ${id}: ${worked ? '✓ WORKED' : '✗ FAILED'}`);
                    
                    // Restore cursor position
                    if (worked) {
                        editor.setSelection({
                            startLineNumber: 1,
                            startColumn: 1,
                            endLineNumber: 1,
                            endColumn: 1
                        });
                    }
                } catch (e) {
                    console.log(`Command ${id}: ✗ ERROR - ${e.message}`);
                }
            });
        } else {
            console.log("No editor instances available to test commands");
        }
    } else {
        console.log("Monaco editor not available to test commands");
    }
    
    console.log("\n--- RECOMMENDED APPROACHES ---");
    console.log("1. Direct model range access: editor.getModel().getFullModelRange()");
    console.log("   This gives you the range of the entire document without needing commands.");
    console.log("   Example: model.getValueInRange(model.getFullModelRange())");
    console.log("2. Standard command: editor.action.selectAll");
    console.log("3. Direct model value: editor.getModel().getValue()");
    
    return {
        allCommands,
        selectionCommands,
        selectAllCommands
    };
})();
