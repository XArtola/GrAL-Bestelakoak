import { commands, window, workspace, Uri, env, ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  // on-launch CLI parsing
  const argv = process.argv;
  const idx = argv.indexOf('--filePath');
  if (idx !== -1 && argv[idx + 1]) {
    runMacro(argv[idx + 1]);
  }

  // allow manual invocation too
  const disposable = commands.registerCommand('extension.automateUser', runMacro);
  context.subscriptions.push(disposable);
}

async function runMacro(input?: string) {
  const filePath = input
    || await window.showInputBox({ prompt: 'Enter file path' });
  if (!filePath) { return; }

  // 1. open file
  const uri = Uri.file(filePath);
  const doc = await workspace.openTextDocument(uri);
  await window.showTextDocument(doc);

  // 2. copy text
  const text = doc.getText();
  await env.clipboard.writeText(text);

  // 3. close editor
  await commands.executeCommand('workbench.action.closeActiveEditor');

  // 4. focus Copilot chat
  await commands.executeCommand('github.copilot.chat.focus');

  // 5. add context
  await commands.executeCommand('github.copilot.chat.sendMessage', { message: 'Files &Folders' });
  await commands.executeCommand('github.copilot.chat.sendMessage', { message: 'cypress-realworld-app' });

  // 6. paste file contents
  await commands.executeCommand('github.copilot.chat.sendMessage', { message: text });

  // 8. save and 9. clear
  await commands.executeCommand('github.copilot.chat.sendMessage', { message: '/save' });
  await commands.executeCommand('github.copilot.chat.sendMessage', { message: '/clear' });
}

export function deactivate() {}
