/**
 * VS Code File Processing Script - Lightweight Version
 * 
 * This script opens each file from a predefined list, copies its contents,
 * and sends it to GitHub Copilot chat for analysis, then saves and clears the chat.
 */

// Add a global stop flag and function to control execution
let SCRIPT_RUNNING = true;
const stopScript = () => {
  console.log("🛑 Stopping script execution...");
  SCRIPT_RUNNING = false;
  return "Script will stop after current file completes processing";
};

// Make stop function available globally so it can be called from console
window.stopScript = stopScript;
console.log("ℹ️ To stop execution at any time, type 'stopScript()' in the console");

// Embedded file list
const FILES_TO_PROCESS = [
  { file: "auth1.spec.txt", location: "preparePrompts/prompts" },
  { file: "auth2.spec.txt", location: "preparePrompts/prompts" },
  { file: "auth3.spec.txt", location: "preparePrompts/prompts" },
  { file: "auth4.spec.txt", location: "preparePrompts/prompts" },
  { file: "auth5.spec.txt", location: "preparePrompts/prompts" },
  { file: "auth6.spec.txt", location: "preparePrompts/prompts" },
  { file: "auth7.spec.txt", location: "preparePrompts/prompts" },
  { file: "auth8.spec.txt", location: "preparePrompts/prompts" },
  { file: "bankaccounts1.spec.txt", location: "preparePrompts/prompts" },
  { file: "bankaccounts2.spec.txt", location: "preparePrompts/prompts" },
  { file: "bankaccounts3.spec.txt", location: "preparePrompts/prompts" },
  { file: "bankaccounts4.spec.txt", location: "preparePrompts/prompts" },
  { file: "new-transaction1.spec.txt", location: "preparePrompts/prompts" },
  { file: "new-transaction2.spec.txt", location: "preparePrompts/prompts" },
  { file: "new-transaction3.spec.txt", location: "preparePrompts/prompts" },
  { file: "new-transaction4.spec.txt", location: "preparePrompts/prompts" },
  { file: "new-transaction5.spec.txt", location: "preparePrompts/prompts" },
  { file: "new-transaction6.spec.txt", location: "preparePrompts/prompts" },
  { file: "notifications1.spec.txt", location: "preparePrompts/prompts" },
  { file: "notifications2.spec.txt", location: "preparePrompts/prompts" },
  { file: "notifications3.spec.txt", location: "preparePrompts/prompts" },
  { file: "notifications4.spec.txt", location: "preparePrompts/prompts" },
  { file: "notifications5.spec.txt", location: "preparePrompts/prompts" },
  { file: "notifications6.spec.txt", location: "preparePrompts/prompts" },
  { file: "notifications7.spec.txt", location: "preparePrompts/prompts" }
  // Limited to 25 files for performance, add more as needed
];

