// Script for VS Code Developer Tools Console

function greet(name) {
  console.log(`Hello, ${name}! This message is from your script.`);
}

const workspaceFilesData = {
  "files": [
    {
      "file": "auth1.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "auth2.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "auth3.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "auth4.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "auth5.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "auth6.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "auth7.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "auth8.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "bankaccounts1.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "bankaccounts2.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "bankaccounts3.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "bankaccounts4.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "new-transaction1.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "new-transaction2.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "new-transaction3.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "new-transaction4.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "new-transaction5.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "new-transaction6.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "notifications1.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "notifications2.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "notifications3.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "notifications4.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "notifications5.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "notifications6.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "notifications7.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds1.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds2.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds3.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds4.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds5.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds6.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds7.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds8.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds9.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds10.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-feeds11.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-view1.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-view2.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-view3.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-view4.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-view5.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "transaction-view6.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "user-settings1.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "user-settings2.spec.txt",
      "location": "preparePrompts/prompts"
    },
    {
      "file": "user-settings3.spec.txt",
      "location": "preparePrompts/prompts"
    }
  ]
};

function showWorkspaceFiles() {
  console.log("Workspace Files Information:");
  workspaceFilesData.files.forEach(fileInfo => {
    console.log(`File: ${fileInfo.file}, Location: ${fileInfo.location}`);
  });
}

// flag to signal stop
let _shouldStop = false;

