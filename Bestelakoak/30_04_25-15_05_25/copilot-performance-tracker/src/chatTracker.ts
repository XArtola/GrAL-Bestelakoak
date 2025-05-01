import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface ChatPerformanceData {
    timestamp: number;
    requestTime: number;
    responseTime: number;
    duration: number;
    promptLength: number;
    responseLength: number;
}

export class CopilotChatTracker {
    private disposables: vscode.Disposable[] = [];
    private performanceData: ChatPerformanceData[] = [];
    private requestStartTime: number = 0;
    private promptText: string = '';
    private trackingActive: boolean = false;
    private statusBarItem: vscode.StatusBarItem;
    private logFile: string | undefined;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this.statusBarItem.text = "$(comment-discussion) Copilot Chat Tracking: Off";
        this.statusBarItem.show();
        
        // Create a log file in the extension's directory
        const extensionPath = vscode.extensions.getExtension('user.copilot-performance-tracker')?.extensionPath;
        if (extensionPath) {
            const logsDir = path.join(extensionPath, 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            this.logFile = path.join(logsDir, `copilot-chat-performance-${Date.now()}.json`);
        }
    }

    public startTracking() {
        if (this.trackingActive) {
            return;
        }

        this.trackingActive = true;
        this.statusBarItem.text = "$(comment-discussion) Copilot Chat Tracking: On";
        
        // Register commands to track chat interactions
        const startRequestCommand = vscode.commands.registerCommand('copilot-performance-tracker.startChatRequest', (promptText: string) => {
            if (!this.trackingActive) return;
            
            this.requestStartTime = Date.now();
            this.promptText = promptText || '';
            
            console.log(`Chat request started: ${this.requestStartTime}`);
            vscode.window.showInformationMessage(`Chat request started: ${this.requestStartTime}`);
        });
        
        const endRequestCommand = vscode.commands.registerCommand('copilot-performance-tracker.endChatRequest', (responseText: string) => {
            if (!this.trackingActive || this.requestStartTime === 0) return;
            
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

    public startAutoTiming() {
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

    public stopTracking() {
        this.trackingActive = false;
        this.statusBarItem.text = "$(comment-discussion) Copilot Chat Tracking: Off";
        
        // Dispose of all event listeners
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        // Final save of performance data
        this.savePerformanceData();
    }

    public showStatistics() {
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
        const statsPanel = vscode.window.createWebviewPanel(
            'copilotChatStats',
            'Copilot Chat Performance Statistics',
            vscode.ViewColumn.One,
            {}
        );
        
        statsPanel.webview.html = this.getStatsWebviewContent(avgDuration, minDuration, maxDuration);
    }

    /**
     * Starts tracking Copilot Workspace specifically
     * This method sets up listeners for Copilot Workspace events
     */
    public startCopilotWorkspaceTracking(): void {
        if (!this.trackingActive) {
            this.startTracking();
        }
        
        // Create a status bar item specifically for Copilot Workspace tracking
        const workspaceTrackerStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        workspaceTrackerStatusItem.text = "$(github) Copilot Workspace Tracking: Active";
        workspaceTrackerStatusItem.tooltip = "Tracking performance of GitHub Copilot Workspace";
        workspaceTrackerStatusItem.show();
        
        // Listen for webview panel creation events (Copilot Workspace uses webview panels)
        const webviewPanelTracker = vscode.window.onDidCreateWebviewPanel((webviewPanel) => {
            // Check if this is a Copilot Workspace panel
            if (webviewPanel.viewType.includes('github.copilot') || 
                webviewPanel.title.includes('Copilot')) {
                
                console.log(`Detected Copilot Workspace panel: ${webviewPanel.title}`);
                
                // Start timing when a Copilot Workspace session begins
                if (this.requestStartTime === 0) {
                    this.requestStartTime = Date.now();
                    this.promptText = `Copilot Workspace: ${webviewPanel.title}`;
                    console.log(`Started timing Copilot Workspace session at ${this.requestStartTime}`);
                    vscode.window.showInformationMessage(`Started timing Copilot Workspace session`);
                }
                
                // Listen for panel disposal to potentially end timing
                webviewPanel.onDidDispose(() => {
                    if (this.requestStartTime > 0) {
                        // Only end if this appears to be the end of a session
                        this.endCopilotWorkspaceSession();
                    }
                });
            }
        });
        
        this.disposables.push(workspaceTrackerStatusItem);
        this.disposables.push(webviewPanelTracker);
        
        // Also try to detect Copilot Workspace through command execution
        const commandSpy = vscode.commands.registerCommand('github.copilot.workspace.execute', (...args: any[]) => {
            // This is a proxy command that will execute after the real command
            console.log('Detected Copilot Workspace command execution');
            if (args && args.length > 0) {
                // Extract any relevant info from the command arguments
                const commandInfo = JSON.stringify(args[0]).substring(0, 100);
                this.trackCopilotWorkspaceCommand(commandInfo);
            }
        }, this);
        
        this.disposables.push(commandSpy);
    }
    
    /**
     * Track a specific Copilot Workspace command execution
     */
    public trackCopilotWorkspaceCommand(commandInfo: string): void {
        this.requestStartTime = Date.now();
        this.promptText = `Copilot Workspace Command: ${commandInfo}`;
        console.log(`Started tracking Copilot Workspace command at ${this.requestStartTime}`);
    }
    
    /**
     * End tracking for a Copilot Workspace session
     */
    public endCopilotWorkspaceSession(responseText: string = ''): number {
        if (this.requestStartTime === 0) return 0;
        
        const responseTime = Date.now();
        const duration = responseTime - this.requestStartTime;
        
        this.performanceData.push({
            timestamp: responseTime,
            requestTime: this.requestStartTime,
            responseTime: responseTime,
            duration: duration,
            promptLength: this.promptText.length,
            responseLength: responseText.length,
        });
        
        console.log(`Copilot Workspace session ended. Duration: ${duration}ms`);
        
        this.requestStartTime = 0;
        this.savePerformanceData();
        this.updateStatusBar(duration);
        
        vscode.window.showInformationMessage(`Copilot Workspace session completed: ${duration}ms`);
        return duration;
    }
    
    /**
     * Manually force the recording of a Copilot Workspace interaction
     * This can be called directly from the extension API
     */
    public recordCopilotWorkspaceInteraction(details: {
        promptText: string,
        responseText: string,
        startTime?: number,
        endTime?: number
    }): number {
        const now = Date.now();
        const startTime = details.startTime || now - 1000; // Default to 1 second ago if not provided
        const endTime = details.endTime || now;
        const duration = endTime - startTime;
        
        this.performanceData.push({
            timestamp: endTime,
            requestTime: startTime,
            responseTime: endTime,
            duration: duration,
            promptLength: details.promptText.length,
            responseLength: details.responseText.length
        });
        
        console.log(`Recorded manual Copilot Workspace interaction. Duration: ${duration}ms`);
        this.savePerformanceData();
        this.updateStatusBar(duration);
        
        return duration;
    }

    /**
     * Public API: Manual tracking of chat sessions
     * Can be called from other extensions
     */
    public trackChatSession(promptText: string): number {
        if (!this.trackingActive) {
            this.startTracking();
        }
        
        this.requestStartTime = Date.now();
        this.promptText = promptText || '';
        
        console.log(`Chat request started via API: ${this.requestStartTime}`);
        return this.requestStartTime;
    }
    
    /**
     * Public API: Record the end of a chat session
     * Can be called from other extensions
     */
    public endChatSession(responseText: string, startTime?: number): number {
        if (!this.trackingActive) return 0;
        
        // If a custom start time was provided, use it
        if (startTime && startTime > 0) {
            this.requestStartTime = startTime;
        }
        
        if (this.requestStartTime === 0) return 0;
        
        const responseTime = Date.now();
        const duration = responseTime - this.requestStartTime;
        
        this.performanceData.push({
            timestamp: responseTime,
            requestTime: this.requestStartTime,
            responseTime: responseTime,
            duration: duration,
            promptLength: this.promptText.length,
            responseLength: responseText ? responseText.length : 0
        });
        
        console.log(`Chat response received via API. Duration: ${duration}ms`);
        
        this.requestStartTime = 0;
        this.promptText = '';
        this.savePerformanceData();
        this.updateStatusBar(duration);
        
        return duration;
    }
    
    /**
     * Public API: Check if tracking is active
     */
    public isTrackingActive(): boolean {
        return this.trackingActive;
    }
    
    /**
     * Public API: Get current performance data
     */
    public getPerformanceData(): ChatPerformanceData[] {
        return [...this.performanceData]; // Return a copy to prevent modification
    }

    private updateStatusBar(lastResponseTime: number) {
        this.statusBarItem.text = `$(comment-discussion) Copilot Chat: ${lastResponseTime}ms`;
        this.statusBarItem.tooltip = `Last Copilot Chat response time: ${lastResponseTime}ms`;
    }

    private savePerformanceData() {
        if (this.logFile && this.performanceData.length > 0) {
            try {
                fs.writeFileSync(this.logFile, JSON.stringify(this.performanceData, null, 2));
                console.log(`Performance data saved to ${this.logFile}`);
                console.log(`Saved ${this.performanceData.length} entries`);
            } catch (error: any) { // Type the error as 'any' to access the message property
                console.error('Failed to save performance data:', error);
                const errorMessage = error && typeof error === 'object' && 'message' in error 
                    ? error.message 
                    : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to save performance data: ${errorMessage}`);
            }
        } else {
            console.warn('Cannot save performance data: log file is undefined or no data to save');
            if (!this.logFile) {
                vscode.window.showWarningMessage('Log file path not set. Performance data not saved.');
            }
        }
    }

    private getStatsWebviewContent(avgDuration: number, minDuration: number, maxDuration: number): string {
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