// Core processing function
async function processFiles() {
  console.log("🚀 Starting file processing...");
  
  // Storage for captured content
  const processedFiles = [];
  
  // Helper functions
  const wait = ms => new Promise(r => setTimeout(r, ms));
  
  // Send keyboard shortcuts
  const sendKey = async (key, modifiers = {}) => {
    try {
      // Convert key to the right format
      const keyCode = typeof key === 'string' ? key.charCodeAt(0) : key;
      
      document.body.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: typeof key === 'string' ? key : String.fromCharCode(key),
        code: typeof key === 'string' ? `Key${key.toUpperCase()}` : `Key${String.fromCharCode(key)}`,
        keyCode: keyCode,
        which: keyCode,
        ctrlKey: !!modifiers.ctrl,
        shiftKey: !!modifiers.shift,
        altKey: !!modifiers.alt,
        metaKey: !!modifiers.meta
      }));
      await wait(150);
      return true;
    } catch (error) {
      console.error(`Error sending key ${key}:`, error);
      return false;
    }
  };
  
  // Type text into focused element
  const typeText = async (text) => {
    try {
      const input = document.activeElement;
      if (!input) {
        console.error("No active element to type into");
        return false;
      }
      
      // Try to set value directly
      if ('value' in input) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // Fallback: Insert at cursor position for contentEditable elements
        document.execCommand('insertText', false, text);
      }
      
      await wait(200);
      return true;
    } catch (error) {
      console.error("Error typing text:", error);
      return false;
    }
  };
  
  // Process each file
  for (const [index, fileInfo] of FILES_TO_PROCESS.entries()) {
    try {
      console.log(`Processing file ${index + 1}/${FILES_TO_PROCESS.length}: ${fileInfo.file}`);
      
      // STEP 1: Open the file with Ctrl+P (changed from Ctrl+E)
      console.log("Opening file...");
      await sendKey('p', { ctrl: true });
      await wait(300);
      
      // Type filename and location
      await typeText(`${fileInfo.file} ${fileInfo.location}`);
      await wait(200);
      await sendKey('Enter');
      await wait(500);
      
      // STEP 2: Copy file content
      console.log("Copying file content...");
      const editor = document.querySelector('.monaco-editor');
      const textarea = editor?.querySelector('textarea.inputarea');
      
      let content = null;
      if (textarea) {
        textarea.focus();
        await wait(50);
        
        // Select all content
        document.execCommand('selectAll');
        await wait(100);
        
        // Get selected text
        const selection = window.getSelection();
        content = selection?.toString()?.replace(/\r\n/g, '\n') || '';
        
        // Clear selection
        window.getSelection()?.removeAllRanges();
        
        if (content) {
          console.log(`✓ Captured ${content.length} characters from ${fileInfo.file}`);
          processedFiles.push({ fileName: fileInfo.file, content });
        } else {
          console.log(`× Failed to capture content from ${fileInfo.file}`);
        }
      } else {
        console.log("× Could not find editor or textarea");
      }
      
      // STEP 3: Close the file with Ctrl+W
      console.log("Closing file...");
      await sendKey('w', { ctrl: true });
      await wait(300);
      
      // Skip rest of steps if we didn't get content
      if (!content) continue;
      
      // STEP 4: Focus on Copilot Chat with Ctrl+Shift+I
      console.log("Opening/focusing Copilot Chat...");
      await sendKey('i', { ctrl: true, shift: true });
      await wait(800);
      
      // STEP 5: Add context
      console.log("Adding context...");
      // 5.1: Press Ctrl+Ç
      await sendKey('ç', { ctrl: true });
      await wait(500);
      
      // 5.2: Type "Files & Folders", press Enter
      await typeText("Files & Folders");
      await wait(300);
      await sendKey('Enter');
      await wait(500);
      
      // 5.3: Type "cypress-realworld-app", press Enter
      await typeText("cypress-realworld-app");
      await wait(300);
      await sendKey('Enter');
      await wait(500);
      
      // STEP 6: Type content into chat and send
      console.log("Sending content to Copilot...");
      const prompt = `Analyze this file: ${fileInfo.file}\n\n${content}`;
      await typeText(prompt);
      await wait(300);
      await sendKey('Enter');
      
      // STEP 7: Wait for response
      console.log("Waiting for Copilot to respond...");
      await wait(10000); // Adjust wait time based on file size and complexity
      
      // STEP 8: Save the conversation
      console.log("Saving the conversation...");
      await sendKey('i', { ctrl: true, shift: true }); // Focus chat again
      await wait(500);
      await typeText("/save");
      await wait(200);
      await sendKey('Enter');
      await wait(1000);
      
      // STEP 9: Clear the chat
      console.log("Clearing the chat...");
      await typeText("/clear");
      await wait(200);
      await sendKey('Enter');
      await wait(1000);
      
      console.log(`✓ Completed processing ${fileInfo.file}`);
      
      // Brief pause between files
      await wait(1000);
    } catch (error) {
      console.error(`Error processing ${fileInfo.file}:`, error);
    }
  }
  
  console.log(`✅ Processing complete! Processed ${processedFiles.length}/${FILES_TO_PROCESS.length} files.`);
  return processedFiles;
}

