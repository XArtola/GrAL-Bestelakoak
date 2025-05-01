import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceData {
    timestamp: number;
    requestTime: number;
    responseTime: number;
    duration: number;
    documentLength: number;
    suggestionLength: number | null;
}

export class CopilotPerformanceTracker {
    private disposables: vscode.Disposable[] = [];
    private performanceData: PerformanceData[] = [];
    private requestStartTime: number = 0;
    private trackingActive: boolean = false;
    private statusBarItem: vscode.StatusBarItem;
    private logFile: string | undefined;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this.statusBarItem.text = "$(pulse) Copilot Tracking: Off";
        this.statusBarItem.show();
        
        // Create a log file in the extension's directory
        const extensionPath = vscode.extensions.getExtension('copilot-performance-tracker')?.extensionPath;
        if (extensionPath) {
            const logsDir = path.join(extensionPath, 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            this.logFile = path.join(logsDir, `copilot-performance-${Date.now()}.json`);
        }
    }

    public startTracking() {
        if (this.trackingActive) {
            return;
        }

        this.trackingActive = true;
        this.statusBarItem.text = "$(pulse) Copilot Tracking: On";
        
        // Hook into Copilot's events
        // This is where we need to integrate with Copilot's API
        // For now, we'll use a proxy approach by monitoring editor changes

        // 1. Listen for when Copilot is triggered (this is a best approximation without direct API access)
        const typingListener = vscode.workspace.onDidChangeTextDocument((event) => {
            if (!this.trackingActive) return;
            
            // Assuming copilot is triggered after a pause in typing
            // This is not entirely accurate but serves as a placeholder for actual API integration
            this.requestStartTime = Date.now();
        });
        
        // 2. Listen for inlay hints or completions - using appropriate VS Code API events
        // Use document changes as a proxy for inlay hints/completions
        const completionListener = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            {
                provideCompletionItems: (document, position, token, context) => {
                    if (this.trackingActive && this.requestStartTime !== 0) {
                        const responseTime = Date.now();
                        const duration = responseTime - this.requestStartTime;
                        
                        // Record the performance data
                        this.performanceData.push({
                            timestamp: responseTime,
                            requestTime: this.requestStartTime,
                            responseTime,
                            duration,
                            documentLength: document.getText().length,
                            suggestionLength: null
                        });
                        
                        this.savePerformanceData();
                        this.updateStatusBar(duration);
                    }
                    
                    // Return null to allow regular completion providers to work
                    return null;
                }
            }
        );
        
        // Alternative approach: monitor visible ranges changes which might indicate
        // the presence of ghost text from Copilot
        const editorChangeListener = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
            if (!this.trackingActive || this.requestStartTime === 0) return;
            
            const responseTime = Date.now();
            const duration = responseTime - this.requestStartTime;
            
            const editor = vscode.window.activeTextEditor;
            const documentLength = editor ? editor.document.getText().length : 0;
            
            // Record the performance data
            this.performanceData.push({
                timestamp: responseTime,
                requestTime: this.requestStartTime,
                responseTime,
                duration,
                documentLength,
                suggestionLength: null
            });
            
            this.requestStartTime = 0;
            this.savePerformanceData();
            
            // Update the status bar with the last response time
            this.updateStatusBar(duration);
        });
        
        this.disposables.push(typingListener);
        this.disposables.push(completionListener);
        this.disposables.push(editorChangeListener);
        this.disposables.push(this.statusBarItem);
    }

    public stopTracking() {
        this.trackingActive = false;
        this.statusBarItem.text = "$(pulse) Copilot Tracking: Off";
        
        // Dispose of all event listeners
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        // Final save of performance data
        this.savePerformanceData();
    }

    public showStatistics() {
        if (this.performanceData.length === 0) {
            vscode.window.showInformationMessage('No performance data collected yet.');
            return;
        }

        // Calculate statistics
        const durations = this.performanceData.map(d => d.duration);
        const avgDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        
        // Create a virtual document with statistics
        const statsPanel = vscode.window.createWebviewPanel(
            'copilotStats',
            'Copilot Performance Statistics',
            vscode.ViewColumn.One,
            {}
        );
        
        statsPanel.webview.html = this.getStatsWebviewContent(avgDuration, minDuration, maxDuration);
    }

    private updateStatusBar(lastResponseTime: number) {
        this.statusBarItem.text = `$(pulse) Copilot: ${lastResponseTime}ms`;
        this.statusBarItem.tooltip = `Last Copilot response time: ${lastResponseTime}ms`;
    }

    private savePerformanceData() {
        if (this.logFile && this.performanceData.length > 0) {
            fs.writeFileSync(this.logFile, JSON.stringify(this.performanceData, null, 2));
        }
    }

    private getStatsWebviewContent(avgDuration: number, minDuration: number, maxDuration: number): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Copilot Performance Statistics</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .stat-container { margin-bottom: 20px; }
                    .stat-value { font-size: 24px; font-weight: bold; }
                    .stat-label { color: #666; }
                </style>
            </head>
            <body>
                <h1>Copilot Performance Statistics</h1>
                
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
