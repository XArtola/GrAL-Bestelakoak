"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotChatTracker = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class CopilotChatTracker {
    constructor() {
        var _a;
        this.disposables = [];
        this.performanceData = [];
        this.requestStartTime = 0;
        this.promptText = '';
        this.trackingActive = false;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this.statusBarItem.text = "$(comment-discussion) Copilot Chat Tracking: Off";
        this.statusBarItem.show();
        // Create a log file in the extension's directory
        const extensionPath = (_a = vscode.extensions.getExtension('user.copilot-performance-tracker')) === null || _a === void 0 ? void 0 : _a.extensionPath;
        if (extensionPath) {
            const logsDir = path.join(extensionPath, 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            this.logFile = path.join(logsDir, `copilot-chat-performance-${Date.now()}.json`);
        }
    }
    startTracking() {
        if (this.trackingActive) {
            return;
        }
        this.trackingActive = true;
        this.statusBarItem.text = "$(comment-discussion) Copilot Chat Tracking: On";
        // Register commands to track chat interactions
        const startRequestCommand = vscode.commands.registerCommand('copilot-performance-tracker.startChatRequest', (promptText) => {
            if (!this.trackingActive)
                return;
            this.requestStartTime = Date.now();
            this.promptText = promptText || '';
            console.log(`Chat request started: ${this.requestStartTime}`);
            vscode.window.showInformationMessage(`Chat request started: ${this.requestStartTime}`);
        });
        const endRequestCommand = vscode.commands.registerCommand('copilot-performance-tracker.endChatRequest', (responseText) => {
            if (!this.trackingActive || this.requestStartTime === 0)
                return;
            const responseTime = Date.now();
            const duration = responseTime - this.requestStartTime;
            // Record the performance data
            this.performanceData.push({
                timestamp: responseTime,
                requestTime: this.requestStartTime,
                responseTime: responseTime,
                duration: duration,
                promptLength: this.promptText.length,
                responseLength: responseText ? responseText.length : 0
            });
            console.log(`Chat response received. Duration: ${duration}ms`);
            console.log(`Performance data entries: ${this.performanceData.length}`);
            this.requestStartTime = 0;
            this.promptText = '';
            this.savePerformanceData(); // Ensure data is saved
            // Update the status bar with the last response time
            this.updateStatusBar(duration);
            vscode.window.showInformationMessage(`Chat response received: ${duration}ms`);
        });
        this.disposables.push(startRequestCommand);
        this.disposables.push(endRequestCommand);
        this.disposables.push(this.statusBarItem);
        // Log that tracking has started
        console.log('Copilot chat tracking started');
    }
    startAutoTiming() {
        if (!this.trackingActive) {
            vscode.window.showErrorMessage('Chat tracking is not active. Start tracking first.');
            return;
        }
        // Register event listeners to detect chat activity
        const autoTimingStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        autoTimingStatusBarItem.text = "$(clock) Auto-timing: Active";
        autoTimingStatusBarItem.tooltip = "Copilot Chat auto-timing is active";
        autoTimingStatusBarItem.show();
        // Store the start time when the extension detects you're typing in the chat input
        const chatInputDetector = vscode.workspace.onDidChangeTextDocument((event) => {
            // Check if this is a chat input (this is an approximation as there's no direct API)
            if (event.document.uri.scheme === 'vscode' &&
                event.document.uri.path.includes('chat')) {
                if (this.requestStartTime === 0) {
                    this.requestStartTime = Date.now();
                    vscode.window.showInformationMessage('Detected chat input - timer started');
                }
            }
        });
        // Store the timing data when the extension detects a chat response
        const chatResponseDetector = vscode.window.onDidChangeVisibleTextEditors((editors) => {
            // If a chat response is being shown and we have a start time
            if (this.requestStartTime > 0) {
                const responseTime = Date.now();
                const duration = responseTime - this.requestStartTime;
                this.performanceData.push({
                    timestamp: responseTime,
                    requestTime: this.requestStartTime,
                    responseTime,
                    duration,
                    promptLength: this.promptText.length,
                    responseLength: 0 // We can't easily determine this
                });
                this.requestStartTime = 0;
                this.savePerformanceData();
                this.updateStatusBar(duration);
                vscode.window.showInformationMessage(`Chat response detected - time: ${duration}ms`);
            }
        });
        this.disposables.push(autoTimingStatusBarItem);
        this.disposables.push(chatInputDetector);
        this.disposables.push(chatResponseDetector);
    }
    stopTracking() {
        this.trackingActive = false;
        this.statusBarItem.text = "$(comment-discussion) Copilot Chat Tracking: Off";
        // Dispose of all event listeners
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        // Final save of performance data
        this.savePerformanceData();
    }
    showStatistics() {
        if (this.performanceData.length === 0) {
            vscode.window.showInformationMessage('No chat performance data collected yet.');
            return;
        }
        // Calculate statistics
        const durations = this.performanceData.map(d => d.duration);
        const avgDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        // Create a virtual document with statistics
        const statsPanel = vscode.window.createWebviewPanel('copilotChatStats', 'Copilot Chat Performance Statistics', vscode.ViewColumn.One, {});
        statsPanel.webview.html = this.getStatsWebviewContent(avgDuration, minDuration, maxDuration);
    }
    updateStatusBar(lastResponseTime) {
        this.statusBarItem.text = `$(comment-discussion) Copilot Chat: ${lastResponseTime}ms`;
        this.statusBarItem.tooltip = `Last Copilot Chat response time: ${lastResponseTime}ms`;
    }
    savePerformanceData() {
        if (this.logFile && this.performanceData.length > 0) {
            try {
                fs.writeFileSync(this.logFile, JSON.stringify(this.performanceData, null, 2));
                console.log(`Performance data saved to ${this.logFile}`);
                console.log(`Saved ${this.performanceData.length} entries`);
            }
            catch (error) { // Type the error as 'any' to access the message property
                console.error('Failed to save performance data:', error);
                const errorMessage = error && typeof error === 'object' && 'message' in error
                    ? error.message
                    : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to save performance data: ${errorMessage}`);
            }
        }
        else {
            console.warn('Cannot save performance data: log file is undefined or no data to save');
            if (!this.logFile) {
                vscode.window.showWarningMessage('Log file path not set. Performance data not saved.');
            }
        }
    }
    getStatsWebviewContent(avgDuration, minDuration, maxDuration) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Copilot Chat Performance Statistics</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .stat-container { margin-bottom: 20px; }
                    .stat-value { font-size: 24px; font-weight: bold; }
                    .stat-label { color: #666; }
                </style>
            </head>
            <body>
                <h1>Copilot Chat Performance Statistics</h1>
                
                <div class="stat-container">
                    <div class="stat-value">${avgDuration.toFixed(2)}ms</div>
                    <div class="stat-label">Average Response Time</div>
                </div>
                
                <div class="stat-container">
                    <div class="stat-value">${minDuration}ms</div>
                    <div class="stat-label">Minimum Response Time</div>
                </div>
                
                <div class="stat-container">
                    <div class="stat-value">${maxDuration}ms</div>
                    <div class="stat-label">Maximum Response Time</div>
                </div>
                
                <div class="stat-container">
                    <div class="stat-value">${this.performanceData.length}</div>
                    <div class="stat-label">Number of Measurements</div>
                </div>
            </body>
            </html>
        `;
    }
}
exports.CopilotChatTracker = CopilotChatTracker;
//# sourceMappingURL=chatTracker.js.map