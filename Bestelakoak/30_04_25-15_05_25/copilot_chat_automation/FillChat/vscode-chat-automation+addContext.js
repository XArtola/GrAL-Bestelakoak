/**
 * Script to automate VSCode Copilot chat interactions
 * To be run in the VSCode DevTools console
 */
async function automateVSCodeCopilotChat(textToSend) {
  // Helper functions
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const waitForElement = (selector, timeout = 10000) => {
    console.log(`Waiting for element: ${selector}`);
    return new Promise((resolve, reject) => {
      // Check if element already exists
      const existingElement = document.querySelector(selector);
      if (existingElement) return resolve(existingElement);
      
      // Set up timeout and observer
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element not found: ${selector}`));
      }, timeout);
      
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          obs.disconnect();
          resolve(element);
        }
      });
      
      // Start observing
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      
      // Also poll periodically as a backup strategy
      const pollInterval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          clearInterval(pollInterval);
          observer.disconnect();
          resolve(element);
        }
      }, 500);
    });
  };

  // Find any element matching a list of selectors
  const findAnyElement = async (selectors, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
      await wait(200);
    }
    return null;
  };

  const findElementByText = (selector, text) => {
    return Array.from(document.querySelectorAll(selector))
      .find(el => el.textContent.includes(text));
  };
  
  // Add a helper to safely check if an element is a valid DOM element
  const isDOMElement = (element) => {
    return element && element.nodeType === 1 && typeof element.hasAttribute === 'function';
  };

  // Helper functions from addContext.js implementation
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

  // Helper function to simulate pressing Enter (simple version from addContext.js)
  function pressEnterSimple(selector) {
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

  // Add context function using the implementation from addContext.js
  async function addContext(folderName = 'Cypress-realworld-app') {
    try {
      console.log("Adding context to chat: " + folderName);
      
      // Step 1: Check if chat is already open, if not, click on chat button
      const chatPanelSelector = '#workbench\\.panel\\.chat';
      const chatButtonSelector = '#workbench\\.parts\\.titlebar > div > div.titlebar-center > div > div > div > div > ul > li.action-item.monaco-dropdown-with-primary > div.action-container.menu-entry';
      
      if (!elementExists(chatPanelSelector)) {
        await clickElement(chatButtonSelector);
        // Wait for chat UI to fully load
        await wait(2000);
      }
      
      // Check if Cypress context is already added
      const contextAttachmentSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attached-context > div";
      
      if (elementExists(contextAttachmentSelector) && 
          elementContainsText(contextAttachmentSelector, folderName)) {
        console.log("✓ Context is already added");
        return true;
      }
      
      // Step 2: Click on Add Context button
      await clickElement('#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attachment-toolbar > div > div > ul > li > a');
      
      // Wait for dropdown to appear
      await wait(1000);
      
      // Step 3: Press Enter to select Files & Folders
      await pressEnterSimple('.quick-input-widget .monaco-list-rows');
      
      // Step 4: Focus and enter text in search field
      const inputSelector = "body > div.file-icons-enabled.enable-motion.monaco-workbench.windows.chromium.maximized.vs-dark.vscode-theme-defaults-themes-dark_plus-json > div.quick-input-widget.show-file-icons > div.quick-input-header > div.quick-input-and-message > div.quick-input-filter > div.quick-input-box > div > div.monaco-inputbox.idle > div > input";
      await focusElement(inputSelector);
      await enterText(inputSelector, folderName);
      
      // Wait briefly for search results
      await wait(1000);
      
      // Step 5: Press enter to select the result
      await focusElement(inputSelector);
      await pressEnterSimple(inputSelector);
      
      // Wait for context to be added
      await wait(2000);
      
      // Verify context was added
      if (elementExists(contextAttachmentSelector) && 
          elementContainsText(contextAttachmentSelector, folderName)) {
        console.log("✓ Context added successfully");
        return true;
      } else {
        console.log("⚠ Context may not have been added properly");
        return false;
      }
    } catch (error) {
      console.error("× Failed to add context:", error.message);
      return false;
    }
  }

  // Add a helper function to press down arrow key 
  const pressDownArrowKey = async (inputElement) => {
    console.log("Pressing DOWN ARROW key to select from dropdown");
    
    // Try with both the input element and document
    const targets = [inputElement, document.activeElement, document];
    
    for (const target of targets) {
      if (target) {
        try {
          // Dispatch keyboard event for Down Arrow
          const downKeyEvent = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true,
            view: window
          });
          target.dispatchEvent(downKeyEvent);
        } catch(e) {}
      }
    }
    
    // Try Monaco editor commands if available
    try {
      if (window.monaco && monaco.editor) {
        const editors = monaco.editor.getEditors();
        if (editors.length > 0) {
          editors[0].trigger('keyboard', 'cursorDown', {});
        }
      }
    } catch(e) {}
    
    await wait(300);
    return true;
  };

  // Consolidated Enter key function that combines all previous methods
  const pressEnterKey = async (inputElement, options = {}) => {
    const { pressDownArrow = false, pressTwice = false, label = "pressing Enter" } = options;
    
    console.log(`🔑 ${label}${pressDownArrow ? " (with down arrow first)" : ""}${pressTwice ? " TWICE" : ""}`);
    
    // First press down arrow if requested
    if (pressDownArrow) {
      await pressDownArrowKey(inputElement);
      await wait(200);
    }
    
    const pressOnce = async () => {
      // Method 1: Click buttons
      const buttonSelectors = [
        '.monaco-button.primary', 'button.accept', 'button[aria-label="OK"]', 
        'button[aria-label="Select Folder"]', '.submit-button', '.quick-input-action'
      ];
      
      const submitButton = document.querySelector(buttonSelectors.join(', '));
      if (submitButton) {
        submitButton.click();
        await wait(200);
      }
      
      // Method 2: Monaco commands
      try {
        if (window.monaco && monaco.editor) {
          const editors = monaco.editor.getEditors();
          if (editors.length > 0) {
            const editor = editors[0];
            editor.trigger('keyboard', 'acceptSelectedSuggestion', {});
            editor.trigger('keyboard', 'editor.action.submitEditorInput', {});
          }
        }
      } catch(e) {}
      
      // Method 3: Direct value modification
      try {
        if (inputElement && inputElement.value !== undefined) {
          const originalValue = inputElement.value;
          inputElement.value = originalValue + '\n';
          inputElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      } catch(e) {}
      
      // Method 4: Keyboard events
      try {
        const targets = [inputElement, document.activeElement, document];
        for (const target of targets) {
          if (target) {
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
              view: window
            });
            target.dispatchEvent(enterEvent);
          }
        }
      } catch(e) {}
      
      // Method 5: execCommand
      try {
        document.execCommand('insertText', false, '\n');
      } catch(e) {}
    };
    
    // First press
    await pressOnce();
    
    // Second press if requested
    if (pressTwice) {
      await wait(300);
      await pressOnce();
    }
    
    await wait(500); // Wait after submission
    return true;
  };

  // An improved folder selection function that doesn't rely on Enter key
  const selectFolder = async (folderName) => {
    console.log(`Attempting to select folder: ${folderName}`);
    
    // Look for the folder in the list
    const listItems = document.querySelectorAll('.monaco-list-row');
    
    // First try: Look for exact match
    for (const item of listItems) {
      const itemText = item.textContent || '';
      if (itemText.includes(folderName)) {
        // Use mouse events for better simulation
        item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await wait(100);
        item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await wait(100);
        item.click();
        await wait(1000);
        
        // Check for "Select Folder" button that might appear
        const selectFolderButton = document.querySelector('button[aria-label="Select Folder"]');
        if (selectFolderButton) {
          selectFolderButton.click();
          await wait(1000);
        }
        
        return true;
      }
    }
    
    // If folder not found in list
    console.log("Folder not found by name, trying backup methods");
    
    // Look for any visible confirmation buttons
    const confirmButtons = document.querySelectorAll(
      'button.monaco-button.primary, button.accept, button[aria-label="Select Folder"], ' +
      'button.quick-input-action, button[aria-label="OK"]'
    );
    
    if (confirmButtons.length > 0) {
      confirmButtons[0].click();
      await wait(1000);
      return true;
    }
    
    // Last resort: try to click any list item that might be a folder
    const folderItems = Array.from(listItems).filter(item => 
      item.querySelector('.folder-icon') || 
      item.querySelector('[class*="folder"]') ||
      item.className.includes('folder')
    );
    
    if (folderItems.length > 0) {
      folderItems[0].click();
      await wait(1000);
      return true;
    }
    
    return false;
  };
  
  // New helper to find and click dropdown items directly
  const clickDropdownItem = async (itemText) => {
    console.log(`Looking for dropdown item containing: "${itemText}"`);
    
    // Common selectors for dropdown items in VSCode
    const dropdownItemSelectors = [
      '.monaco-list-row', 
      '.quick-input-list .monaco-list-row',
      '.monaco-list-row[aria-label*="' + itemText + '"]',
      '.monaco-list .monaco-list-row',
      '.suggest-widget .monaco-list-row'
    ];
    
    // Look for visible dropdown items
    for (const selector of dropdownItemSelectors) {
      const items = document.querySelectorAll(selector);
      console.log(`Found ${items.length} items with selector: ${selector}`);
      
      // Check each item for matching text
      for (const item of items) {
        const itemContent = item.textContent || '';
        if (itemContent.toLowerCase().includes(itemText.toLowerCase())) {
          console.log(`Found matching dropdown item: "${itemContent}"`);
          
          // Try to scroll the item into view if possible
          try {
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await wait(100);
          } catch (e) {}
          
          // Click the item directly
          try {
            // Mouse events for better simulation
            item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            await wait(50);
            item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await wait(50);
            item.click();
            console.log("Successfully clicked dropdown item");
            
            return true;
          } catch (e) {
            console.log("Error clicking item:", e);
          }
        }
      }
    }
    
    console.log("No matching dropdown item found");
    return false;
  };

  // Verify context attachment
  const verifyContextAttachment = async (folderName) => {
    console.log(`Verifying context attachment for: ${folderName}`);
    
    // Selectors targeting the attachment in the correct locations
    const attachmentSelectors = [
      '.chat-attachments-container .chat-attached-context .chat-attached-context-attachment',
      '.interactive-input-part .chat-attachments-container .chat-attached-context',
      '.chat-attached-context-attachment[aria-label*="' + folderName + '"]'
    ];
    
    let attempts = 0;
    const maxAttempts = 100;
    
    // Poll for attachment to appear
    while (attempts < maxAttempts) {
      attempts++;
      
      for (const selector of attachmentSelectors) {
        const attachment = document.querySelector(selector);
        if (attachment) {
          // Check if it contains our folder name
          const attachmentText = attachment.textContent || '';
          const hasCorrectFolder = 
            attachmentText.toLowerCase().includes(folderName.toLowerCase()) ||
            attachment.querySelector('.monaco-highlighted-label')?.textContent.toLowerCase().includes(folderName.toLowerCase()) ||
            attachment.getAttribute('aria-label')?.toLowerCase().includes(folderName.toLowerCase());
          
          if (hasCorrectFolder) {
            console.log(`✓ Found correct context attachment`);
            return true;
          }
        }
      }
      
      console.log(`Context verification attempt ${attempts}/${maxAttempts}`);
      await wait(800);
    }
    
    return false;
  };

  // Install global error handler to prevent script crashes
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    console.log(`Caught error: ${message}`);
    if (message.includes('hasAttribute') || source.includes('contextKeyService')) {
      return true; // Prevent default handling
    }
    // Pass to original handler if it exists
    if (originalOnError) return originalOnError(message, source, lineno, colno, error);
    return false;
  };

  console.log("Starting VSCode Copilot chat automation...");
  
  // Step 1: Check if chat window is already open
  console.log("Step 1: Checking if chat window is open...");
  
  // Use multiple selectors to detect chat window
  const chatPanelSelectors = [
    '.interactive-editor', '.interactive-session', '.chat-editor',
    '.editor-instance.interactive', 'div.pane-body[aria-label*="chat" i]',
    '.interactive-input-part', '.monaco-editor[aria-label*="chat" i]'
  ];
  
  // Try to find the chat panel with any of the selectors
  let chatPanel = null;
  for (const selector of chatPanelSelectors) {
    chatPanel = document.querySelector(selector);
    if (chatPanel) break;
  }
  
  let isChatAlreadyOpen = !!chatPanel;
  
  if (isChatAlreadyOpen) {
    console.log("✓ Chat window is already open");
  } else {
    console.log("✗ Chat window not open. Looking for chat button...");
    
    // Find the Copilot chat button using multiple strategies
    let copilotButton = null;
    
    // Try various selectors and strategies to find the button
    const buttonSelectors = [
      "#workbench\\.parts\\.titlebar > div > div.titlebar-center > div > div > div > div > ul > li.action-item.monaco-dropdown-with-primary > div.action-container.menu-entry",
      'a.action-label.codicon.codicon-copilot'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        copilotButton = document.querySelector(selector);
        if (copilotButton) break;
      } catch (e) {}
    }
    
    // If still not found, try matching by attributes
    if (!copilotButton) {
      try {
        const allElements = document.querySelectorAll('[aria-label*="Copilot"], [aria-label*="Chat"], [title*="Copilot"], [title*="Chat"]');
        for (const el of allElements) {
          if ((el.getAttribute('aria-label')?.includes('Chat') || el.getAttribute('title')?.includes('Chat')) && 
              (el.className?.includes('copilot') || el.innerHTML?.includes('copilot'))) {
            copilotButton = el;
            break;
          }
        }
      } catch (e) {}
    }
    
    if (copilotButton) {
      console.log("Found Copilot button, clicking to open chat...");
      copilotButton.click();
      await wait(3000);
      
      // Try to find the chat panel after clicking
      for (const selector of chatPanelSelectors) {
        chatPanel = document.querySelector(selector);
        if (chatPanel) break;
      }
      
      // If still not found, try waiting longer
      if (!chatPanel) {
        try {
          // Try waiting for any of the selectors
          const foundSelector = await Promise.any(
            chatPanelSelectors.map(selector => 
              waitForElement(selector, 15000)
                .then(() => selector)
                .catch(() => null)
            )
          );
          
          if (foundSelector) {
            chatPanel = document.querySelector(foundSelector);
          }
        } catch (e) {}
      }
      
      if (chatPanel) {
        console.log("✓ Chat window opened successfully");
      } else {
        throw new Error("Could not find chat window after clicking button");
      }
    } else {
      throw new Error("Could not find Copilot chat button");
    }
  }
  
  await wait(1000);
  
  // Step 2: Adding context to chat
  console.log("Step 2: Adding context to chat...");
  const contextAdded = await addContext('Cypress-realworld-app');
  
  // Step 3: Enter text into chat
  console.log("Step 3: Entering text into chat...");
  await wait(2000);
  
  // Find the chat input area
  const inputSelectors = [
    '.interactive-input .monaco-editor .inputarea',
    '.interactive-session .interactive-input .monaco-editor .inputarea',
    '.monaco-editor[aria-label*="chat" i] .inputarea',
    '.chat-editor .inputarea',
    '.interactive-input textarea'
  ];
  
  let inputArea = await findAnyElement(inputSelectors, 5000);
  
  // If still not found, try waiting
  if (!inputArea) {
    try {
      inputArea = await waitForElement(inputSelectors[0], 5000).catch(() => null);
    } catch (e) {}
  }
  
  if (!inputArea) {
    throw new Error("Could not find chat input area");
  }
  
  console.log("Found input area, entering text...");
  if (isDOMElement(inputArea)) {
    inputArea.focus();
    await wait(300);
    
    let textEntered = false;
    
    // Try multiple methods to set the text
    const textEntryMethods = [
      // Method 1: Clipboard API
      async () => {
        const originalClipboard = await navigator.clipboard.readText();
        await navigator.clipboard.writeText(textToSend);
        document.execCommand('paste');
        await navigator.clipboard.writeText(originalClipboard);
      },
      
      // Method 2: Monaco Editor API
      async () => {
        if (typeof monaco !== 'undefined' && monaco?.editor?.getEditors) {
          const editors = monaco.editor.getEditors();
          const chatEditor = editors.find(e => {
            try {
              const domNode = e.getDomNode();
              return domNode && (domNode.closest('.interactive-input') !== null || 
                                domNode.closest('.interactive-session') !== null);
            } catch (err) { return false; }
          });
          
          if (chatEditor) {
            chatEditor.setValue(textToSend);
            return true;
          }
        }
        return false;
      },
      
      // Method 3: Direct text insertion
      async () => {
        inputArea.value = textToSend;
        inputArea.dispatchEvent(new InputEvent('input', { bubbles: true }));
        if (!inputArea.value) {
          document.execCommand('insertText', false, textToSend);
        }
      }
    ];
    
    // Try each method until one works
    for (const method of textEntryMethods) {
      try {
        await method();
        textEntered = true;
        break;
      } catch (err) {}
    }
    
    if (textEntered) {
      // After text entered, check for dropdown suggestions first
      console.log("Checking for dropdown suggestions...");
      
      // Look for suggestion dropdown elements that might be visible
      const suggestionSelectors = [
        '.suggest-widget.visible .monaco-list-row',
        '.monaco-list.visible .monaco-list-row',
        '.quick-input-list.visible .monaco-list-row',
        '.suggestion-container .monaco-list-row'
      ];
      
      let suggestionFound = false;
      for (const selector of suggestionSelectors) {
        const suggestions = document.querySelectorAll(selector);
        if (suggestions.length > 0) {
          console.log(`Found ${suggestions.length} dropdown suggestions with selector: ${selector}`);
          
          // Try to click the first suggestion
          try {
            console.log("Attempting to click first suggestion in dropdown");
            suggestions[0].click();
            await wait(300);
            suggestionFound = true;
            break;
          } catch (e) {
            console.log("Failed to click suggestion directly, will try keyboard navigation");
          }
        }
      }
      
      // If no suggestion found or clicking failed, try keyboard navigation
      if (!suggestionFound) {
        console.log("No clickable suggestion found, trying keyboard navigation");
        await pressDownArrowKey(inputArea);
        await wait(200);
      }
    }
  }
  
  // Step 4: Submit and generate response
  console.log("Step 4: Generating response...");
  
  const sendButton = document.querySelector('.interactive-input-send');
  if (sendButton) {
    console.log("Found send button, clicking to submit");
    sendButton.click();
    
    // If button click fails, try Enter key as backup
    await wait(500);
    if (!document.querySelector('.codicon-loading, .chat-in-progress')) {
      await pressEnterKey(inputArea, { label: "Pressing Enter to send message" });
    }
    
    // Wait for response to complete
    console.log("Waiting for response...");
    const maxWaitTime = 60000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const isLoading = !!document.querySelector('.codicon-loading, .chat-in-progress');
      if (!isLoading) {
        await wait(1000);
        break;
      }
      await wait(500);
    }
  }
  
  // Step 5: Copy the response
  console.log("Step 5: Copying response...");
  
  const responseElements = document.querySelectorAll('.interactive-response');
  if (responseElements.length > 0) {
    const latestResponse = responseElements[responseElements.length - 1];
    const responseText = latestResponse.textContent;
    
    try {
      await navigator.clipboard.writeText(responseText);
      console.log("Response copied to clipboard");
    } catch (err) {
      console.error("Failed to copy response:", err);
    }
  }
  
  // Step 6: Start a new chat
  console.log("Step 6: Starting new chat...");
  
  const newChatButton = Array.from(document.querySelectorAll('button'))
    .find(btn => {
      const icon = btn.querySelector('.codicon-add');
      return icon && btn.closest('.interactive-session-container');
    });
  
  if (newChatButton) {
    newChatButton.click();
    await wait(1000);
    console.log("New chat started");
  }
  
  // Restore original error handler
  window.onerror = originalOnError;
  
  console.log("Automation completed!");
}

// Example usage:
// automateVSCodeCopilotChat("Explain how to implement a Redux store in a React application");
