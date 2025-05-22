const { keyboard, Key, clipboard, sleep } = require("@nut-tree-fork/nut-js");
const fs = require('fs');
const path = require('path');

const promptsDir = 'C:\\Users\\xabia\\OneDrive\\Documentos\\4.Maila\\TFG-Bestelakoak\\Bestelakoak\\30_04_25-15_05_25\\preparePrompts\\prompts';

async function automateFile(filePath) {
  // 1. Read file content
  const content = fs.readFileSync(filePath, 'utf8');
  await clipboard.setContent(content);

  // 2. Open/focus Copilot Chat (Ctrl+Shift+I)
  await keyboard.pressKey(Key.LeftControl, Key.LeftShift, Key.I);
  await sleep(200);
  await keyboard.releaseKey(Key.LeftControl, Key.LeftShift, Key.I);
  await sleep(2000); // Increased wait to ensure Copilot Chat is focused
  // Optionally: Ensure VS Code is focused before this step for more reliability

  // 3. Add context
  await keyboard.pressKey(Key.LeftControl, Key.Oem5); // 'ç' may not be available, Oem5 is often used for special chars
  await sleep(100);
  await keyboard.releaseKey(Key.LeftControl, Key.Oem5);
  await sleep(500);
  await keyboard.type('Files &Folders');
  await keyboard.pressKey(Key.Enter);
  await sleep(100);
  await keyboard.releaseKey(Key.Enter);
  await sleep(500);
  await keyboard.type('cypress-realworld-app');
  await keyboard.pressKey(Key.Enter);
  await sleep(100);
  await keyboard.releaseKey(Key.Enter);
  await sleep(1000);

  // 4. Paste file content into chat and send
  await keyboard.hotkey(['control', 'v']);
  await sleep(200);
  await keyboard.pressKey(Key.Enter);
  await sleep(100);
  await keyboard.releaseKey(Key.Enter);

  // 5. Wait for Copilot response (adjust as needed)
  await sleep(10000);

  // 6. Type "/save" and send
  await keyboard.type('/save');
  await keyboard.pressKey(Key.Enter);
  await sleep(100);
  await keyboard.releaseKey(Key.Enter);
  await sleep(500);

  // 7. Type "/clear" and send
  await keyboard.type('/clear');
  await keyboard.pressKey(Key.Enter);
  await sleep(100);
  await keyboard.releaseKey(Key.Enter);
  await sleep(500);
}

async function main() {
  const files = fs.readdirSync(promptsDir)
    .filter(f => fs.statSync(path.join(promptsDir, f)).isFile());

  for (const file of files) {
    const filePath = path.join(promptsDir, file);
    console.log(`Processing: ${filePath}`);
    await automateFile(filePath);
    await sleep(1000); // Small delay between files
  }
}

main();