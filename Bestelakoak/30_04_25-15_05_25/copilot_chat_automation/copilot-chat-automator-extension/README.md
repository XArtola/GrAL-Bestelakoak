# Copilot Chat Automator

A Visual Studio Code extension that automates interactions with GitHub Copilot Chat.

## Features

- Send programmatic messages to GitHub Copilot Chat
- Run automated chat sessions with predefined prompts
- Save Copilot responses for analysis and comparison
- Load prompt sets from files for batch processing

## Commands

- **Send Message to Copilot Chat**: Send a single message to Copilot Chat
- **Start Automated Copilot Chat Session**: Begin an automated session using a predefined prompt set
- **Load Prompt Set for Automation**: Load a JSON file containing prompts for automation

## Requirements

This extension requires the GitHub Copilot Chat extension to be installed and active.

## Extension Settings

This extension contributes the following settings:

* `copilot-chat-automator.promptDelay`: Delay in milliseconds between automated prompts (default: 1000)
* `copilot-chat-automator.saveResponses`: Whether to save Copilot Chat responses to disk (default: true)
* `copilot-chat-automator.outputFolder`: Folder path for saving responses (empty for default location)

## Usage

1. **Installation**:
   - Install this extension from the VS Code Marketplace
   - Ensure GitHub Copilot Chat is also installed and properly configured

2. **Send a Single Message**:
   - Run command "Send Message to Copilot Chat"
   - Enter your prompt in the input box
   - View response in the Copilot Chat panel

3. **Automated Sessions**:
   - Prepare a prompt set JSON file (see sample-prompts.json)
   - Load it using "Load Prompt Set for Automation"
   - Run "Start Automated Copilot Chat Session" to process all prompts in sequence

4. **Reviewing Responses**:
   - If "saveResponses" is enabled, check the output folder for saved JSON files
   - Each file contains the prompt, Copilot's response, and timestamp

1. Install the extension
2. Create a prompt set file (JSON format) with your desired prompts
3. Run the "Load Prompt Set for Automation" command
4. Start the automated session with "Start Automated Copilot Chat Session"

## Prompt Set Format

```json
{
  "name": "Example Prompt Set",
  "prompts": [
    {
      "message": "What is JavaScript?",
      "waitForResponse": true
    },
    {
      "message": "Show me an example of async/await",
      "waitForResponse": true
    }
  ]
}
```
