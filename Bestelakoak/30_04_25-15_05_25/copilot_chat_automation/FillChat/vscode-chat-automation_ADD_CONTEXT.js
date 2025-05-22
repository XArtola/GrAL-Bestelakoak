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
      if (existingElement) {
        console.log(`Element already exists: ${selector}`);
        return resolve(existingElement);
      }
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        console.log(`Timeout waiting for: ${selector}`);
        reject(new Error(`Element not found: ${selector}`));
      }, timeout);
      
      // Set up observer
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          obs.disconnect();
          console.log(`Element found via observer: ${selector}`);
          resolve(element);
        }
      });
      
      // Start observing
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      
      // Also poll periodically as a backup strategy
      const pollInterval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          clearInterval(pollInterval);
          observer.disconnect();
          console.log(`Element found via polling: ${selector}`);
          resolve(element);
        }
      }, 500);
    });
  };

  // Enhanced utility to find elements
  const findAnyElement = async (selectors, timeout = 10000) => {
    const startTime = Date.now();
    console.log(`Looking for any of these selectors: ${selectors.join(', ')}`);
    
    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Found element with selector: ${selector}`);
          return element;
        }
      }
      await wait(200);
    }
    
    console.warn(`Could not find any elements using selectors: ${selectors.join(', ')}`);
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

  // Add a new helper for safely submitting inputs without keyboard events
  const safeSubmit = async (inputElement) => {
    console.log("Safely submitting without keyboard events");
    
    // Strategy 1: Look for submit/accept buttons
    const buttonSelectors = [
      '.monaco-button.primary', 
      'button.accept',
      'button[type="submit"]',
      '.submit-button',
      'button.submit',
      'button.ok',
      'button[aria-label="OK"]',
      'button[aria-label="Accept"]',
      '.quick-input-action'
    ];
    
    let submitButton = null;
    for (const selector of buttonSelectors) {
      submitButton = document.querySelector(selector);
      if (submitButton) {
        console.log(`Found submit button using selector: ${selector}`);
        break;
      }
    }
    
    if (submitButton) {
      console.log("Clicking submit button");
      submitButton.click();
      return true;
    }
    
    // Strategy 2: Try to use Monaco API to handle submission
    try {
      if (window.monaco && monaco.editor) {
        const editors = monaco.editor.getEditors();
        if (editors.length > 0) {
          console.log("Attempting to submit via Monaco API");
          const editor = editors[0]; // Use the first editor or find the active one
          
          // Try to execute a command that confirms the input
          editor.trigger('keyboard', 'acceptSelectedSuggestion', {});
          editor.trigger('keyboard', 'editor.action.submitEditorInput', {});
          return true;
        }
      }
    } catch (e) {
      console.log("Monaco API submission failed:", e);
    }
    
    // Strategy 3: Try to find and click any button that looks like a confirmation
    try {
      // Look for any button or element that might be a confirmation
      const possibleButtons = document.querySelectorAll('button, .button, [role="button"]');
      for (const button of possibleButtons) {
        const text = button.textContent?.toLowerCase() || '';
        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
        const title = button.getAttribute('title')?.toLowerCase() || '';
        
        if (text.includes('ok') || text.includes('accept') || text.includes('submit') ||
            ariaLabel.includes('ok') || ariaLabel.includes('accept') || ariaLabel.includes('submit') ||
            title.includes('ok') || title.includes('accept') || title.includes('submit')) {
          console.log("Found confirmation button by text/attributes");
          button.click();
          return true;
        }
      }
    } catch (e) {
      console.log("Button search failed:", e);
    }
    
    console.log("No submission method found, continuing anyway");
    return false;
  };

  // Install global error handler to prevent script crashes
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    console.log(`Caught error: ${message}`, error);
    if (message.includes('hasAttribute') || source.includes('contextKeyService')) {
      console.log("Caught VSCode context key error - continuing execution");
      return true; // Prevent default handling
    }
    // Pass to original handler if it exists
    if (originalOnError) return originalOnError(message, source, lineno, colno, error);
    return false;
  };

  console.log("Starting VSCode Copilot chat automation...");
  
  // Step 1: Check if chat window is already open
  console.log("Step 1: Checking if chat window is already open...");
  
  // Use multiple selectors to detect chat window
  const chatPanelSelectors = [
    '.interactive-editor',
    '.interactive-session',
    '.chat-editor',
    '.editor-instance.interactive',
    'div.pane-body[aria-label*="chat" i]',
    '.interactive-input-part',
    '.monaco-editor[aria-label*="chat" i]'
  ];
  
  // Try to find the chat panel with any of the selectors
  let chatPanel = null;
  for (const selector of chatPanelSelectors) {
    chatPanel = document.querySelector(selector);
    if (chatPanel) {
      console.log(`Chat panel found using selector: ${selector}`);
      break;
    }
  }
  
  let isChatAlreadyOpen = !!chatPanel;
  
  if (isChatAlreadyOpen) {
    console.log("✓ Chat window is already open, continuing to next step...");
  } else {
    console.log("✗ Chat window not open. Looking for chat button to open it...");
    
    // Find the Copilot chat button using multiple strategies
    let copilotButton = null;
    
    // Strategy 1: Try the exact selector path provided
    try {
      copilotButton = document.querySelector("#workbench\\.parts\\.titlebar > div > div.titlebar-center > div > div > div > div > ul > li.action-item.monaco-dropdown-with-primary > div.action-container.menu-entry");
      console.log("Strategy 1 (exact selector):", copilotButton ? "Found button" : "Button not found");
    } catch (e) {
      console.log("Error with exact selector:", e);
    }
    
    // Strategy 2: Look for a button with the copilot icon class
    if (!copilotButton) {
      try {
        copilotButton = document.querySelector('a.action-label.codicon.codicon-copilot');
        console.log("Strategy 2 (icon class):", copilotButton ? "Found button" : "Button not found");
        
        // If we found the icon but need the parent button element
        if (copilotButton && copilotButton.closest) {
          const parentButton = copilotButton.closest('[role="button"]');
          if (parentButton) copilotButton = parentButton;
        }
      } catch (e) {
        console.log("Error finding by icon class:", e);
      }
    }
    
    // Strategy 3: Look for any element that has both copilot and toggle/chat in attributes
    if (!copilotButton) {
      try {
        const allElements = document.querySelectorAll('[aria-label*="Copilot"], [aria-label*="Chat"], [title*="Copilot"], [title*="Chat"]');
        for (const el of allElements) {
          if ((el.getAttribute('aria-label')?.includes('Chat') || 
               el.getAttribute('title')?.includes('Chat')) && 
              (el.className?.includes('copilot') || 
               el.innerHTML?.includes('copilot'))) {
            copilotButton = el;
            break;
          }
        }
        console.log("Strategy 3 (attributes):", copilotButton ? "Found button" : "Button not found");
      } catch (e) {
        console.log("Error with attribute search:", e);
      }
    }
    
    // Strategy 4: Original approach as fallback
    if (!copilotButton) {
      try {
        const activityBarItems = document.querySelectorAll('.monaco-action-bar.vertical .action-item');
        
        for (const item of activityBarItems) {
          if (item.querySelector('.codicon-copilot') || 
              item.textContent.includes('Copilot') || 
              item.querySelector('[title*="Copilot"]')) {
            copilotButton = item;
            break;
          }
        }
        console.log("Strategy 4 (original method):", copilotButton ? "Found button" : "Button not found");
      } catch (e) {
        console.log("Error with original method:", e);
      }
    }
    
    if (copilotButton) {
      console.log("Found Copilot button, clicking to open chat window...");
      
      // Click the button
      copilotButton.click();
      
      // Wait longer for the chat panel to appear
      console.log("Waiting for chat panel to appear (this may take a few seconds)...");
      await wait(3000); // Wait longer initially
      
      // Try to find the chat panel with any of the selectors
      for (const selector of chatPanelSelectors) {
        chatPanel = document.querySelector(selector);
        if (chatPanel) {
          console.log(`Chat panel found using selector: ${selector}`);
          break;
        }
      }
      
      // If still not found, try waiting and polling
      if (!chatPanel) {
        try {
          // Try waiting for any of the selectors with a longer timeout
          const foundSelector = await Promise.any(
            chatPanelSelectors.map(selector => 
              waitForElement(selector, 15000)
                .then(() => selector)
                .catch(() => null)
            )
          );
          
          if (foundSelector) {
            chatPanel = document.querySelector(foundSelector);
            console.log(`Chat panel found after waiting using selector: ${foundSelector}`);
          }
        } catch (e) {
          console.log("All waitForElement promises failed or rejected");
        }
      }
      
      // Last resort: Check if any new panels appeared
      if (!chatPanel) {
        console.log("Still can't find chat panel, looking for any new panels...");
        
        // Look for any elements that might be the chat panel
        const possiblePanels = document.querySelectorAll('.pane-body, .editor-instance, [aria-label*="chat" i]');
        if (possiblePanels.length > 0) {
          // Use the first one as a fallback
          chatPanel = possiblePanels[0];
          console.log("Found a potential chat panel by general selectors");
        }
      }
      
      if (chatPanel) {
        console.log("✓ Chat window opened successfully");
      } else {
        console.error("Failed to detect chat window after clicking button");
        throw new Error("Could not find chat window - please check if it opened in a different location");
      }
    } else {
      console.error("Could not find Copilot chat button using any strategy");
      throw new Error("Could not find Copilot chat button - please verify the button selector in your VS Code interface");
    }
  }
  
  // Add a small delay to ensure the UI is fully loaded
  await wait(1000);
  console.log("Chat panel is now open and ready for interaction");
  
  // Step 1.2: Click "Add Context..." and select folder
  console.log("Step 2: Adding context to chat...");
  
  // Multiple strategies to find the "Add Context..." button
  let addContextButton = null;
  
  // Strategy 0: Try the exact element by aria-label
  try {
    addContextButton = document.querySelector('a[aria-label="Add Context... (Ctrl+ç)"]');
    console.log("Strategy 0 (exact aria-label):", addContextButton ? "Found button" : "Button not found");
  } catch (e) {
    console.log("Error with exact aria-label:", e);
  }
  
  // Strategy 0.1: Try to find by class and role with codicon-attach
  if (!addContextButton) {
    try {
      const candidates = document.querySelectorAll('a.action-label[role="button"]');
      for (const candidate of candidates) {
        const hasAttachIcon = candidate.querySelector('.codicon.codicon-attach');
        const hasText = candidate.textContent.includes('Add Context');
        if (hasAttachIcon && hasText) {
          addContextButton = candidate;
          break;
        }
      }
      console.log("Strategy 0.1 (class+role+content):", addContextButton ? "Found button" : "Button not found");
    } catch (e) {
      console.log("Error with class+role+content search:", e);
    }
  }
  
  // Strategy 1: Try the exact selector path provided
  try {
    const containerElement = document.querySelector("#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attachment-toolbar > div");
    
    if (containerElement) {
      // Find the "Add Context..." button within the container
      addContextButton = containerElement.querySelector('a[aria-label*="Add Context"]') || 
                         containerElement.querySelector('li.chat-attachment-button a');
    }
    console.log("Strategy 1 (exact container selector):", addContextButton ? "Found button" : "Button not found");
  } catch (e) {
    console.log("Error with exact container selector:", e);
  }
  
  // Strategy 2: Look for the button directly with aria-label
  if (!addContextButton) {
    try {
      addContextButton = document.querySelector('a[aria-label*="Add Context"]');
      console.log("Strategy 2 (aria-label):", addContextButton ? "Found button" : "Button not found");
    } catch (e) {
      console.log("Error finding by aria-label:", e);
    }
  }
  
  // Strategy 3: Look for elements with attach icon and "Add Context" text
  if (!addContextButton) {
    try {
      const candidates = document.querySelectorAll('a.action-label');
      for (const candidate of candidates) {
        if (candidate.textContent.includes('Add Context') || 
           (candidate.querySelector('.codicon-attach') && candidate.textContent.includes('Context'))) {
          addContextButton = candidate;
          break;
        }
      }
      console.log("Strategy 3 (text content):", addContextButton ? "Found button" : "Button not found");
    } catch (e) {
      console.log("Error with text content search:", e);
    }
  }
  
  // Strategy 4: Original approach as fallback
  if (!addContextButton) {
    addContextButton = findElementByText('button', 'Add Context');
    console.log("Strategy 4 (original method):", addContextButton ? "Found button" : "Button not found");
  }
  
  if (addContextButton) {
    console.log("Found Add Context button, attempting to click...");
    try {
      // Only use simple click method
      if (isDOMElement(addContextButton)) {
        // Just click the button, no keyboard events
        addContextButton.click();
        await wait(1500); // Wait longer to ensure menu appears
      } else {
        console.warn("Add Context button is not a valid DOM element");
      }
    } catch (e) {
      console.error("Error when clicking the Add Context button:", e);
    }
    
    // Find and click "Include a folder..."
    const folderOption = Array.from(document.querySelectorAll('.monaco-list-row'))
      .find(el => el.textContent.includes('Folder'));
    
    if (folderOption) {
      folderOption.click();
      await wait(1000); // Wait longer for file picker to appear
      
      // Use the exact selector provided for the input box
      const exactInputSelector = "body > div.file-icons-enabled.enable-motion.monaco-workbench.windows.chromium.vs-dark.vscode-theme-defaults-themes-dark_plus-json.maximized > div.quick-input-widget.show-file-icons > div.quick-input-header > div.quick-input-and-message > div.quick-input-filter > div.quick-input-box > div > div.monaco-inputbox.idle > div > input";
      
      // Try multiple approaches to find the input element
      let filePickerInput = document.querySelector(exactInputSelector);
      
      if (!filePickerInput) {
        // Fallback to more general selectors
        filePickerInput = document.querySelector('.quick-input-box input') || 
                          document.querySelector('.quick-input-widget input');
        
        console.log("Using fallback selector for input:", filePickerInput ? "Found" : "Not found");
      } else {
        console.log("Found file picker input using exact selector");
      }
      
      if (!filePickerInput) {
        // One more attempt - wait for the input to appear
        try {
          filePickerInput = await waitForElement('.quick-input-box input', 5000);
          console.log("Found file picker input after waiting");
        } catch (e) {
          console.warn("Could not find file picker input:", e);
        }
      }
      
      if (filePickerInput) {
        // Ensure proper focus on the input element
        if (isDOMElement(filePickerInput)) {
          filePickerInput.focus();
          await wait(200); // Short wait to ensure focus is established
          
          // Click the input to ensure it's active
          filePickerInput.click();
          await wait(200);
          
          // Clear any existing value
          filePickerInput.value = '';
          filePickerInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
          await wait(100);
          
          // Type the folder name
          filePickerInput.value = 'Cypress-realworld-app';
          filePickerInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
          await wait(500);
          
          console.log("Typing completed, attempting to submit without keyboard events");
          
          // Use our safe submit helper instead of keyboard events
          await safeSubmit(filePickerInput);
          
          // Try clicking visible acceptance buttons as backup
          const acceptButtons = document.querySelectorAll('.monaco-button.primary, button.accept');
          if (acceptButtons.length > 0) {
            console.log(`Found ${acceptButtons.length} acceptance buttons, clicking the first one`);
            acceptButtons[0].click();
          }
          
          await wait(2000); // Wait longer after attempting submission
        } else {
          console.warn("File picker input is not a valid DOM element");
        }
        
        // Verify that the context has been added successfully
        console.log("Verifying that the context folder has been added to chat...");
        
        // Try using the exact path provided
        const contextAttachmentSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attached-context";
        
        // Try multiple approaches to find the context attachment
        let contextAttachment = document.querySelector(contextAttachmentSelector);
        
        // If the exact selector doesn't work, try a more general approach
        if (!contextAttachment) {
          contextAttachment = document.querySelector('.chat-attached-context');
        }
        
        // If still not found, try waiting for it
        if (!contextAttachment) {
          try {
            contextAttachment = await waitForElement('.chat-attached-context', 5000).catch(() => null);
          } catch (e) {
            console.log("Error waiting for context attachment:", e);
          }
        }
        
        if (contextAttachment) {
          const attachmentText = contextAttachment.textContent || '';
          if (attachmentText.toLowerCase().includes('cypress-realworld-app')) {
            console.log("✓ Context folder 'cypress-realworld-app' successfully attached to chat");
          } else {
            console.warn("⚠ Context attachment found, but it might not be the expected folder");
            console.log("Attachment text:", attachmentText);
          }
        } else {
          console.warn("⚠ Could not verify if context folder was added correctly");
          console.log("Continuing anyway, but chat context might not include the folder");
        }
      } else {
        console.warn("Could not find the file picker input element");
      }
      
      // Verify that the context has been added successfully
      console.log("Verifying that the context folder has been added to chat...");
      
      // Try using the exact path provided
      const contextAttachmentSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-attachments-container > div.chat-attached-context";
      
      // Try multiple approaches to find the context attachment
      let contextAttachment = document.querySelector(contextAttachmentSelector);
      
      // If the exact selector doesn't work, try a more general approach
      if (!contextAttachment) {
        contextAttachment = document.querySelector('.chat-attached-context');
      }
      
      // If still not found, try waiting for it
      if (!contextAttachment) {
        try {
          contextAttachment = await waitForElement('.chat-attached-context', 5000).catch(() => null);
        } catch (e) {
          console.log("Error waiting for context attachment:", e);
        }
      }
      
      if (contextAttachment) {
        const attachmentText = contextAttachment.textContent || '';
        if (attachmentText.toLowerCase().includes('cypress-realworld-app')) {
          console.log("✓ Context folder 'cypress-realworld-app' successfully attached to chat");
        } else {
          console.warn("⚠ Context attachment found, but it might not be the expected folder");
          console.log("Attachment text:", attachmentText);
        }
      } else {
        console.warn("⚠ Could not verify if context folder was added correctly");
        console.log("Continuing anyway, but chat context might not include the folder");
      }
    } else {
      console.warn("Could not find 'Folder' option in the context menu");
    }
  } else {
    console.warn("Could not find Add Context button using any strategy - continuing without adding context");
  }
  
  // Step 2: Copy text to the chat input
  console.log("Step 3: Entering text into chat...");
  
  // Multiple strategies to find the chat input area
  const inputSelectors = [
    '.interactive-input .monaco-editor .inputarea',
    '.interactive-session .interactive-input .monaco-editor .inputarea',
    '.monaco-editor[aria-label*="chat" i] .inputarea',
    '.editor-instance[aria-label*="chat" i] .inputarea',
    '.chat-editor .inputarea',
    '.interactive-input textarea',
    '.monaco-editor .inputarea', // More general fallback
  ];
  
  console.log("Looking for chat input area using multiple selectors");
  let inputArea = null;
  
  // Try each selector
  for (const selector of inputSelectors) {
    try {
      inputArea = document.querySelector(selector);
      if (inputArea) {
        console.log(`Found chat input area using selector: ${selector}`);
        break;
      }
    } catch (e) {
      console.log(`Error finding input with selector ${selector}:`, e);
    }
  }
  
  // If still not found, try waiting for the first selector
  if (!inputArea) {
    console.log("Input area not found immediately, waiting for it to appear...");
    try {
      // Wait for the input area with a longer timeout
      inputArea = await waitForElement(inputSelectors[0], 5000)
        .catch(() => null);
      
      if (inputArea) {
        console.log("Found chat input area after waiting");
      }
    } catch (e) {
      console.log("Error waiting for input area:", e);
    }
  }
  
  // Last resort: Look for any editor in the DOM that might be the chat
  if (!inputArea) {
    console.log("Still can't find input area, trying alternative detection...");
    
    // Find all editors and look for one that seems like a chat editor
    const allEditors = document.querySelectorAll('.monaco-editor');
    for (const editor of allEditors) {
      // Look for clues that this might be the chat editor
      const isChat = editor.closest('.interactive-session') || 
                     editor.closest('[aria-label*="chat" i]') || 
                     editor.closest('.chat-editor') ||
                     editor.querySelector('.interactive-input');
                     
      if (isChat) {
        inputArea = editor.querySelector('.inputarea') || editor.querySelector('textarea');
        if (inputArea) {
          console.log("Found potential chat input area via editor detection");
          break;
        }
      }
    }
  }
  
  if (!inputArea) {
    console.error("Could not find chat input area using any strategy");
    throw new Error("Could not find chat input area - the chat UI structure may have changed");
  }
  
  console.log("Focusing on input area and preparing to enter text");
  if (isDOMElement(inputArea)) {
    inputArea.focus();
    await wait(300);  // Wait longer for focus to take effect
    
    // Try multiple methods to set the text
    let textEntered = false;
    
    // Method 1: Clipboard API
    if (!textEntered) {
      try {
        console.log("Trying clipboard method to enter text");
        const originalClipboard = await navigator.clipboard.readText();
        await navigator.clipboard.writeText(textToSend);
        
        // Paste the text
        document.execCommand('paste');
        
        // Restore original clipboard content
        await navigator.clipboard.writeText(originalClipboard);
        textEntered = true;
        console.log("Text entered via clipboard method");
      } catch (err) {
        console.log("Clipboard method failed:", err);
      }
    }
    
    // Method 2: Monaco Editor API
    if (!textEntered) {
      try {
        console.log("Trying Monaco editor API to enter text");
        if (typeof monaco !== 'undefined' && monaco?.editor?.getEditors) {
          const editors = monaco.editor.getEditors();
          
          // Find an editor that's likely the chat editor
          const chatEditor = editors.find(e => {
            try {
              const domNode = e.getDomNode();
              return domNode && (
                domNode.closest('.interactive-input') !== null ||
                domNode.closest('.interactive-session') !== null ||
                domNode.closest('[aria-label*="chat" i]') !== null
              );
            } catch (err) {
              return false;
            }
          });
          
          if (chatEditor) {
            // Use the editor's API to set text instead of keyboard events
            chatEditor.setValue(textToSend);
            textEntered = true;
            console.log("Text entered via Monaco editor API");
          } else {
            console.log("Could not identify chat editor in Monaco editors");
          }
        } else {
          console.log("Monaco API not available");
        }
      } catch (err) {
        console.log("Monaco editor method failed:", err);
      }
    }
    
    // Method 3: Direct text insertion - NO KEYBOARD EVENTS
    if (!textEntered) {
      try {
        console.log("Trying direct text insertion");
        
        // Set value directly - no keyboard events
        inputArea.value = textToSend;
        inputArea.dispatchEvent(new InputEvent('input', { bubbles: true }));
        
        // Use document.execCommand for whole text at once if value setting failed
        if (!inputArea.value) {
          document.execCommand('insertText', false, textToSend);
        }
        
        textEntered = true;
        console.log("Text entered via direct insertion");
      } catch (err) {
        console.error("Direct insertion method failed:", err);
      }
    }
    
    if (!textEntered) {
      console.error("All methods to enter text failed");
      throw new Error("Could not enter text into chat input");
    }
  } else {
    console.warn("Input area is not a valid DOM element");
  }
  
  // Step 3: Click send button to generate response
  console.log("Step 4: Generating response...");
  
  const sendButton = document.querySelector('.interactive-input-send');
  if (sendButton) {
    sendButton.click();
    
    // Wait for response to complete (look for loading indicators to disappear)
    console.log("Waiting for response...");
    
    await wait(1000);
    
    // Wait until no loading indicators are visible
    const maxWaitTime = 60000; // 60 seconds max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      // Check if any loading indicators are present
      const isLoading = !!document.querySelector('.codicon-loading, .chat-in-progress');
      
      if (!isLoading) {
        // Wait a bit more to ensure response is fully rendered
        await wait(1000);
        break;
      }
      
      await wait(500);
    }
  }
  
  // Step 4: Copy the response
  console.log("Step 5: Copying response...");
  
  // Find the latest response
  const responseElements = document.querySelectorAll('.interactive-response');
  if (responseElements.length > 0) {
    // Get the most recent response
    const latestResponse = responseElements[responseElements.length - 1];
    const responseText = latestResponse.textContent;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(responseText)
      .then(() => console.log("Response copied to clipboard"))
      .catch(err => console.error("Failed to copy response:", err));
  }
  
  // Step 5: Start a new chat
  console.log("Step 6: Starting new chat...");
  
  // Look for the + button to start a new chat
  const newChatButton = Array.from(document.querySelectorAll('button'))
    .find(btn => {
      const icon = btn.querySelector('.codicon-add');
      return icon && btn.closest('.interactive-session-container');
    });
  
  if (newChatButton) {
    newChatButton.click();
    await wait(1000);
    console.log("New chat started");
  } else {
    console.warn("Could not find new chat button");
  }
  
  // Remove our error handler when done
  window.onerror = originalOnError;
  
  console.log("Automation completed!");
}

// Example usage:
// automateVSCodeCopilotChat("Explain how to implement a Redux store in a React application");
