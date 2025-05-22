# Automate User Behavior

...existing content...

## Testing the Extension

1. Run `npm install` in the project root.  
2. Press `F5` in VS Code to launch a new Extension Development Host.  
3. In the new host window, open the Command Palette (`Ctrl+Shift+P`) and run **Automate User Behavior**.  
4. Follow the prompt to enter a file path and observe the automated sequence.

## Running from the Console

1. Ensure the `code` CLI is installed in your PATH (`Ctrl+Shift+P` → “Shell Command: Install 'code' command in PATH”).  
2. In your terminal, run (adjust paths as needed):

   ```
   "C:\Program Files\Microsoft VS Code\Code.exe" \
   --extensionDevelopmentPath="c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\VsCode\automate-user" \
   --filePath="c:\path\to\your\target\file.txt"
   ```

3. A new VS Code window will open, load your extension, and immediately execute the macro on the specified file.
