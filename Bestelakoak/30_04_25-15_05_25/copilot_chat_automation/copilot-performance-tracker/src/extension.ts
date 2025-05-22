import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CopilotPerformanceTracker } from './performanceTracker';
import { CopilotChatTracker } from './chatTracker';

let inlineTracker: CopilotPerformanceTracker | undefined;
let chatTracker: CopilotChatTracker | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Copilot Performance Tracker is now active');
    
    const cfg = vscode.workspace.getConfiguration('copilot-performance-tracker');
    const delay = cfg.get<number>('responseDelay', 0);

    // Register the start tracking command for inline suggestions
    let startTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.startTracking', () => {
        setTimeout(() => {
            if (!inlineTracker) {
                inlineTracker = new CopilotPerformanceTracker();
                inlineTracker.startTracking();
                vscode.window.showInformationMessage('Copilot Inline Performance Tracking started');
            } else {
                vscode.window.showInformationMessage('Copilot Inline Performance Tracking is already active');
            }
        }, delay);
    });
    
    // Register the stop tracking command for inline suggestions
    let stopTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.stopTracking', () => {
        setTimeout(() => {
            if (inlineTracker) {
                inlineTracker.stopTracking();
                inlineTracker = undefined;
                vscode.window.showInformationMessage('Copilot Inline Performance Tracking stopped');
            } else {
                vscode.window.showInformationMessage('Copilot Inline Performance Tracking is not active');
            }
        }, delay);
    });
    
    // Register the show stats command for inline suggestions
    let showStatsCommand = vscode.commands.registerCommand('copilot-performance-tracker.showStats', () => {
        setTimeout(() => {
            if (inlineTracker) {
                inlineTracker.showStatistics();
            } else {
                vscode.window.showInformationMessage('No inline tracking data available. Start tracking first.');
            }
        }, delay);
    });
    
    // Register the start tracking command for Copilot Chat
    let startChatTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.startChatTracking', () => {
        setTimeout(() => {
            if (!chatTracker) {
                chatTracker = new CopilotChatTracker();
                chatTracker.startTracking();
                vscode.window.showInformationMessage('Copilot Chat Performance Tracking started');
            } else {
                vscode.window.showInformationMessage('Copilot Chat Performance Tracking is already active');
            }
        }, delay);
    });
    
    // Register the stop tracking command for Copilot Chat
    let stopChatTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.stopChatTracking', () => {
        setTimeout(() => {
            if (chatTracker) {
                chatTracker.stopTracking();
                chatTracker = undefined;
                vscode.window.showInformationMessage('Copilot Chat Performance Tracking stopped');
            } else {
                vscode.window.showInformationMessage('Copilot Chat Performance Tracking is not active');
            }
        }, delay);
    });
    
    // Register the show stats command for Copilot Chat
    let showChatStatsCommand = vscode.commands.registerCommand('copilot-performance-tracker.showChatStats', () => {
        setTimeout(() => {
            if (chatTracker) {
                chatTracker.showStatistics();
            } else {
                vscode.window.showInformationMessage('No chat tracking data available. Start chat tracking first.');
            }
        }, delay);
    });
    
    // Add auto-timing command for Copilot Chat
    let startAutoTimingCommand = vscode.commands.registerCommand('copilot-performance-tracker.startAutoTiming', () => {
        setTimeout(() => {
            if (!chatTracker) {
                chatTracker = new CopilotChatTracker();
                chatTracker.startTracking();
            }
            
            chatTracker.startAutoTiming();
            vscode.window.showInformationMessage('Copilot Chat auto-timing started');
        }, delay);
    });
    
    // Register manual measurement commands
    let startManualMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.startManualMeasurement', () => {
        setTimeout(() => {
            const startTime = Date.now();
            // Store the start time in global state
            context.globalState.update('manualMeasurementStartTime', startTime);
            vscode.window.showInformationMessage('Manual measurement started. Run "End Manual Measurement" after receiving response.');
        }, delay);
    });
    
    let endManualMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.endManualMeasurement', () => {
        setTimeout(() => {
            const startTime = context.globalState.get<number>('manualMeasurementStartTime');
            if (!startTime) {
                vscode.window.showErrorMessage('No manual measurement in progress.');
                return;
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Clear the start time
            context.globalState.update('manualMeasurementStartTime', undefined);
            
            // Show the result
            vscode.window.showInformationMessage(`Response time: ${duration}ms`);
        }, delay);
    });

    // Add a special command for measuring with markers
    let startMarkerMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.startMarkerMeasurement', async () => {
        setTimeout(async () => {
            const startTime = Date.now();
            context.globalState.update('markerMeasurementStartTime', startTime);
            
            // Copy a special prefix to clipboard that will mark the beginning of the query
            await vscode.env.clipboard.writeText('[TIMING_START]');
            
            vscode.window.showInformationMessage(
                'Marker measurement started. Paste [TIMING_START] at the beginning of your question, ' + 
                'and look for [TIMING_END] at the end of Copilot\'s response.'
            );
        }, delay);
    });
    
    // Register a handler that can be triggered from a user interface
    let checkMarkerMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.checkMarkerMeasurement', async () => {
        setTimeout(async () => {
            const startTime = context.globalState.get<number>('markerMeasurementStartTime');
            if (!startTime) {
                vscode.window.showErrorMessage('No marker measurement in progress. Start one first.');
                return;
            }
            
            try {
                // Try to get the most recent response
                const clipboardContent = await vscode.env.clipboard.readText();
                
                if (clipboardContent.includes('[TIMING_END]')) {
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    
                    // Clear the start time
                    context.globalState.update('markerMeasurementStartTime', undefined);
                    
                    // Show the result and add to a log file
                    vscode.window.showInformationMessage(`Response time (with markers): ${duration}ms`);
                    
                    // Log the timing data
                    const logEntry = {
                        timestamp: new Date().toISOString(),
                        duration: duration,
                        prompt: clipboardContent.split('[TIMING_START]')[1]?.split('[TIMING_END]')[0] || 'unknown',
                    };
                    
                    // Add to log file
                    const logPath = path.join(context.extensionPath, 'copilot-timing-log.json');
                    let logData: any[] = [];
                    
                    if (fs.existsSync(logPath)) {
                        try {
                            const content = fs.readFileSync(logPath, 'utf-8');
                            logData = JSON.parse(content);
                        } catch (e) {
                            console.error('Error reading log file:', e);
                        }
                    }
                    
                    logData.push(logEntry);
                    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
                } else {
                    vscode.window.showWarningMessage(
                        'No [TIMING_END] marker found in the response. ' +
                        'Make sure Copilot has finished responding.'
                    );
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error checking markers: ${error}`);
            }
        }, delay);
    });
    
    context.subscriptions.push(startTrackingCommand);
    context.subscriptions.push(stopTrackingCommand);
    context.subscriptions.push(showStatsCommand);
    context.subscriptions.push(startChatTrackingCommand);
    context.subscriptions.push(stopChatTrackingCommand);
    context.subscriptions.push(showChatStatsCommand);
    context.subscriptions.push(startAutoTimingCommand);
    context.subscriptions.push(startManualMeasurementCommand);
    context.subscriptions.push(endManualMeasurementCommand);
    context.subscriptions.push(startMarkerMeasurementCommand);
    context.subscriptions.push(checkMarkerMeasurementCommand);

    // Register commands that can be called via Command Palette
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-performance-tracker.startTracking', () => {
            setTimeout(() => {
                chatTracker?.startTracking();
                vscode.window.showInformationMessage('Copilot Chat tracking started');
            }, delay);
        }),
        
        vscode.commands.registerCommand('copilot-performance-tracker.stopTracking', () => {
            setTimeout(() => {
                chatTracker?.stopTracking();
                vscode.window.showInformationMessage('Copilot Chat tracking stopped');
            }, delay);
        }),
        
        vscode.commands.registerCommand('copilot-performance-tracker.showStatistics', () => {
            setTimeout(() => {
                chatTracker?.showStatistics();
            }, delay);
        }),
        
        // Commands that can be called from other extensions
        vscode.commands.registerCommand('copilot-performance-tracker.api.trackChatSession', 
            (promptText: string) => {
                return chatTracker?.trackChatSession(promptText);
            }
        ),
        
        vscode.commands.registerCommand('copilot-performance-tracker.api.endChatSession', 
            (responseText: string, startTime?: number) => {
                return chatTracker?.endChatSession(responseText, startTime);
            }
        ),
        
        vscode.commands.registerCommand('copilot-performance-tracker.api.isTrackingActive', 
            () => {
                return chatTracker?.isTrackingActive();
            }
        ),
        
        vscode.commands.registerCommand('copilot-performance-tracker.api.getPerformanceData', 
            () => {
                return chatTracker?.getPerformanceData();
            }
        ),
        
        // Specific commands for Copilot Workspace tracking
        vscode.commands.registerCommand('copilot-performance-tracker.startWorkspaceTracking', () => {
            setTimeout(() => {
                chatTracker?.startCopilotWorkspaceTracking();
                vscode.window.showInformationMessage('Copilot Workspace tracking started');
            }, delay);
        }),
        
        vscode.commands.registerCommand('copilot-performance-tracker.endWorkspaceSession', (responseText?: string) => {
            setTimeout(() => {
                chatTracker?.endCopilotWorkspaceSession(responseText);
            }, delay);
        }),
        
        vscode.commands.registerCommand('copilot-performance-tracker.recordWorkspaceInteraction', 
            (details: { promptText: string, responseText: string, startTime?: number, endTime?: number }) => {
                return chatTracker?.recordCopilotWorkspaceInteraction(details);
            }
        ),
        
        // Try to intercept Copilot Workspace commands
        vscode.commands.registerCommand('github.copilot.workspace.executeIntercept', async (...args: any[]) => {
            console.log('Intercepted Copilot Workspace command');
            
            // Start timing
            const startTime = Date.now();
            let promptInfo = '';
            
            if (args && args.length > 0) {
                promptInfo = JSON.stringify(args[0]).substring(0, 100);
            }
            
            // Execute the actual command
            try {
                const result = await vscode.commands.executeCommand('github.copilot.workspace.execute', ...args);
                
                // End timing
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Record the interaction
                chatTracker?.recordCopilotWorkspaceInteraction({
                    promptText: promptInfo,
                    responseText: JSON.stringify(result).substring(0, 100),
                    startTime: startTime,
                    endTime: endTime
                });
                
                return result;
            } catch (error) {
                console.error('Error executing Copilot Workspace command:', error);
                throw error;
            }
        })
    );
    
    // Try to detect when Copilot Workspace extension is activated
    const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
    const copilotChatExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
    
    if (copilotExtension || copilotChatExtension) {
        console.log('GitHub Copilot extensions detected');
        
        // Set up an observer that watches for Copilot views
        setInterval(() => {
            vscode.window.tabGroups.all.forEach(tabGroup => {
                tabGroup.tabs.forEach(tab => {
                    if (tab.label.includes('Copilot') || 
                        (tab.input && (tab.input as any).viewType?.includes('github.copilot'))) {
                        // This is likely a Copilot tab
                        if (chatTracker && !chatTracker.isTrackingActive()) {
                            chatTracker.startCopilotWorkspaceTracking();
                            console.log('Detected Copilot tab and started tracking');
                        }
                    }
                });
            });
        }, 5000); // Check every 5 seconds
    }
    
    // Return API for other extensions to use
    return {
        trackChatSession: (promptText: string) => chatTracker?.trackChatSession(promptText),
        endChatSession: (responseText: string, startTime?: number) => chatTracker?.endChatSession(responseText, startTime),
        isTrackingActive: () => chatTracker?.isTrackingActive(),
        getPerformanceData: () => chatTracker?.getPerformanceData(),
        
        // Copilot Workspace specific API
        startCopilotWorkspaceTracking: () => chatTracker?.startCopilotWorkspaceTracking(),
        endCopilotWorkspaceSession: (responseText?: string) => chatTracker?.endCopilotWorkspaceSession(responseText),
        recordCopilotWorkspaceInteraction: (details: { 
            promptText: string, 
            responseText: string, 
            startTime?: number, 
            endTime?: number 
        }) => chatTracker?.recordCopilotWorkspaceInteraction(details)
    };
}

export function deactivate() {
    if (inlineTracker) {
        inlineTracker.stopTracking();
        inlineTracker = undefined;
    }
    
    if (chatTracker) {
        chatTracker.stopTracking();
        chatTracker = undefined;
    }
}