// Improved function with better editor selection
async function processFilesImproved() {
  console.log("🚀 Starting file processing with improved editor detection...");
  
  // Storage for captured content
  const processedFiles = [];
  
  // Helper functions
  const wait = ms => new Promise(r => setTimeout(r, ms));
  
  // Enhanced logging function
  const logStep = (message, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '❌' : '🔍';
    console.log(`${prefix} [${timestamp}] ${message}`);
  };
  
  // Send keyboard shortcuts with logging
  const sendKey = async (key, modifiers = {}) => {
    try {
      logStep(`Sending key: ${modifiers.ctrl ? 'Ctrl+' : ''}${modifiers.shift ? 'Shift+' : ''}${modifiers.alt ? 'Alt+' : ''}${key}`);
      
      const keyCode = typeof key === 'string' ? key.charCodeAt(0) : key;
      
      document.body.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: typeof key === 'string' ? key : String.fromCharCode(key),
        code: typeof key === 'string' ? `Key${key.toUpperCase()}` : `Key${String.fromCharCode(key)}`,
        keyCode: keyCode,
        which: keyCode,
        ctrlKey: !!modifiers.ctrl,
        shiftKey: !!modifiers.shift,
        altKey: !!modifiers.alt,
        metaKey: !!modifiers.meta
      }));
      
      logStep(`Key event dispatched successfully`);
      await wait(150);
      return true;
    } catch (error) {
      logStep(`Error sending key ${key}: ${error.message}`, true);
      return false;
    }
  };
  
  // Type text into focused element with logging
  const typeText = async (text) => {
    try {
      const input = document.activeElement;
      logStep(`Typing text: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" into ${input?.tagName || 'unknown element'}`);
      
      if (!input) {
        logStep("No active element to type into", true);
        return false;
      }
      
      // Log active element details
      logStep(`Active element: ${input.tagName}${input.id ? '#' + input.id : ''} ${input.className ? '.' + input.className.replace(/\s+/g, '.') : ''}`);
      
      // Try multiple approaches to insert text
      if ('value' in input) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        logStep(`Set value and dispatched input event`);
      } else {
        document.execCommand('insertText', false, text);
        logStep(`Used execCommand to insert text`);
      }
      
      await wait(200);
      return true;
    } catch (error) {
      logStep(`Error typing text: ${error.message}`, true);
      return false;
    }
  };
  
  // Improved function to find and get text from editor
  const getTextFromEditor = async () => {
    console.log("Looking for editor...");
    
    // Wait a bit for the editor to fully load
    await wait(1000);
    
    // Try multiple ways to find the editor
    const editorSelectors = [
      '.monaco-editor textarea.inputarea', 
      '.monaco-editor',
      '.editor-instance textarea',
      '[role="textbox"]',
      '.view-lines'
    ];
    
    let editor = null;
    let textarea = null;
    
    // Try each selector
    for (const selector of editorSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        editor = elements[0].closest('.monaco-editor') || elements[0];
        textarea = editor.querySelector('textarea') || elements[0];
        break;
      }
    }
    
    if (!editor) {
      console.error("× Could not find any editor element");
      return null;
    }
    
    console.log("✓ Found editor element, trying to get content...");
    
    // Try to focus the textarea
    if (textarea) {
      textarea.focus();
      await wait(200);
    } else {
      editor.focus();
      await wait(200);
    }
    
    // Try method 1: Select All via shortcut
    await sendKey('a', { ctrl: true });
    await wait(300);
    
    // Get selection
    const selection = window.getSelection();
    let content = selection?.toString() || '';
    
    // If that didn't work, try method 2: Using document.execCommand
    if (!content) {
      document.execCommand('selectAll', false);
      await wait(200);
      content = window.getSelection()?.toString() || '';
    }
    
    // If that didn't work, try method 3: Find text nodes in the editor
    if (!content) {
      const viewLines = editor.querySelectorAll('.view-line');
      if (viewLines.length > 0) {
        content = Array.from(viewLines).map(line => line.textContent).join('\n');
      }
    }
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
    
    // Clean up the content
    content = content.replace(/\r\n/g, '\n');
    
    return content || null;
  };
  
  // Process each file with enhanced debugging
  for (const [index, fileInfo] of FILES_TO_PROCESS.entries()) {
    // Check if script should continue running
    if (!SCRIPT_RUNNING) {
      logStep("Script execution stopped by user");
      break;
    }
    
    try {
      logStep(`\n====== Processing file ${index + 1}/${FILES_TO_PROCESS.length}: ${fileInfo.file} ======`);
      
      // STEP 1: Open the file with Ctrl+P with more detailed logging
      logStep("Opening QuickOpen dialog with Ctrl+P");
      await sendKey('p', { ctrl: true });
      await wait(500); 
      
      const quickOpenVisible = document.querySelector('.quick-input-widget') !== null;
      logStep(`Quick Open dialog visible: ${quickOpenVisible ? 'Yes' : 'No'}`);
      
      if (!quickOpenVisible) {
        logStep("Quick Open dialog not found - trying again", true);
        await sendKey('p', { ctrl: true });
        await wait(800);
        
        const retryQuickOpenVisible = document.querySelector('.quick-input-widget') !== null;
        logStep(`Quick Open dialog visible after retry: ${retryQuickOpenVisible ? 'Yes' : 'No'}`);
        
        if (!retryQuickOpenVisible) {
          logStep("Failed to open Quick Open dialog even after retry, skipping file", true);
          continue;
        }
      }
      
      // Check if execution was stopped during wait
      if (!SCRIPT_RUNNING) break;
      
      // Type filename and location
      const filePathToType = `${fileInfo.file} ${fileInfo.location}`;
      logStep(`Typing file path: "${filePathToType}"`);
      await typeText(filePathToType);
      
      // Log what's in the input field now
      const inputField = document.querySelector('.quick-input-box input');
      logStep(`Quick Open input contains: "${inputField?.value || 'unknown'}"`);
      
      await wait(300);
      
      if (!SCRIPT_RUNNING) break;
      
      logStep(`Pressing Enter to open the file`);
      await sendKey('Enter');
      
      // Wait and check if file appears to open
      await wait(1000);
      
      // Try to detect if file opened successfully
      const editorVisible = document.querySelector('.monaco-editor') !== null;
      logStep(`Editor visible after file open attempt: ${editorVisible ? 'Yes' : 'No'}`);
      
      if (!editorVisible) {
        logStep("Editor not found after file open attempt, trying alternative detection", true);
        // Alternative detection
        const anyEditorContent = document.querySelector('.view-lines') !== null;
        logStep(`Alternative editor content detection: ${anyEditorContent ? 'Found' : 'Not found'}`);
        
        if (!anyEditorContent) {
          logStep("File may not have opened successfully, skipping", true);
          // Try to dismiss Quick Open if it's still open
          await sendKey('Escape');
          await wait(300);
          continue;
        }
      }
      
      if (!SCRIPT_RUNNING) break;
      
      // Rest of file processing logic
      logStep("Attempting to capture file content...");
      const content = await getTextFromEditor();
      
      if (!SCRIPT_RUNNING) break;
      
      if (content && content.length > 0) {
        logStep(`✓ Captured ${content.length} characters from ${fileInfo.file}`);
        processedFiles.push({ fileName: fileInfo.file, content });
      } else {
        logStep(`× Failed to capture content from ${fileInfo.file}`, true);
        // Skip to next file
        await sendKey('w', { ctrl: true });
        await wait(300);
        continue;
      }
      
      if (!SCRIPT_RUNNING) break;
      
      // STEP 3: Close the file with Ctrl+W
      logStep("Closing file...");
      await sendKey('w', { ctrl: true });
      await wait(500);
      
      if (!SCRIPT_RUNNING) break;
      
      // STEP 4: Focus on Copilot Chat with Ctrl+Shift+I
      logStep("Opening/focusing Copilot Chat...");
      await sendKey('i', { ctrl: true, shift: true });
      await wait(1000);
      
      // Rest of steps remain the same...
      // STEP 5: Add context
      logStep("Adding context...");
      // 5.1: Press Ctrl+Ç
      await sendKey('ç', { ctrl: true });
      await wait(500);
      
      // 5.2: Type "Files & Folders", press Enter
      await typeText("Files & Folders");
      await wait(300);
      await sendKey('Enter');
      await wait(500);
      
      // 5.3: Type "cypress-realworld-app", press Enter
      await typeText("cypress-realworld-app");
      await wait(300);
      await sendKey('Enter');
      await wait(500);
      
      // STEP 6: Type content into chat and send
      logStep("Sending content to Copilot...");
      const prompt = `Analyze this file: ${fileInfo.file}\n\n${content}`;
      await typeText(prompt);
      await wait(300);
      await sendKey('Enter');
      
      // STEP 7: Wait for response
      logStep("Waiting for Copilot to respond...");
      await wait(10000); // Adjust wait time based on file size and complexity
      
      // STEP 8: Save the conversation
      logStep("Saving the conversation...");
      await sendKey('i', { ctrl: true, shift: true }); // Focus chat again
      await wait(500);
      await typeText("/save");
      await wait(200);
      await sendKey('Enter');
      await wait(1000);
      
      // STEP 9: Clear the chat
      logStep("Clearing the chat...");
      await typeText("/clear");
      await wait(200);
      await sendKey('Enter');
      await wait(1000);
      
      logStep(`✓ Completed processing ${fileInfo.file}`);
      await wait(1000);
    } catch (error) {
      logStep(`Error processing ${fileInfo.file}: ${error.message}`, true);
      console.error(error); // Full error in console
      // Recovery logic
      await sendKey('Escape');
      await wait(300);
      if (SCRIPT_RUNNING) {
        await sendKey('w', { ctrl: true });
        await wait(300);
      }
    }
  }
  
  const completionMessage = SCRIPT_RUNNING 
    ? `✅ Processing complete! Processed ${processedFiles.length}/${FILES_TO_PROCESS.length} files.`
    : `⏹️ Processing stopped by user! Processed ${processedFiles.length}/${FILES_TO_PROCESS.length} files.`;
  
  console.log(completionMessage);
  return processedFiles;
}

