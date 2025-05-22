// Script to simulate creating a new file via UI interactions in VS Code DevTools console.
// WARNING: This script relies on VS Code's internal DOM structure and class names,
// which can change between versions, potentially breaking the script. Use with caution.

/**
 * Finds the new file input box in the explorer, types the given file name, and simulates Enter.
 * @param {string} fileName - The name of the file to create.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function typeInNewFileInput(fileName) {
    let inputElement = null;
    // Common selectors for the input box when creating a new file in the explorer
    const selectors = [
        '.explorer-viewlet .monaco-list-row.editing .monaco-inputbox input', // Input in a list row that is actively being edited (often for new files)
        '.explorer-viewlet .explorer-item-editing input.input', // General selector for explorer item editing input
        '.explorer-viewlet .monaco-list-row.focused .monaco-inputbox input', // Input in a focused list row
        '.explorer-viewlet .monaco-list-row .monaco-inputbox input.synthetic-focus', // Input with synthetic focus
        '.explorer-viewlet .monaco-list .monaco-inputbox input:not([style*="display: none"]):not([disabled])', // Visible, enabled input in explorer list
        '.explorer-viewlet input:focus', // Any currently focused input in the explorer
        'input.input.synthetic-focus[aria-label^="New File"]', // More specific for new file input with synthetic focus
        '.explorer-viewlet .monaco-inputbox input[aria-label*="Name"]' // Input box with aria-label containing "Name"
    ];

    let retries = 50; // Try for 5 seconds (50 * 100ms)
    while (retries > 0) {
        for (const selector of selectors) {
            inputElement = document.querySelector(selector);
            if (inputElement && inputElement.offsetParent !== null) { // Check if element exists and is visible
                break;
            }
        }
        if (inputElement && inputElement.offsetParent !== null) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        retries--;
    }

    if (!inputElement || inputElement.offsetParent === null) {
        console.error("Could not find the new file input box in the explorer. Ensure it's active and visible. Current selectors might need adjustment for your VS Code version.");
        // Log currently focused element for debugging
        if (document.activeElement) {
            console.log("Currently focused element:", document.activeElement, "Tag:", document.activeElement.tagName, "Classes:", document.activeElement.className);
        }
        return false;
    }

    console.log("Found input box:", inputElement);
    inputElement.focus(); // Ensure the input element has focus

    // Set the file name
    inputElement.value = fileName;
    // Dispatch events to ensure VS Code's UI reacts to the change
    inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    // Simulate pressing Enter
    const enterKeyDownEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
    inputElement.dispatchEvent(enterKeyDownEvent);
    // Some UI frameworks might also listen for keyup
    const enterKeyUpEvent = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
    inputElement.dispatchEvent(enterKeyUpEvent);

    console.log(`Attempted to set filename to "${fileName}" and simulated Enter key press.`);
    return true;
}

/**
 * Main function to simulate the UI steps for creating a new file.
 */
