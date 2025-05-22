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

// Main execution function
async function addCypressContext() {
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
            return;
        }
        
        // Step 2: Click on Add Context button
        await clickElement('#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attachment-toolbar > div > div > ul > li > a');
        
        // Wait for dropdown to appear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Press Enter to select Files & Folders
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
    } catch (error) {
        console.error("× Failed:", error.message);
    }
}

// Execute the automation
addCypressContext();