async function processWorkspaceFiles() {
  if (_shouldStop) {
    console.log('Process was stopped before start.');
    return;
  }

  console.log("Attempting to process workspace files (currently configured for the first file only for debugging Quick Open)...");

  let commandService = null;
  const quickOpenInputSelector = 'div.quick-input-widget input.input'; // Common selector for the Quick Open input box

  try {
    const localRequire = window.require;
    if (typeof localRequire !== 'function') {
      throw new Error("`window.require` (VS Code's AMD loader) is not available. Ensure DevTools are for the main VS Code window.");
    }

    const { ICommandService } = localRequire('vs/platform/commands/common/commands');
    const { IInstantiationService } = localRequire('vs/platform/instantiation/common/instantiation');

    const workbenchElement = document.querySelector('.monaco-workbench');
    if (workbenchElement && workbenchElement._services) {
      const instantiationService = workbenchElement._services.get(IInstantiationService);
      if (instantiationService) {
        commandService = instantiationService.invokeFunction(accessor => accessor.get(ICommandService));
        console.log("Successfully obtained ICommandService via workbench element's services.");
      } else {
        console.warn("Could not get IInstantiationService from workbench element's services.");
      }
    } else {
      console.warn("Could not find .monaco-workbench element or its _services property. This is a primary method for service access from DevTools.");
    }

    if (!commandService) {
      console.log("Attempting fallback to StandaloneServices to get ICommandService...");
      const { StandaloneServices } = localRequire('vs/editor/standalone/browser/standaloneServices');
      commandService = StandaloneServices.get(ICommandService); // This might return undefined if service not found
      if (commandService) {
        console.log("Successfully obtained ICommandService via StandaloneServices (fallback).");
      } else {
        console.warn("Failed to get ICommandService via StandaloneServices fallback.");
      }
    }

    if (!commandService) {
      throw new Error("Failed to obtain ICommandService through all attempted methods. Cannot proceed with command execution.");
    }

  } catch (e) {
    console.error("Error obtaining ICommandService:", e);
    console.log("Ensure you are running this script in the Developer Tools of the main VS Code window (Help > Toggle Developer Tools).");
    return; 
  }

  if (workspaceFilesData.files.length === 0) {
    console.log("No files to process.");
    return;
  }

  // Process only the first file for now to debug Quick Open interaction
  const firstFileInfo = workspaceFilesData.files[0];
  const fileName = firstFileInfo.file;
  const fileLocation = firstFileInfo.location;
  console.log(`Attempting to open Quick Open for: ${fileName} from ${fileLocation}`);

  try {
    console.log("Before command - Active element:", document.activeElement);
    console.log("Attempting to open Quick Open...");

    // try VS Code built-in API first
    if (typeof vscode !== 'undefined' 
        && vscode.commands 
        && typeof vscode.commands.executeCommand === 'function') {
      await vscode.commands.executeCommand('workbench.action.quickOpen');
      console.log("✅ Invoked quickOpen via vscode.commands.executeCommand");
    } else if (commandService) {
      // fallback to internal command service
      await commandService.executeCommand('workbench.action.quickOpen');
      console.log("✅ Invoked quickOpen via commandService.executeCommand");
    } else {
      // Fallback: simulate Ctrl+P keystroke
      console.log("🔄 Falling back to dispatching Ctrl+P key event");
      const dispatch = (type) => document.body.dispatchEvent(
        new KeyboardEvent(type, { key: 'p', code: 'KeyP', keyCode: 80, which: 80, ctrlKey: true, bubbles: true })
      );
      dispatch('keydown'); dispatch('keypress'); dispatch('keyup');
    }

    // Wait for a bit to allow Quick Open to potentially appear and for focus to shift
    await new Promise(resolve => setTimeout(resolve, 2500)); // Increased delay to 2.5 seconds

    console.log("After command and delay - Active element:", document.activeElement);

    const quickOpenInput = document.querySelector(quickOpenInputSelector);
    if (quickOpenInput) {
      console.log("%cSUCCESS: Quick Open input element found!", "color:green");
      // type filename into the Quick Open input and press Enter
      await focusElement(quickOpenInputSelector);
      await enterTextInElement(quickOpenInputSelector, fileName);
      await pressEnter(quickOpenInputSelector);
      console.log(`-> Typed "${fileName}" and pressed Enter`);
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.error("%cFAILURE: Quick Open input element NOT found in the DOM after command execution.", "color: red; font-weight: bold;");
      console.log(`Searched for selector: "${quickOpenInputSelector}"`);
      console.log("This suggests 'workbench.action.quickOpen' did not make the Quick Open palette visible/available in the DOM as expected, or the selector is incorrect for your VS Code version.");
      console.log("Check if the main VS Code window has focus and if any other UI elements (like notifications or other popups) might be interfering.");
    }
  } catch (execError) {
    console.error(`Error during 'workbench.action.quickOpen' or subsequent DOM check:`, execError);
  }

  console.log("Finished single file processing attempt. If Quick Open appeared, the next step is to automate typing into it.");
  // The loop for all files is commented out for now.
  // To re-enable, uncomment the loop structure below and move the single file logic inside.
  /*
  console.log("Starting file processing loop (currently disabled)...");
  for (const fileInfo of workspaceFilesData.files) {
    // const fileName = fileInfo.file;
    // const fileLocation = fileInfo.location;
    // ... (original loop logic for processing each file, including the Quick Open attempt and DOM checks) ...
    // await new Promise(resolve => setTimeout(resolve, 2500)); // Delay between files
  }
  console.log("Finished processing workspace files (loop disabled).");
  */
}

// single command to start
function startProcessing() {
  _shouldStop = false;
  console.log('Starting workspace processing...');
  processWorkspaceFiles().catch(console.error);
}

// single command to stop
function stopProcessing() {
  _shouldStop = true;
  console.log('Stop requested. The script will stop after the current operation.');
}

// Helper to focus an element
async function focusElement(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Focus target not found: ${selector}`);
  el.focus();
  await new Promise(r => setTimeout(r, 200));
}

// Helper to set text and dispatch input
async function enterTextInElement(selector, text) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Input not found: ${selector}`);
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
}

// Helper to simulate Enter key on given selector
async function pressEnter(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Enter target not found: ${selector}`);
  el.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
    bubbles: true, cancelable: true
  }));
  await new Promise(r => setTimeout(r, 200));
}

console.log("devToolsScript.js loaded. You can now call functions like greet('Developer'), showWorkspaceFiles(), or await processWorkspaceFiles().");
console.log("Use startProcessing() to run, stopProcessing() to stop.");

// Example usage:
// greet('Developer');
// showWorkspaceFiles();
// To run the async function from the console, you might type:
// await processWorkspaceFiles()
// or:
// processWorkspaceFiles().catch(console.error);