// Add an escape hatch that listens for key presses
document.addEventListener('keydown', (event) => {
  // Stop script when Escape key is pressed
  if (event.key === 'Escape' && event.ctrlKey) {
    console.log("🛑 Script execution stopped with Ctrl+Escape");
    SCRIPT_RUNNING = false;
  }
});

// Run the improved process instead
console.log("🚀 Script loaded, starting execution with improved editor detection...");
console.log("Press Ctrl+Escape to stop execution at any time");
processFilesImproved()
  .then(files => {
    console.log(`✅ Successfully processed ${files.length} files`);
    // Store results for access in console
    window.processedFiles = files;
    SCRIPT_RUNNING = false;
  })
  .catch(error => {
    console.error("❌ Error during execution:", error);
    SCRIPT_RUNNING = false;
  });

// Enhanced function to more reliably trigger keyboard shortcuts
const triggerKeyboardShortcut = async (key, modifiers = {}) => {
  logStep(`Attempting to trigger keyboard shortcut: ${modifiers.ctrl ? 'Ctrl+' : ''}${modifiers.shift ? 'Shift+' : ''}${modifiers.alt ? 'Alt+' : ''}${key} using multiple methods`);
  
  try {
    // Method 1: Using the VS Code command system if available
    if (window.vscode) {
      logStep(`VS Code API detected, attempting to execute command`);
      try {
        // Some common VS Code commands
        if (key === 'p' && modifiers.ctrl) {
          await window.vscode.commands.executeCommand('workbench.action.quickOpen');
          logStep(`Executed VS Code command: workbench.action.quickOpen`);
          return true;
        } else if (key === 'w' && modifiers.ctrl) {
          await window.vscode.commands.executeCommand('workbench.action.closeActiveEditor');
          logStep(`Executed VS Code command: workbench.action.closeActiveEditor`);
          return true;
        }
        // Add more command mappings as needed
      } catch (err) {
        logStep(`VS Code command execution failed: ${err.message}`, true);
      }
    }
    
    // Method 2: Using executeCommand API if available (works in some environments)
    try {
      if (key === 'p' && modifiers.ctrl) {
        document.execCommand('find', false);
        logStep(`Tried execCommand('find') as alternative to Ctrl+P`);
        await wait(200);
        return true;
      }
    } catch (err) {
      logStep(`execCommand alternative failed: ${err.message}`, true);
    }
    
    // Method 3: Try to find and click UI elements that serve the same function
    if (key === 'p' && modifiers.ctrl) {
      // Try to find and click the quick open button in the UI
      const quickOpenButtons = [
        document.querySelector('.quick-open-button'),
        document.querySelector('[aria-label*="Quick Open"]'),
        document.querySelector('[title*="Quick Open"]'),
        document.querySelector('.codicon-search')
      ];
      
      for (const btn of quickOpenButtons) {
        if (btn) {
          logStep(`Found UI element for quick open, clicking it`);
          btn.click();
          await wait(300);
          return true;
        }
      }
    }
    
    // Method 4: Fall back to KeyboardEvent (the standard approach)
    const keyCode = typeof key === 'string' ? key.charCodeAt(0) : key;
    
    // Try dispatching to multiple targets for better chance of success
    const targets = [
      document.body, 
      document.documentElement,
      document.activeElement,
      document.querySelector('.monaco-editor'),
      document.querySelector('.quick-input-widget')
    ].filter(Boolean);
    
    let succeeded = false;
    
    for (const target of targets) {
      try {
        // First try keydown
        target.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: typeof key === 'string' ? key : String.fromCharCode(key),
          code: typeof key === 'string' ? `Key${key.toUpperCase()}` : `Key${String.fromCharCode(key)}`,
          keyCode: keyCode,
          which: keyCode,
          ctrlKey: !!modifiers.ctrl,
          shiftKey: !!modifiers.shift,
          altKey: !!modifiers.alt,
          metaKey: !!modifiers.meta
        }));
        
        // Then try keypress
        target.dispatchEvent(new KeyboardEvent('keypress', {
          bubbles: true,
          cancelable: true,
          key: typeof key === 'string' ? key : String.fromCharCode(key),
          code: typeof key === 'string' ? `Key${key.toUpperCase()}` : `Key${String.fromCharCode(key)}`,
          keyCode: keyCode,
          which: keyCode,
          ctrlKey: !!modifiers.ctrl,
          shiftKey: !!modifiers.shift,
          altKey: !!modifiers.alt,
          metaKey: !!modifiers.meta
        }));
        
        // Finally keyup
        target.dispatchEvent(new KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key: typeof key === 'string' ? key : String.fromCharCode(key),
          code: typeof key === 'string' ? `Key${key.toUpperCase()}` : `Key${String.fromCharCode(key)}`,
          keyCode: keyCode,
          which: keyCode,
          ctrlKey: !!modifiers.ctrl,
          shiftKey: !!modifiers.shift,
          altKey: !!modifiers.alt,
          metaKey: !!modifiers.meta
        }));
        
        succeeded = true;
        logStep(`Key events dispatched successfully to ${target.tagName || 'unknown element'}`);
      } catch (err) {
        logStep(`Failed to dispatch key event to one target: ${err.message}`);
      }
    }
    
    if (succeeded) {
      await wait(300); // Wait a bit longer after using multiple methods
      return true;
    } else {
      logStep(`All keyboard shortcut methods failed`, true);
      return false;
    }
    
  } catch (error) {
    logStep(`Error triggering keyboard shortcut: ${error.message}`, true);
    return false;
  }
};

// Replace the sendKey function with the enhanced version
const sendKey = triggerKeyboardShortcut;
