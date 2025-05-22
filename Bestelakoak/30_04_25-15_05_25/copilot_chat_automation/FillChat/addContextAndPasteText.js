/**
 * Lightweight script to automate context addition in VSCode chat
 * Run in VSCode DevTools console
 */

// Helper function to click an element
function clickElement(selector) {
    return new Promise((resolve, reject) => {
        try {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`Element not found: ${selector}`);
            element.click();
            setTimeout(resolve, 500);
        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to enter text in an input field
function enterText(selector, text) {
    return new Promise((resolve, reject) => {
        try {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`Input not found: ${selector}`);
            element.value = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(resolve, 500);
        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to focus an element
function focusElement(selector) {
    return new Promise((resolve, reject) => {
        try {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`Focus target not found: ${selector}`);
            element.focus();
            setTimeout(resolve, 500);
        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to simulate pressing Enter
function pressEnter(selector) {
    return new Promise((resolve, reject) => {
        try {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`Enter target not found: ${selector}`);
            element.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', 
                code: 'Enter', 
                keyCode: 13, 
                which: 13, 
                bubbles: true
            }));
            setTimeout(resolve, 500);
        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to check if an element exists
function elementExists(selector) {
    return document.querySelector(selector) !== null;
}

// Helper function to check if text is in an element
function elementContainsText(selector, text) {
    const element = document.querySelector(selector);
    if (!element) return false;
    return element.textContent.toLowerCase().includes(text.toLowerCase());
}

// Helper function to enter text into the chat input area
async function enterChatText(text) {
    try {
        console.log("Entering text in chat input...");
        
        // Target the chat input container
        const chatInputContainerSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar";
        
        // Get the actual input element (textarea) inside the container
        const container = document.querySelector(chatInputContainerSelector);
        if (!container) {
            throw new Error("Chat input container not found");
        }
        
        // Find the textarea within the container
        const textarea = container.querySelector('textarea');
        if (!textarea) {
            throw new Error("Chat textarea not found");
        }
        
        // Focus on the textarea
        textarea.focus();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try multiple methods to set the text
        
        // Method 1: Set value and dispatch input event
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Method 2: Use clipboard API as fallback
        if (!textarea.value) {
            const originalClipboard = await navigator.clipboard.readText().catch(() => '');
            await navigator.clipboard.writeText(text);
            
            // Execute paste command
            document.execCommand('paste');
            
            // Restore original clipboard
            await navigator.clipboard.writeText(originalClipboard);
        }
        
        // Method 3: Use insertText command as last resort
        if (!textarea.value) {
            document.execCommand('insertText', false, text);
        }
        
        console.log("✓ Text entered successfully");
        return true;
    } catch (error) {
        console.error("× Failed to enter text:", error.message);
        return false;
    }
}

// Helper function to click the send button and wait for response
async function clickSendAndWaitForResponse() {
    try {
        console.log("Clicking send button and waiting for response...");
        
        // Send button selector
        const sendButtonSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-input-toolbars > div.monaco-toolbar.chat-execute-toolbar > div > ul > li.action-item.monaco-dropdown-with-primary > div.action-container.menu-entry > a";
        
        // Check if the send button exists
        const sendButton = document.querySelector(sendButtonSelector);
        if (!sendButton) {
            throw new Error("Send button not found");
        }
        
        // Click the send button
        sendButton.click();
        console.log("Send button clicked, waiting for response...");
        
        // Wait for the response to complete by checking when the button changes back
        // The stop button has the same selector but different classes/aria-label
        let isResponding = true;
        const maxWaitTime = 120000; // 2 minutes maximum wait time
        const startTime = Date.now();
        
        // Poll for button state change
        while (isResponding && (Date.now() - startTime < maxWaitTime)) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
            
            const currentButton = document.querySelector(sendButtonSelector);
            
            if (!currentButton) {
                console.log("Button disappeared from DOM");
                continue;
            }
            
            // Check if it's still the stop button (during response generation)
            const isStopButton = 
                currentButton.classList.contains("codicon-stop-circle") || 
                currentButton.getAttribute("aria-label")?.includes("Cancel");
            
            if (!isStopButton) {
                // Button changed back to send button, response is complete
                isResponding = false;
                console.log("✓ Response generation completed");
            }
        }
        
        if (isResponding) {
            console.log("⚠ Maximum wait time reached, response may not be complete");
        }
        
        return !isResponding;
    } catch (error) {
        console.error("× Failed to send or wait for response:", error.message);
        return false;
    }
}

// Helper function to ensure the "Files & Folders" option is selected
async function ensureFilesAndFoldersSelected() {
    try {
        console.log("Verifying 'Files & Folders' option is selected...");
        
        // Wait a moment for the dropdown to fully appear
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Find all dropdown items
        const listItems = document.querySelectorAll('.quick-input-list .monaco-list-row');
        let hasOpenEditors = false;
        let filesAndFoldersIndex = -1;
        
        // First check if we have "Open editors" as the first item
        // and determine the position of "Files & Folders"
        for (let i = 0; i < listItems.length; i++) {
            const item = listItems[i];
            const itemText = item.textContent.toLowerCase();
            
            if (itemText.includes('open editors')) {
                hasOpenEditors = true;
            }
            
            if (itemText.includes('files & folders') || itemText.includes('files and folders')) {
                filesAndFoldersIndex = i;
                break;
            }
        }
        
        console.log(`Has Open Editors: ${hasOpenEditors}, Files & Folders index: ${filesAndFoldersIndex}`);
        
        // If we found Files & Folders, try direct click
        if (filesAndFoldersIndex >= 0) {
            try {
                console.log("Found 'Files & Folders' option at index " + filesAndFoldersIndex + ", clicking directly");
                listItems[filesAndFoldersIndex].click();
                await new Promise(resolve => setTimeout(resolve, 500));
                return true;
            } catch (e) {
                console.log("Direct click failed, will try keyboard navigation");
            }
        }
        
        // If direct click failed or we couldn't find the item, use keyboard navigation
        console.log("Using keyboard navigation to select 'Files & Folders'");
        
        // Get the focused/active element which should be the list
        const listBox = document.querySelector('.quick-input-list');
        if (!listBox) {
            console.log("Could not find list box");
            return false;
        }
        
        // Press down key the appropriate number of times
        if (hasOpenEditors) {
            console.log("'Open editors' detected as first item - will press down key twice");
            // Press down twice to get to Files & Folders (passing Open editors and Open files)
            await pressDownKey(listBox);
            await new Promise(resolve => setTimeout(resolve, 300));
            await pressDownKey(listBox);
        } else {
            console.log("'Open editors' not detected - will press down key once");
            // Press down once to select Files & Folders
            await pressDownKey(listBox);
        }
        
        // Check if we managed to select Files & Folders
        await new Promise(resolve => setTimeout(resolve, 500));
        const selectedItems = document.querySelectorAll('.quick-input-list .monaco-list-row.focused, .quick-input-list .monaco-list-row.selected, .quick-input-list .monaco-list-row[aria-selected="true"]');
        
        if (selectedItems.length > 0) {
            const selectedItem = selectedItems[0];
            if (selectedItem.textContent.toLowerCase().includes('files & folders') || 
                selectedItem.textContent.toLowerCase().includes('files and folders')) {
                console.log("✓ 'Files & Folders' option is now selected");
                return true;
            } else {
                console.log("⚠ Selected item is not 'Files & Folders': " + selectedItem.textContent);
            }
        }
        
        console.log("⚠ Unable to confirm 'Files & Folders' is selected");
        return false;
    } catch (error) {
        console.error("× Error ensuring 'Files & Folders' selection:", error.message);
        return false;
    }
}

// Helper function to press down key
async function pressDownKey(element) {
    try {
        console.log("Pressing DOWN arrow key");
        const downEvent = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true
        });
        element.dispatchEvent(downEvent);
        return true;
    } catch (e) {
        console.error("Failed to dispatch down arrow key event:", e);
        return false;
    }
}

// Main execution function
async function addCypressContextAndText(text = "Please analyze this codebase and explain its architecture") {
    try {
        // Step 1: Check if chat is already open, if not, click on chat button
        const chatPanelSelector = '#workbench\\.panel\\.chat';
        const chatButtonSelector = '#workbench\\.parts\\.titlebar > div > div.titlebar-center > div > div > div > div > ul > li.action-item.monaco-dropdown-with-primary > div.action-container.menu-entry';
        
        if (!elementExists(chatPanelSelector)) {
            await clickElement(chatButtonSelector);
            // Wait for chat UI to fully load
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Check if Cypress context is already added
        const contextAttachmentSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attached-context > div";
        
        if (elementExists(contextAttachmentSelector) && 
            elementContainsText(contextAttachmentSelector, "cypress-realworld-app")) {
            console.log("✓ Cypress context is already added");
        } else {
            // Step 2: Click on Add Context button
            await clickElement('#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attachment-toolbar > div > div > ul > li > a');
            
            // Wait for dropdown to appear
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 3: Ensure Files & Folders is selected before pressing Enter
            await ensureFilesAndFoldersSelected();
            
            // Now press Enter to select
            await pressEnter('.quick-input-widget .monaco-list-rows');
            
            // Step 4: Focus and enter text in search field
            const inputSelector = "body > div.file-icons-enabled.enable-motion.monaco-workbench.windows.chromium.maximized.vs-dark.vscode-theme-defaults-themes-dark_plus-json > div.quick-input-widget.show-file-icons > div.quick-input-header > div.quick-input-and-message > div.quick-input-filter > div.quick-input-box > div > div.monaco-inputbox.idle > div > input";
            await focusElement(inputSelector);
            await enterText(inputSelector, 'Cypress-realworld-app');
            
            // Wait briefly for search results
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 5: Press enter to select the result
            await focusElement(inputSelector);
            await pressEnter(inputSelector);
            
            console.log("✓ Context added successfully");
            
            // Wait for the context to be fully added
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Step 6: Enter text in the chat input field
        await enterChatText(text);
        
        // Step 7: Click send button and wait for response
        await clickSendAndWaitForResponse();
        
        console.log("✓ All steps completed successfully, response has been generated");
    } catch (error) {
        console.error("× Failed:", error.message);
    }
}

// Execute the automation with default text or specify your own
addCypressContextAndText();
// Or with custom text:
// addCypressContextAndText("Analyze this Cypress app and suggest improvements");
