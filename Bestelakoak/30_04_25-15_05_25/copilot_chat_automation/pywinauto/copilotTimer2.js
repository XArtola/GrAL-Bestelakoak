(function() {
    'use strict';

    console.log("Chat Working Timer Script Initializing (DevTools w/ Milliseconds)...");

    // --- Configuration ---
    const targetSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-input-toolbars > div.monaco-toolbar.chat-execute-toolbar > div > ul";
    const checkInterval = 500; // ms - For finding the target element initially
    const maxWaitTime = 15000; // ms - For finding the target element initially
    const timerUpdateInterval = 60; // ms - How often to refresh the timer display (e.g., ~16.6fps -> 60ms, ~10fps -> 100ms)

    // --- Data Storage ---
    // This will be accessible from the console
    window.copilotTimings = [];

    // --- Timer State ---
    let timerInterval = null;
    let startTime = null;
    let timerDisplayElement = null;
    let observer = null;
    let targetNode = null;
    let timerIsRunning = false;
    let currentSession = null;

    // --- Timer Functions ---
    function formatTime(totalMilliseconds) {
        // Ensure we have a non-negative number
        totalMilliseconds = Math.max(0, totalMilliseconds);

        const milliseconds = String(totalMilliseconds % 1000).padStart(3, '0');
        const totalSeconds = Math.floor(totalMilliseconds / 1000);
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        const totalMinutes = Math.floor(totalSeconds / 60);
        const minutes = String(totalMinutes % 60).padStart(2, '0');
        const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');

        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
    }

    function updateTimerDisplay() {
        if (!startTime || !timerDisplayElement) return;

        const now = Date.now();
        const elapsedMilliseconds = now - startTime;
        // Directly use the formatted time including milliseconds
        timerDisplayElement.textContent = `Working: ${formatTime(elapsedMilliseconds)}`;
    }

    function startTimer() {
        if (timerIsRunning) return;

        if (!timerDisplayElement || !targetNode) {
             console.error("Cannot start timer: Display element or target node not ready.");
             return;
        }

        console.log("State 3 Detected: Starting 'Working' Timer...");
        timerIsRunning = true;
        startTime = Date.now();
        
        // Create a new session object to track this request
        // Use local time format instead of UTC/GMT
        const now = new Date();
        const localISOString = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0') + '.' +
            String(now.getMilliseconds()).padStart(3, '0');
            
        currentSession = {
            requestTimestamp: localISOString,
            requestTimeMs: startTime,
            responseTimeMs: null,
            durationMs: null
        };

        if (timerInterval) clearInterval(timerInterval);

        updateTimerDisplay(); // Update immediately
        // Update display much more frequently
        timerInterval = setInterval(updateTimerDisplay, timerUpdateInterval);

        // Observer remains connected
    }

    function stopTimer() {
        if (!timerIsRunning) return;

        console.log("State 3 Ended: Stopping 'Working' Timer.");
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Calculate final time *before* resetting startTime
        const finalElapsedMs = startTime ? Date.now() - startTime : 0;
        const endTimeMs = Date.now();

        // Store the timing information in our session object and add to history
        if (currentSession) {
            currentSession.responseTimeMs = endTimeMs;
            currentSession.durationMs = finalElapsedMs;
            window.copilotTimings.push(currentSession);
            console.log("Stored timing data:", currentSession);
        }

        startTime = null; // Reset start time *after* calculating final duration
        timerIsRunning = false;
        currentSession = null;

         // Update display one last time to show the final duration accurately
        if (timerDisplayElement) {
             timerDisplayElement.textContent = `Working: ${formatTime(finalElapsedMs)}`;
        }

        // Log final time using the updated formatter
        console.log(`Total 'Working' time: ${formatTime(finalElapsedMs)}`);
    }

    function createTimerDisplay(parentElement) {
         const existingDisplay = parentElement.parentNode.querySelector('#chat-work-timer-display');
         if (existingDisplay) existingDisplay.remove();

         timerDisplayElement = document.createElement('span');
         timerDisplayElement.id = 'chat-work-timer-display';
         timerDisplayElement.style.marginLeft = '10px';
         timerDisplayElement.style.fontSize = '0.9em';
         timerDisplayElement.style.color = '#87ceeb'; // Sky blue
         timerDisplayElement.style.fontFamily = 'monospace'; // Use monospace for stable width
         timerDisplayElement.textContent = 'Working: 00:00:00.000'; // Include milliseconds
         parentElement.parentNode.insertBefore(timerDisplayElement, parentElement.nextSibling);
         console.log("Working timer display element created (with ms).");
    }

    // --- State Detection ---
    function isInWorkingState(ulElement) {
        if (!ulElement) return false;
        const cancelButton = ulElement.querySelector('li.action-item:last-child a.codicon-stop-circle');
        return !!cancelButton;
    }

    // --- Mutation Observer Logic ---
    const mutationCallback = function(mutationsList, obs) {
        if (!targetNode) return;

        const currentlyWorking = isInWorkingState(targetNode);

        if (currentlyWorking && !timerIsRunning) {
            startTimer();
        } else if (!currentlyWorking && timerIsRunning) {
            stopTimer();
        }
    };

    // --- Initialization ---
    function initializeObserver() {
        targetNode = document.querySelector(targetSelector);

        if (targetNode) {
            console.log("Target element found:", targetNode);
            createTimerDisplay(targetNode);

            if (isInWorkingState(targetNode)) {
                console.log("Script initialized while already in 'Working' state.");
                startTimer();
            } else {
                 console.log("Script initialized. Waiting for 'Working' state (Cancel button)...");
                 if(timerDisplayElement) timerDisplayElement.textContent = "Working: 00:00:00.000"; // Init display with ms
            }

            observer = new MutationObserver(mutationCallback);
            const config = {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['class', 'aria-disabled', 'aria-label']
            };
            observer.observe(targetNode, config);
            console.log("MutationObserver is now watching the target element for state changes.");

        } else {
            console.warn("Target element not found yet. Retrying...");
        }
    }

    // --- Wait for Target Element ---
    let checkCount = 0;
    const maxChecks = maxWaitTime / checkInterval;
    const checkIntervalId = setInterval(() => {
        checkCount++;
        let currentTarget = document.querySelector(targetSelector);
        if (currentTarget) {
            clearInterval(checkIntervalId);
            initializeObserver();
        } else if (checkCount >= maxChecks) {
            clearInterval(checkIntervalId);
            console.error(`Chat Working Timer Script: Target element "${targetSelector}" not found after ${maxWaitTime / 1000} seconds. Script will not run.`);
        }
    }, checkInterval);

    // --- Helper function to access timing data from console ---
    window.getCopilotTimings = function() {
        console.table(window.copilotTimings);
        return window.copilotTimings;
    };

})();

// Usage:
// This script tracks the time spent in the "Working" state in the VSCode Copilot chat panel.
// Timing data for each session is stored in the global variable `window.copilotTimings`.
// You can view the recorded timings by running `getCopilotTimings()` in the browser console.