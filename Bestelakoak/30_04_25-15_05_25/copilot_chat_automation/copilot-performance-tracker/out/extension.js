"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const performanceTracker_1 = require("./performanceTracker");
const chatTracker_1 = require("./chatTracker");
let inlineTracker;
let chatTracker;
function activate(context) {
    console.log('Copilot Performance Tracker is now active');
    // Register the start tracking command for inline suggestions
    let startTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.startTracking', () => {
        if (!inlineTracker) {
            inlineTracker = new performanceTracker_1.CopilotPerformanceTracker();
            inlineTracker.startTracking();
            vscode.window.showInformationMessage('Copilot Inline Performance Tracking started');
        }
        else {
            vscode.window.showInformationMessage('Copilot Inline Performance Tracking is already active');
        }
    });
    // Register the stop tracking command for inline suggestions
    let stopTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.stopTracking', () => {
        if (inlineTracker) {
            inlineTracker.stopTracking();
            inlineTracker = undefined;
            vscode.window.showInformationMessage('Copilot Inline Performance Tracking stopped');
        }
        else {
            vscode.window.showInformationMessage('Copilot Inline Performance Tracking is not active');
        }
    });
    // Register the show stats command for inline suggestions
    let showStatsCommand = vscode.commands.registerCommand('copilot-performance-tracker.showStats', () => {
        if (inlineTracker) {
            inlineTracker.showStatistics();
        }
        else {
            vscode.window.showInformationMessage('No inline tracking data available. Start tracking first.');
        }
    });
    // Register the start tracking command for Copilot Chat
    let startChatTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.startChatTracking', () => {
        if (!chatTracker) {
            chatTracker = new chatTracker_1.CopilotChatTracker();
            chatTracker.startTracking();
            vscode.window.showInformationMessage('Copilot Chat Performance Tracking started');
        }
        else {
            vscode.window.showInformationMessage('Copilot Chat Performance Tracking is already active');
        }
    });
    // Register the stop tracking command for Copilot Chat
    let stopChatTrackingCommand = vscode.commands.registerCommand('copilot-performance-tracker.stopChatTracking', () => {
        if (chatTracker) {
            chatTracker.stopTracking();
            chatTracker = undefined;
            vscode.window.showInformationMessage('Copilot Chat Performance Tracking stopped');
        }
        else {
            vscode.window.showInformationMessage('Copilot Chat Performance Tracking is not active');
        }
    });
    // Register the show stats command for Copilot Chat
    let showChatStatsCommand = vscode.commands.registerCommand('copilot-performance-tracker.showChatStats', () => {
        if (chatTracker) {
            chatTracker.showStatistics();
        }
        else {
            vscode.window.showInformationMessage('No chat tracking data available. Start chat tracking first.');
        }
    });
    // Add auto-timing command for Copilot Chat
    let startAutoTimingCommand = vscode.commands.registerCommand('copilot-performance-tracker.startAutoTiming', () => {
        if (!chatTracker) {
            chatTracker = new chatTracker_1.CopilotChatTracker();
            chatTracker.startTracking();
        }
        chatTracker.startAutoTiming();
        vscode.window.showInformationMessage('Copilot Chat auto-timing started');
    });
    // Register manual measurement commands
    let startManualMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.startManualMeasurement', () => {
        const startTime = Date.now();
        // Store the start time in global state
        context.globalState.update('manualMeasurementStartTime', startTime);
        vscode.window.showInformationMessage('Manual measurement started. Run "End Manual Measurement" after receiving response.');
    });
    let endManualMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.endManualMeasurement', () => {
        const startTime = context.globalState.get('manualMeasurementStartTime');
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
    });
    // Add a special command for measuring with markers
    let startMarkerMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.startMarkerMeasurement', () => __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        context.globalState.update('markerMeasurementStartTime', startTime);
        // Copy a special prefix to clipboard that will mark the beginning of the query
        yield vscode.env.clipboard.writeText('[TIMING_START]');
        vscode.window.showInformationMessage('Marker measurement started. Paste [TIMING_START] at the beginning of your question, ' +
            'and look for [TIMING_END] at the end of Copilot\'s response.');
    }));
    // Register a handler that can be triggered from a user interface
    let checkMarkerMeasurementCommand = vscode.commands.registerCommand('copilot-performance-tracker.checkMarkerMeasurement', () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const startTime = context.globalState.get('markerMeasurementStartTime');
        if (!startTime) {
            vscode.window.showErrorMessage('No marker measurement in progress. Start one first.');
            return;
        }
        try {
            // Try to get the most recent response
            const clipboardContent = yield vscode.env.clipboard.readText();
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
                    prompt: ((_a = clipboardContent.split('[TIMING_START]')[1]) === null || _a === void 0 ? void 0 : _a.split('[TIMING_END]')[0]) || 'unknown',
                };
                // Add to log file
                const logPath = path.join(context.extensionPath, 'copilot-timing-log.json');
                let logData = [];
                if (fs.existsSync(logPath)) {
                    try {
                        const content = fs.readFileSync(logPath, 'utf-8');
                        logData = JSON.parse(content);
                    }
                    catch (e) {
                        console.error('Error reading log file:', e);
                    }
                }
                logData.push(logEntry);
                fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
            }
            else {
                vscode.window.showWarningMessage('No [TIMING_END] marker found in the response. ' +
                    'Make sure Copilot has finished responding.');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error checking markers: ${error}`);
        }
    }));
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
}
exports.activate = activate;
function deactivate() {
    if (inlineTracker) {
        inlineTracker.stopTracking();
        inlineTracker = undefined;
    }
    if (chatTracker) {
        chatTracker.stopTracking();
        chatTracker = undefined;
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map