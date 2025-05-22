# Copilot Performance Tracker

Track both inline suggestions and Copilot Workspace calls, with timing stats exposed via commands.

## Features

- Track response times of GitHub Copilot inline suggestions (Ctrl+I)
- Track response times of GitHub Copilot Chat window
- Manually measure Copilot response times
- View statistics about Copilot performance
- Export performance data for analysis

## Installation

1. From this folder run `npm install && npm run compile`.  
2. Press F5 in VS Code to launch a development host, or package with `vsce package`.

### From VS Code Marketplace
1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X)
3. Search for "Copilot Performance Tracker"
4. Click Install

### Installing a Local Extension (Not in Marketplace)

#### Method 1: Using the Extensions view
1. Build the extension (see Manual Installation steps below)
2. Go to the Extensions view (Ctrl+Shift+X)
3. Click on the "..." menu (More Actions) in the top-right corner
4. Select "Install from VSIX..."
5. Navigate to the .vsix file in the project directory
6. Select it and click "Install"

#### Method 2: Using the command line
1. Build the extension to generate a .vsix file
2. Run: `code --install-extension path/to/copilot-performance-tracker.vsix`

#### Method 3: Local development
1. Clone the repository
2. Open the project in VS Code
3. Press F5 to start debugging
4. A new VS Code window will open with the extension loaded

### From VSIX file
1. Download the .vsix file from the releases page
2. Open VS Code
3. Go to the Extensions view (Ctrl+Shift+X)
4. Click on the "..." menu in the top-right corner
5. Select "Install from VSIX..."
6. Navigate to the downloaded .vsix file and select it

### Manual Installation
1. Clone the repository: `git clone https://github.com/username/copilot-performance-tracker.git`
2. Navigate to the project directory: `cd copilot-performance-tracker`
3. Install dependencies: `npm install`
4. Install the VSCE packaging tool: `npm install -g @vscode/vsce` or use npx as shown in step 5
5. Compile the extension: `npm run compile`
6. Package the extension:
   - If you installed vsce globally: `vsce package`
   - If not, use npx: `npx @vscode/vsce package`
7. Install the generated .vsix file using the "Install from VSIX..." method described above

## Usage

> **Note:** This extension is currently in beta. Please report any issues or feedback to help improve future versions.

### Starting Performance Tracking
There are three ways to start tracking Copilot performance:

1. **Command Palette**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the Command Palette
   - Type "Start Tracking Copilot Performance" and select the command when it appears

2. **Keyboard Shortcut**:
   - You can assign a custom keyboard shortcut by:
     - Going to File > Preferences > Keyboard Shortcuts
     - Search for "copilot-performance-tracker.startTracking"
     - Click the + icon to add your preferred shortcut

3. **Status Bar**:
   - After running the command once, a status indicator will appear in the status bar
   - You can click this indicator to toggle tracking on/off

Once tracking is started, you'll see a notification and the status bar will display "Copilot Tracking: On"

1. **Start inline tracking**  
   Run the “Start Copilot Performance Tracking” command.

2. **Start workspace tracking**  
   Run the “Start Tracking Copilot Workspace” command.

3. **Execute Copilot workspace with timing**  
   Instead of invoking the default Copilot workspace command, use our interceptor:
   ```jsonc
   // in your keybindings.json for convenience:
   {
     "key": "ctrl+enter",
     "command": "github.copilot.workspace.executeIntercept",
     "when": "editorTextFocus"
   }
   ```
   This will call Copilot, measure start/end times, and log via your tracker.

4. **End workspace session**  
   Run “End Copilot Workspace Tracking Session” to finalize and record any pending data.

5. **View stats**  
   Run “Show Copilot Performance Statistics” to pop up timing summaries.

### Tracking Copilot Inline Suggestions (Ctrl+I)
This extension monitors for changes to inlay hints and document events to estimate when Copilot requests start and when responses are received. The time difference is recorded as the response time.
1. Open the Command Palette with `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Run "Start Tracking Copilot Inline Performance"
3. Use Copilot inline suggestions as normal (trigger with `Ctrl+I`)
4. Run "Stop Tracking Copilot Inline Performance" when done
5. View statistics with "Show Copilot Inline Performance Statistics"

### Tracking Copilot Chat Window Response Times
1. Open the Command Palette with `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Run "Start Tracking Copilot Chat Performance"
3. Use Copilot Chat as normal
4. Run "Stop Tracking Copilot Chat Performance" when done
5. View statistics with "Show Copilot Chat Performance Statistics"

### Troubleshooting Missing Commands

If commands don't appear in the Command Palette:

1. **Reload VS Code**: Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) to reload the window
2. **Verify Extension Installation**: 
   - Check the Extensions view (Ctrl+Shift+X) to confirm the extension is installed
   - Look for "Copilot Performance Tracker" in the INSTALLED section
3. **Check Output Panel**:
   - Press `Ctrl+Shift+U` to open the Output panel
   - Select "Copilot Performance Tracker" from the dropdown (if available)
   - Look for any error messages
4. **Manual Command Entry**:
   - In the Command Palette, you can type the full command ID:
     - `>copilot-performance-tracker.startChatTracking`
     - `>copilot-performance-tracker.startManualMeasurement`
5. **Reinstall the Extension**:
   - Uninstall the current version
   - Close VS Code completely
   - Reopen VS Code and install again from the VSIX file

### Manual Measurement (for Copilot Chat window)
This is the easiest way to measure the Copilot Chat window response time:
1. Open the Command Palette with `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Run "Start Manual Copilot Measurement"
3. Immediately ask your question in the Copilot Chat window
4. As soon as you receive a complete response, run "End Manual Copilot Measurement"
5. The response time will be displayed in a notification

### Using Markers for Precise Measurement

For the most accurate measurements of the Copilot Chat window:

1. Run "Start Copilot Measurement with Markers" from the Command Palette
2. Paste the [TIMING_START] marker at the beginning of your question
3. Add your actual question after the marker and send it to Copilot
4. When Copilot responds, it will automatically include a [TIMING_END] marker
5. Run "Check Copilot Response with Markers" to see the elapsed time

Example:
```
[TIMING_START]What is the capital of France?
```

And Copilot will respond with something like:
```
[TIMING_START]What is the capital of France?

The capital of France is Paris. It's not only the capital but also the largest city in France.
[TIMING_END]
```

This approach is more reliable because it captures the entire round-trip from sending your question to receiving the full response.

### Troubleshooting Chat Tracking Issues

If the chat tracking commands are not saving data:

1. **Check the logs directory**:
   - The extension saves logs at: `[extension directory]/logs/copilot-chat-performance-[timestamp].json`
   - Make sure the directory exists and is writable

2. **Use the manual measurement commands**:
   - Start with `copilot-performance-tracker.startManualMeasurement`
   - End with `copilot-performance-tracker.endManualMeasurement`
   - These directly call the internal tracking commands

3. **Check the Output Console**:
   - Press `Ctrl+Shift+U` to open the Output panel
   - Select "Copilot Performance Tracker" from the dropdown
   - Look for any error messages related to saving data

4. **Try reloading VS Code**:
   - Sometimes VS Code needs to be reloaded for extension commands to work properly
   - Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) to reload

5. **Check permissions**:
   - Ensure the extension has write permissions to its directory

## Data collected
All data is stored locally in the extension's logs directory. No data is sent to any remote servers.

## Limitations
This approach is an approximation as there is no official API for directly hooking into GitHub Copilot's request/response cycle. The measurements may include some inaccuracies due to this indirect measurement approach.
- All measurements are stored locally for analysis
- For Chat window: uses manual timing with start and end commands
- For inline suggestions: monitors editor events and completion providers

## Troubleshooting

### Commands Not Appearing in Command Palette

If the extension commands are not appearing in the Command Palette, try these solutions:

1. **Use the simplest measurement method**:
   - Press `Ctrl+Shift+P` and type exactly `>copilot-performance-tracker.startManualMeasurement`
   - If even this doesn't work, continue with the solutions below

2. **Alternative Installation Method**:
   - After compiling the extension, try installing it in development mode:
   - Press F5 while in the extension project
   - This will launch a new VS Code window with the extension running in debug mode

3. **Register keybindings manually**:
   - Open your `keybindings.json` file (`Ctrl+Shift+P` → "Preferences: Open Keyboard Shortcuts (JSON)`)
   - Add these entries:
   ```json
   [
     {
       "key": "ctrl+alt+1",
       "command": "copilot-performance-tracker.startManualMeasurement"
     },
     {
       "key": "ctrl+alt+2",
       "command": "copilot-performance-tracker.endManualMeasurement"
     }
   ]
   ```
   - Now you can use `Ctrl+Alt+1` to start timing and `Ctrl+Alt+2` to end timing

4. **Use timestamp logging**:
   Use the following Node.js script to manually time your Copilot responses.

## API for Other Extensions

You can also call these commands programmatically via `vscode.commands.executeCommand`:

```ts
await commands.executeCommand('copilot-performance-tracker.api.isTrackingActive');
await commands.executeCommand('copilot-performance-tracker.api.trackChatSession', promptText);
```

## Logs

Workspace interactions are recorded in `copilot-timing-log.json` under your extension folder.