async function simulateNewFileViaUI() {
    console.log("Starting UI simulation for new file creation...");
    const fileNameToCreate = "proba.txt";

    // Step 1: Focus on workspace (Explorer view)
    const explorerViewlet = document.querySelector('.explorer-viewlet');
    if (!explorerViewlet) {
        console.error("Explorer viewlet (.explorer-viewlet) not found.");
        return;
    }
    // Try to focus a more specific part of the explorer, like the list container
    const explorerListContainer = explorerViewlet.querySelector('.monaco-list');
    if (explorerListContainer) {
        explorerListContainer.focus();
        console.log("Focused on Explorer's list container.");
    } else {
        explorerViewlet.focus(); // Fallback
        console.log("Focused on Explorer viewlet.");
    }
    await new Promise(r => setTimeout(r, 200)); // Short delay for focus to settle

    // Step 2: Simulate Right click in the Explorer
    // Target the list rows container or a general scrollable area within the explorer
    let rightClickTarget = explorerViewlet.querySelector('.monaco-list-rows') || explorerViewlet.querySelector('.monaco-scrollable-element') || explorerViewlet;
    
    if (!rightClickTarget) {
        console.error("Could not find a suitable element in the explorer to right-click.");
        return;
    }

    const rect = rightClickTarget.getBoundingClientRect();
    // Click near the top-left of the target element to open context menu generally for the explorer
    const clickX = rect.left + Math.min(10, rect.width / 2);
    const clickY = rect.top + Math.min(10, rect.height / 2);

    console.log(`Simulating right-click at (${clickX.toFixed(0)}, ${clickY.toFixed(0)}) on element:`, rightClickTarget);
    // Dispatch mousedown, mouseup, and contextmenu events to simulate a right-click
    rightClickTarget.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true, cancelable: true, clientX: clickX, clientY: clickY }));
    rightClickTarget.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true, cancelable: true, clientX: clickX, clientY: clickY }));
    rightClickTarget.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: clickX, clientY: clickY }));
    
    await new Promise(r => setTimeout(r, 300)); // Wait for context menu to appear

    // Step 3: Select "New File..." from the context menu
    // Context menu items are typically within a '.context-view' container.
    // We look for an item associated with the 'explorer.newFile' command or matching text.
    const menuItems = document.querySelectorAll('.context-view [role="menuitem"], .context-view .action-item'); // Broadened selector slightly for action-item
    let newFileMenuItem = null;
    let clickableElement = null;

    for (const item of menuItems) {
        // Prioritize matching by data-action-id (more stable than text)
        // Check the item itself or its children for the action-id
        let actionId = item.dataset?.actionId;
        if (!actionId) {
            const anchorWithActionId = item.querySelector('[data-action-id]');
            if (anchorWithActionId) {
                actionId = anchorWithActionId.dataset.actionId;
            }
        }
        
        if (actionId === 'explorer.newFile' || actionId === 'fileExplorer.newFile') {
            newFileMenuItem = item;
            // Try to find the most specific clickable element, often an 'a' tag or a span inside
            clickableElement = item.querySelector('a.action-label, span.action-label') || item;
            break;
        }
    }
    
    // Fallback to text matching if no actionId match (less reliable due to localization)
    if (!newFileMenuItem) {
        for (const item of menuItems) {
            const textContent = (item.textContent || item.getAttribute('aria-label') || "").trim();
            // Common English text for "New File..."
            if ((textContent.includes("New File") || textContent.includes("New file")) && !textContent.toLowerCase().includes("folder")) { // Made text search more flexible
                newFileMenuItem = item;
                clickableElement = item.querySelector('a.action-label, span.action-label') || item;
                break;
            }
        }
    }

    if (newFileMenuItem && clickableElement) {
        console.log("Found 'New File...' menu item:", newFileMenuItem, "Clickable element:", clickableElement);
        
        // Simulate a more robust click
        const itemRect = clickableElement.getBoundingClientRect();
        const clientX = itemRect.left + itemRect.width / 2;
        const clientY = itemRect.top + itemRect.height / 2;

        clickableElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0, clientX, clientY }));
        clickableElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0, clientX, clientY }));
        clickableElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0, clientX, clientY }));
        
        console.log("Simulated mousedown, mouseup, and click on 'New File...' menu item.");

    } else {
        console.error("Could not find 'New File...' in the context menu. Available items:");
        menuItems.forEach(item => console.log(`- "${(item.textContent || item.getAttribute('aria-label') || "").trim()}" (actionId: ${item.dataset?.actionId || 'N/A'})`));
        // Clean up by trying to close the context menu if it's open
        document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
        return;
    }

    await new Promise(r => setTimeout(r, 500)); // Increased wait for the input box to appear in the explorer

    // Step 4: Write the file name ("proba.txt") and press Enter
    console.log(`Attempting to type "${fileNameToCreate}" into the new file input box...`);
    const success = await typeInNewFileInput(fileNameToCreate);

    if (success) {
        console.log(`File creation simulation for "${fileNameToCreate}" completed.`);
    } else {
        console.error(`Failed to type into new file input box for "${fileNameToCreate}".`);
    }
}

// To run this script:
// 1. Open VS Code.
// 2. Open the Developer Tools (Help > Toggle Developer Tools).
// 3. Go to the Console tab in DevTools.
// 4. Paste this entire script into the console and press Enter to define the functions.
// 5. Then, call the main simulation function by typing:
//    simulateNewFileViaUI();
//    and press Enter.
//
// The script will attempt to perform the actions. Watch the console for logs and errors.
// If it fails, the selectors or event simulation logic might need adjustment for your VS Code version.
