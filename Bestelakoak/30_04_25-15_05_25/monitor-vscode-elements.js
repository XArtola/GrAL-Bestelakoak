/**
 * Monitor changes to specific DOM elements
 * @param {string} selector - CSS selector for elements to monitor
 * @param {object} options - MutationObserver options (optional)
 */
function monitorElements(selector, options = {}) {
    // Default options for the MutationObserver
    const defaultOptions = {
        attributes: true,        // Monitor attribute changes
        childList: true,         // Monitor child element additions/removals
        characterData: true,     // Monitor text content changes
        subtree: true,           // Monitor the entire subtree (all descendants)
        attributeOldValue: true, // Track previous attribute values
        characterDataOldValue: true // Track previous text content
    };

    // Merge default options with provided options
    const observerOptions = { ...defaultOptions, ...options };
    
    // Find elements matching the selector
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
        console.warn(`No elements found matching selector: "${selector}"`);
        return null;
    }
    
    console.log(`Monitoring ${elements.length} element(s) matching: "${selector}"`);
    
    // Store original states and timers for each element
    const elementStates = new Map();
    
    // Capture initial state of each element
    elements.forEach(element => {
        const initialState = {
            attributes: captureAttributes(element),
            innerHTML: element.innerHTML,
            textContent: element.textContent
        };
        
        elementStates.set(element, {
            initialState,
            currentlyChanged: false,
            changeStartTime: null
        });
    });
    
    // Function to capture element attributes
    function captureAttributes(element) {
        const attributes = {};
        for (const attr of element.attributes) {
            attributes[attr.name] = attr.value;
        }
        return attributes;
    }
    
    // Function to check if element is back to original state
    function isBackToOriginalState(element) {
        const state = elementStates.get(element);
        if (!state) return false;
        
        const initial = state.initialState;
        
        // Check attributes
        const currentAttrs = captureAttributes(element);
        const initialAttrs = initial.attributes;
        
        // Compare attribute count
        if (Object.keys(currentAttrs).length !== Object.keys(initialAttrs).length) {
            return false;
        }
        
        // Compare each attribute
        for (const attrName in initialAttrs) {
            if (currentAttrs[attrName] !== initialAttrs[attrName]) {
                return false;
            }
        }
        
        // Compare innerHTML and textContent
        return (
            element.innerHTML === initial.innerHTML &&
            element.textContent === initial.textContent
        );
    }
    
    // Create a mutation observer
    const observer = new MutationObserver((mutations) => {
        const changedElements = new Set();
        
        mutations.forEach((mutation) => {
            changedElements.add(mutation.target);
            
            const targetElement = mutation.target.closest(selector) || mutation.target;
            const stateInfo = elementStates.get(targetElement);
            
            if (stateInfo && !stateInfo.currentlyChanged) {
                // Element just changed from original state
                stateInfo.currentlyChanged = true;
                stateInfo.changeStartTime = performance.now();
                console.log(`%c⏱️ Timer started for element:`, 'color: green; font-weight: bold', targetElement);
            }
        });
        
        // For all changed elements, check if any returned to original state
        changedElements.forEach(element => {
            const targetElement = element.closest(selector) || element;
            const stateInfo = elementStates.get(targetElement);
            
            if (stateInfo && stateInfo.currentlyChanged) {
                if (isBackToOriginalState(targetElement)) {
                    const endTime = performance.now();
                    const duration = endTime - stateInfo.changeStartTime;
                    
                    console.group(`%c⏱️ Element returned to original state`, 'color: blue; font-weight: bold');
                    console.log('Element:', targetElement);
                    console.log(`%cTime elapsed: ${duration.toFixed(2)}ms`, 'color: red; font-weight: bold');
                    console.groupEnd();
                    
                    stateInfo.currentlyChanged = false;
                    stateInfo.changeStartTime = null;
                }
            }
        });
        
        // Original logging
        mutations.forEach((mutation) => {
            console.group(`Change detected at ${new Date().toLocaleTimeString()}`);
            console.log('Element:', mutation.target);
            console.log('Type:', mutation.type);
            
            switch (mutation.type) {
                case 'attributes':
                    console.log('Attribute name:', mutation.attributeName);
                    console.log('Old value:', mutation.oldValue);
                    console.log('New value:', mutation.target.getAttribute(mutation.attributeName));
                    break;
                    
                case 'characterData':
                    console.log('Old text:', mutation.oldValue);
                    console.log('New text:', mutation.target.textContent);
                    break;
                    
                case 'childList':
                    if (mutation.addedNodes.length) {
                        console.log('Added nodes:', mutation.addedNodes);
                    }
                    
                    if (mutation.removedNodes.length) {
                        console.log('Removed nodes:', mutation.removedNodes);
                    }
                    break;
            }
            
            console.groupEnd();
        });
    });
    
    // Start observing each matched element
    elements.forEach(element => {
        observer.observe(element, observerOptions);
    });
    
    return {
        observer,
        elements,
        stop: () => {
            observer.disconnect();
            console.log(`Stopped monitoring ${elements.length} element(s)`);
        },
        getActiveTimers: () => {
            const activeTimers = [];
            elementStates.forEach((state, element) => {
                if (state.currentlyChanged) {
                    const currentDuration = performance.now() - state.changeStartTime;
                    activeTimers.push({
                        element,
                        duration: currentDuration,
                        startedAt: new Date(performance.now() - currentDuration)
                    });
                }
            });
            return activeTimers;
        }
    };
}

/**
 * Helper function to monitor VSCode chat panel execute button specifically
 * @returns {Object|null} Monitor object or null if element not found
 */
function monitorVSCodeChatExecuteButton() {
    const vscodeSelector = `#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-input-toolbars > div.monaco-toolbar.chat-execute-toolbar > div > ul > li.action-item.monaco-dropdown-with-primary.disabled > div.action-container.disabled.menu-entry > a`;
    
    const chatExecuteButton = document.querySelector(vscodeSelector);
    
    if (!chatExecuteButton) {
        console.warn('VSCode chat execute button not found. Either the selector is incorrect or the element is not loaded yet.');
        console.info('Try running this function again after the interface is fully loaded.');
        return null;
    }
    
    console.log('%c📌 Found VSCode chat execute button! Now monitoring state changes...', 'color: purple; font-weight: bold');
    console.log('Element:', chatExecuteButton);
    
    return monitorElements(vscodeSelector);
}

/**
 * Tests the monitoring functionality by tracking the execution button changes
 */
function testVSCodeMonitoring() {
    console.clear();
    console.log('%c🧪 Starting VSCode element monitoring test...', 'color: blue; font-weight: bold; font-size: 14px;');
    
    // Start monitoring the chat execute button
    const chatMonitor = monitorVSCodeChatExecuteButton();
    
    if (!chatMonitor) {
        console.error('Failed to initialize monitor. Element might not be found.');
        return;
    }
    
    console.log('%c✅ Monitoring successfully started!', 'color: green;');
    console.log('Now you can:');
    console.log('1. Interact with the VSCode chat panel');
    console.log('2. The timer will start when the button changes state');
    console.log('3. The timer will show elapsed time when the button returns to original state');
    console.log('4. To check active timers, run: chatMonitor.getActiveTimers()');
    console.log('5. To stop monitoring, run: chatMonitor.stop()');
    
    return chatMonitor;
}

/**
 * Specially monitors the VSCode chat execute button for aria-label changes
 * @returns {Object|null} - Monitor object or null if element not found
 */
function monitorVSCodeSendButton() {
    console.clear();
    console.log('%c🔍 Setting up VSCode Send Button monitoring...', 'color: purple; font-weight: bold; font-size: 14px');
    
    const exactSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body.wide > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-input-toolbars > div.monaco-toolbar.chat-execute-toolbar > div > ul > li.action-item.monaco-dropdown-with-primary.disabled > div.action-container.disabled.menu-entry > a";
    
    const sendButton = document.querySelector(exactSelector);
    
    if (!sendButton) {
        console.error("❌ VSCode Send button not found. Make sure the chat panel is open and visible.");
        return null;
    }
    
    console.log('%c✅ Found VSCode Send button!', 'color: green; font-weight: bold');
    console.log('Button:', sendButton);
    console.log('Current aria-label:', sendButton.getAttribute('aria-label'));
    
    // Setup state tracking
    const originalAriaLabel = sendButton.getAttribute('aria-label');
    let timerStarted = false;
    let startTime = null;
    
    console.log(`%c👀 Watching for aria-label to change from "${originalAriaLabel || 'none'}"`, 'color: blue');
    
    // Create a mutation observer specifically for aria-label changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'aria-label') {
                const currentLabel = sendButton.getAttribute('aria-label');
                const originalLabel = "Send (Enter)";
                
                console.log(`Aria-label changed: ${mutation.oldValue} → ${currentLabel}`);
                
                // If changing from "Send (Enter)" to something else, start timer
                if (!timerStarted && mutation.oldValue === originalLabel) {
                    timerStarted = true;
                    startTime = performance.now();
                    console.log(`%c⏱️ Timer started - Button changed from "${originalLabel}"`, 'color: green; font-weight: bold');
                }
                // If returning to "Send (Enter)", stop timer
                else if (timerStarted && currentLabel === originalLabel) {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    console.group('%c⏱️ Button returned to original state', 'color: blue; font-weight: bold');
                    console.log('Element:', sendButton);
                    console.log(`%cTime elapsed: ${duration.toFixed(2)}ms`, 'color: red; font-weight: bold; font-size: 14px');
                    console.groupEnd();
                    
                    timerStarted = false;
                    startTime = null;
                }
            }
        });
    });
    
    // Setup options to specifically watch aria-label attribute
    observer.observe(sendButton, {
        attributes: true,
        attributeFilter: ['aria-label'],
        attributeOldValue: true
    });
    
    return {
        element: sendButton,
        observer,
        stop: () => {
            observer.disconnect();
            console.log('Stopped monitoring VSCode Send button');
        },
        getTimerStatus: () => {
            if (timerStarted) {
                const currentDuration = performance.now() - startTime;
                return {
                    active: true,
                    startedAt: new Date(performance.now() - currentDuration),
                    currentDuration: currentDuration.toFixed(2) + 'ms'
                };
            } else {
                return { active: false };
            }
        }
    };
}

/**
 * Specifically monitors the VSCode Send button for aria-label changes between 
 * "Send (Enter)" and "Cancel (Alt+Backspace)" and measures the time elapsed
 * @returns {Object|null} - Monitor object or null if element not found
 */
function monitorVSCodeSendToCancelButton() {
    console.clear();
    console.log('%c🎯 Setting up VSCode Send-to-Cancel Button monitoring...', 'color: purple; font-weight: bold; font-size: 14px');
    
    // The exact CSS selector for the VSCode Chat's send/cancel button
    // This targets the button regardless of its current state
    const exactSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body.wide > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-input-toolbars > div.monaco-toolbar.chat-execute-toolbar > div > ul > li.action-item.monaco-dropdown-with-primary.disabled > div.action-container.disabled.menu-entry > a";
    
    const sendButton = document.querySelector(exactSelector);
    
    if (!sendButton) {
        console.error("❌ VSCode button not found. Make sure the chat panel is open and visible.");
        console.log("The exact selector may have changed. Try inspecting the element again in the developer tools.");
        return null;
    }
    
    const currentLabel = sendButton.getAttribute('aria-label');
    console.log('%c✅ Found VSCode button!', 'color: green; font-weight: bold');
    console.log('Button:', sendButton);
    console.log('Current aria-label:', currentLabel);
    
    // Define the two specific states we're tracking transitions between
    const SEND_LABEL = "Send (Enter)";              // Idle state - button ready to be clicked
    const CANCEL_LABEL = "Cancel (Alt+Backspace)";  // Processing state - when request is being processed
    
    // Variables for tracking the timing
    let timerStarted = false;     // Flag to indicate if we're currently timing
    let startTime = null;         // Timestamp when timing started
    let totalExecutions = 0;      // Counter for total number of complete timing cycles
    let totalExecutionTime = 0;   // Accumulated total time for all executions (for calculating average)
    
    // Debug log current attribute value to help diagnose issues
    console.log(`%c🔍 CURRENT BUTTON STATE: aria-label="${currentLabel}"`, 'color: purple; font-weight: bold');
    
    // Check the initial state of the button and set up appropriately
    if (currentLabel === SEND_LABEL) {
        console.log(`%c👀 Waiting for aria-label to change from "${SEND_LABEL}" to "${CANCEL_LABEL}"...`, 'color: blue');
    } else if (currentLabel === CANCEL_LABEL) {
        // If we're starting in the cancel state, begin timing from now
        console.log(`%c⚠️ Button is already in "${CANCEL_LABEL}" state. Waiting for it to return to "${SEND_LABEL}"`, 'color: orange');
        timerStarted = true;
        startTime = performance.now();
    } else {
        console.log(`%c⚠️ Button has unexpected aria-label: "${currentLabel}". Will wait for specific state changes.`, 'color: orange');
    }
    
    // Create a mutation observer to watch for aria-label changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Only care about aria-label attribute changes
            if (mutation.type === 'attributes' && mutation.attributeName === 'aria-label') {
                const oldLabel = mutation.oldValue;
                const newLabel = sendButton.getAttribute('aria-label');
                
                // Detailed logging for debugging
                console.group(`%c🔄 Aria-label change detected`, 'color: purple');
                console.log(`Old value: "${oldLabel}"`);
                console.log(`New value: "${newLabel}"`);
                console.log(`Timer active: ${timerStarted}`);
                if (timerStarted) {
                    console.log(`Current timer duration: ${(performance.now() - startTime).toFixed(2)}ms`);
                }
                console.groupEnd();
                
                // CASE 1: Start timer when button changes from Send to Cancel
                // This happens when the user submits a request
                if (oldLabel === SEND_LABEL && newLabel === CANCEL_LABEL) {
                    timerStarted = true;
                    startTime = performance.now();
                    console.group(`%c⏱️ STARTED TIMING: Button changed from "${SEND_LABEL}" to "${CANCEL_LABEL}"`, 
                                'color: green; font-weight: bold');
                    console.log('Time started:', new Date().toLocaleTimeString());
                    console.groupEnd();
                }
                // CASE 2: Stop timer when button returns to Send state
                // This happens when the request completes processing
                else if (timerStarted && newLabel === SEND_LABEL) {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    totalExecutions++;
                    totalExecutionTime += duration;
                    
                    // Display the results with emphasis
                    console.group('%c⏱️ COMPLETED TIMING: Button returned to Send state', 
                                 'color: blue; font-weight: bold');
                    console.log('Element:', sendButton);
                    console.log(`%cTime elapsed: ${duration.toFixed(2)}ms`, 
                               'color: red; font-weight: bold; font-size: 14px');
                    console.log(`Average time (${totalExecutions} executions): ${(totalExecutionTime/totalExecutions).toFixed(2)}ms`);
                    console.groupEnd();
                    
                    // Reset timer state
                    timerStarted = false;
                    startTime = null;
                }
            }
        });
    });
    
    // Configure the observer to only watch for aria-label attribute changes
    // This improves performance by ignoring irrelevant changes
    observer.observe(sendButton, {
        attributes: true,
        attributeFilter: ['aria-label'], // Only watch this specific attribute
        attributeOldValue: true          // Track the previous value
    });
    
    // Monitor button clicks for additional debugging information
    sendButton.addEventListener('click', () => {
        const currentLabel = sendButton.getAttribute('aria-label');
        console.log(`%c👆 Button clicked! Current aria-label: "${currentLabel}"`, 'color: orange; font-weight: bold');
    });
    
    /**
     * Helper function to check the current state of the button and timer
     * Useful for manual debugging if timing doesn't seem to be working
     */
    function checkCurrentState() {
        const currentLabel = sendButton.getAttribute('aria-label');
        console.log(`%c🔍 Current button state: aria-label="${currentLabel}"`, 'color: purple; font-weight: bold');
        
        if (timerStarted) {
            const currentDuration = performance.now() - startTime;
            console.log(`%c⏱️ Timer is active, current duration: ${currentDuration.toFixed(2)}ms`, 
                      'color: green; font-weight: bold');
        } else {
            console.log(`%c⏱️ Timer is not active`, 'color: gray');
        }
        
        return {
            currentLabel,
            timerActive: timerStarted,
            currentDuration: timerStarted ? (performance.now() - startTime).toFixed(2) + 'ms' : 'N/A'
        };
    }
    
    // Return an object with helpful methods for interacting with the monitor
    return {
        element: sendButton,
        observer,
        // Method to stop monitoring
        stop: () => {
            observer.disconnect();
            console.log('Stopped monitoring VSCode Send/Cancel button transitions');
        },
        // Method to get timing statistics
        getStats: () => {
            return {
                totalExecutions,
                totalExecutionTime,
                averageTime: totalExecutions ? (totalExecutionTime/totalExecutions).toFixed(2) + 'ms' : 'N/A'
            };
        },
        // Method to check the current status of the timer and button
        getCurrentStatus: () => {
            if (timerStarted) {
                const currentDuration = performance.now() - startTime;
                return {
                    state: 'executing',
                    currentLabel: sendButton.getAttribute('aria-label'),
                    timeElapsed: currentDuration.toFixed(2) + 'ms',
                    startedAt: new Date(performance.now() - currentDuration).toLocaleTimeString()
                };
            } else {
                return {
                    state: 'idle',
                    currentLabel: sendButton.getAttribute('aria-label'),
                    totalExecutions,
                    lastExecutionTime: totalExecutions ? (totalExecutionTime/totalExecutions).toFixed(2) + 'ms' : 'N/A'
                };
            }
        },
        // Manual state checking method
        checkState: checkCurrentState,
        // Emergency method to force stop the timer if it gets stuck
        forceStop: () => {
            if (timerStarted) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                console.group('%c⏱️ FORCE STOPPED TIMER', 'color: red; font-weight: bold');
                console.log(`%cTime elapsed: ${duration.toFixed(2)}ms`, 
                          'color: red; font-weight: bold; font-size: 14px');
                console.groupEnd();
                
                timerStarted = false;
                startTime = null;
            }
        }
    };
}

/**
 * Tests the Send-to-Cancel button monitoring with artificial state changes
 * This is useful to verify the monitoring works correctly without having to make actual requests
 * @returns {Object|null} The monitor object or null if setup failed
 */
function testSendCancelMonitoring() {
    console.clear();
    console.log('%c🧪 Testing VSCode Send-Cancel button transition monitoring...', 'color: blue; font-weight: bold; font-size: 14px');
    
    // Initialize the monitoring
    const monitor = monitorVSCodeSendToCancelButton();
    
    if (!monitor) {
        console.error('❌ Failed to initialize button monitoring.');
        return null;
    }
    
    const element = monitor.element;
    const currentLabel = element.getAttribute('aria-label');
    
    // Step 1: Make sure the button is in the "Send" state to start with
    if (currentLabel !== "Send (Enter)") {
        console.log("Setting initial state to 'Send (Enter)'");
        element.setAttribute('aria-label', "Send (Enter)");
    }
    
    // Step 2: Simulate the state transition to "Cancel" after a delay
    setTimeout(() => {
        console.log("%c📊 Step 1: Changing to 'Cancel (Alt+Backspace)' to start timer...", "color: blue");
        element.setAttribute('aria-label', "Cancel (Alt+Backspace)");
        
        // Step 3: Then simulate changing back to "Send" after another delay
        setTimeout(() => {
            console.log("%c📊 Step 2: Changing back to 'Send (Enter)' to stop timer...", "color: blue");
            element.setAttribute('aria-label', "Send (Enter)");
            
            console.log("%c✅ Test complete!", "color: green; font-weight: bold");
            console.log("Check the timing information in the console above.");
        }, 1500); // Wait 1.5 seconds before changing back
    }, 500); // Wait 0.5 seconds before first change
    
    return monitor;
}

/**
 * Performs a diagnostic test by artificially triggering changes on the monitored element
 * @param {Object} monitor - The monitor object returned by monitorElements or monitorVSCodeChatExecuteButton
 * @returns {boolean} - True if test was successful, false otherwise
 */
function diagnosticTest(monitor) {
    if (!monitor || !monitor.elements || monitor.elements.length === 0) {
        console.error("❌ No valid monitor provided or no elements are being monitored");
        return false;
    }
    
    console.group("%c🔍 Running diagnostic test on monitored elements", "color: purple; font-weight: bold");
    console.log("Monitor status:", monitor);
    
    // Get the first monitored element
    const element = monitor.elements[0];
    console.log("Testing element:", element);
    
    // Track original classes to restore later
    const originalClass = element.className;
    const originalDisabled = element.hasAttribute('disabled');
    const originalAriaDisabled = element.getAttribute('aria-disabled');
    
    try {
        // Step 1: Make a change to trigger the monitor
        console.log("%c📊 Step 1: Triggering state change...", "color: blue");
        
        // Common attributes that might trigger state changes
        if (element.classList.contains('disabled')) {
            element.classList.remove('disabled');
        } else {
            element.classList.add('diagnostic-test-class');
        }
        
        if (originalDisabled) {
            element.removeAttribute('disabled');
        } else {
            element.setAttribute('disabled', 'false');
        }
        
        // Wait 1 second and then restore original state
        setTimeout(() => {
            console.log("%c📊 Step 2: Restoring original state...", "color: blue");
            
            // Restore original state
            element.className = originalClass;
            
            if (originalDisabled) {
                element.setAttribute('disabled', 'true');
            } else {
                element.removeAttribute('disabled');
            }
            
            if (originalAriaDisabled) {
                element.setAttribute('aria-disabled', originalAriaDisabled);
            }
            
            console.log("%c✅ Diagnostic complete - Check if timer events were logged above", "color: green; font-weight: bold");
            console.log("If you saw 'Timer started' and 'Element returned to original state' messages, monitoring is working correctly");
            console.groupEnd();
        }, 1000);
        
        return true;
    } catch (error) {
        console.error("❌ Error during diagnostic test:", error);
        console.groupEnd();
        return false;
    }
}

/**
 * Complete verification of the monitoring system
 * @returns {Object} - The monitor object and test results
 */
function verifyMonitoring() {
    console.clear();
    console.log("%c🧪 Running complete verification of VSCode element monitoring...", "color: blue; font-weight: bold; font-size: 14px");
    
    // 1. Start the monitoring
    const monitor = monitorVSCodeChatExecuteButton();
    
    if (!monitor) {
        console.error("❌ Failed to initialize monitoring. Element might not be found.");
        console.log("Try running this command after ensuring the VSCode chat panel is open and visible.");
        return { success: false, error: "Element not found" };
    }
    
    // 2. Run the diagnostic test
    setTimeout(() => {
        diagnosticTest(monitor);
    }, 500);
    
    return { 
        success: true, 
        monitor,
        commands: {
            stopMonitoring: "monitor.stop()",
            checkTimers: "monitor.getActiveTimers()",
            runDiagnosticAgain: "diagnosticTest(monitor)"
        }
    };
}

/**
 * Monitor the parent element of the send button that contains the full state information
 * Regularly logs the state to help understand how the button changes
 * @returns {Object|null} - Monitor object or null if element not found
 */
function monitorParentButtonElement() {
    console.clear();
    console.log('%c🔬 Setting up monitoring for the parent button element...', 'color: purple; font-weight: bold; font-size: 14px');
    
    // The exact selector for the parent element that contains the button
    const parentSelector = "#workbench\\.panel\\.chat > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.pane-body > div.interactive-session > div.interactive-input-part > div.interactive-input-and-side-toolbar > div > div.chat-input-toolbars > div.monaco-toolbar.chat-execute-toolbar > div > ul > li.action-item.monaco-dropdown-with-primary.disabled";
    
    const parentElement = document.querySelector(parentSelector);
    
    if (!parentElement) {
        console.error("❌ Parent element not found. Make sure the chat panel is open and visible.");
        console.log("The selector may have changed. Try inspecting the element again.");
        return null;
    }
    
    // Get the inner button for additional monitoring
    const sendButton = parentElement.querySelector('div.action-container > a');
    
    console.log('%c✅ Found parent element!', 'color: green; font-weight: bold');
    console.log('Parent element:', parentElement);
    console.log('Child button:', sendButton);
    
    // Variables for tracking the timing
    let timerStarted = false;
    let startTime = null;
    let totalExecutions = 0;
    let totalExecutionTime = 0;
    let periodicLoggingInterval = null;
    
    // Constants for button states
    const SEND_LABEL = "Send (Enter)";
    const CANCEL_LABEL = "Cancel (Alt+Backspace)";
    
    // Function to check if the element is in the final state (disabled send button)
    function isInFinalState() {
        // Check parent element has the disabled class
        const parentHasDisabledClass = parentElement.classList.contains('disabled');
        
        // Check action-container has disabled class and aria-disabled attribute
        const actionContainer = parentElement.querySelector('.action-container');
        const containerIsDisabled = actionContainer && 
                                   actionContainer.classList.contains('disabled') && 
                                   actionContainer.getAttribute('aria-disabled') === 'true';
        
        // Check the button has the disabled class and aria-label "Send (Enter)"
        const buttonElement = actionContainer ? actionContainer.querySelector('a.action-label') : null;
        const buttonIsFinal = buttonElement && 
                             buttonElement.classList.contains('disabled') && 
                             buttonElement.getAttribute('aria-label') === SEND_LABEL && 
                             buttonElement.getAttribute('aria-disabled') === 'true';
        
        const isInFinalState = parentHasDisabledClass && containerIsDisabled && buttonIsFinal;
        
        if (timerStarted && isInFinalState) {
            console.log('%c🔍 Final state detected!', 'color: green; font-weight: bold');
            console.log('Parent disabled:', parentHasDisabledClass);
            console.log('Container disabled:', containerIsDisabled);
            console.log('Button in final state:', buttonIsFinal);
        }
        
        return isInFinalState;
    }
    
    // Function to capture the full state of the elements we're monitoring
    function captureCurrentState() {
        const actionContainer = parentElement.querySelector('.action-container');
        const buttonElement = actionContainer ? actionContainer.querySelector('a.action-label') : null;
        
        const state = {
            parent: {
                className: parentElement.className,
                disabled: parentElement.classList.contains('disabled'),
                ariaDisabled: parentElement.getAttribute('aria-disabled'),
                dataset: { ...parentElement.dataset }
            },
            actionContainer: actionContainer ? {
                className: actionContainer.className,
                disabled: actionContainer.classList.contains('disabled'),
                ariaDisabled: actionContainer.getAttribute('aria-disabled')
            } : null
        };
        
        if (buttonElement) {
            state.button = {
                ariaLabel: buttonElement.getAttribute('aria-label'),
                className: buttonElement.className,
                disabled: buttonElement.classList.contains('disabled'),
                ariaDisabled: buttonElement.getAttribute('aria-disabled'),
                textContent: buttonElement.textContent.trim()
            };
        }
        
        return state;
    }
    
    // Check if we're already in a state where we should be timing
    const initialState = captureCurrentState();
    console.log('%c📊 Initial state:', 'color: blue; font-weight: bold', initialState);
    
    // If the button has the Cancel label, start timing
    if (initialState.button && initialState.button.ariaLabel === CANCEL_LABEL) {
        timerStarted = true;
        startTime = performance.now();
        console.log(`%c⏱️ Button is already in "${CANCEL_LABEL}" state. Timer started automatically.`, 'color: orange; font-weight: bold');
    }
    
    // Set up the periodic logging
    function startPeriodicLogging(intervalMs = 30000) {
        if (periodicLoggingInterval) {
            clearInterval(periodicLoggingInterval);
        }
        
        // First log immediately
        logCurrentState();
        
        // Then set up the interval
        periodicLoggingInterval = setInterval(logCurrentState, intervalMs);
        console.log(`%c🔄 Periodic logging started - will log every ${intervalMs/1000} seconds`, 'color: blue');
        
        return periodicLoggingInterval;
    }
    
    // Function to log the current state periodically
    function logCurrentState() {
        const currentState = captureCurrentState();
        const timestamp = new Date().toLocaleTimeString();
        
        console.group(`%c📊 Periodic State Log [${timestamp}]`, 'color: purple; font-weight: bold');
        console.log('Complete current state:', currentState);
        console.log('Is in final state:', isInFinalState());
        
        if (timerStarted) {
            const elapsedTime = performance.now() - startTime;
            console.log(`%c⏱️ Timer active for ${elapsedTime.toFixed(2)}ms`, 'color: green; font-weight: bold');
        } else {
            console.log('⏱️ No active timer');
        }
        
        console.groupEnd();
        return currentState;
    }
    
    // Set up mutation observer to track changes to the entire parent element
    const observer = new MutationObserver((mutations) => {
        let stateChanged = false;
        let buttonLabelChanged = false;
        let finalStateDetected = false;
        let newLabel = null;
        
        // First pass to detect button label changes
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'aria-label' && 
                mutation.target.tagName.toLowerCase() === 'a') {
                
                buttonLabelChanged = true;
                newLabel = mutation.target.getAttribute('aria-label');
                const oldLabel = mutation.oldValue;
                
                console.group(`%c🔄 Button aria-label changed`, 'color: blue; font-weight: bold');
                console.log(`Old: "${oldLabel}" → New: "${newLabel}"`);
                
                // CASE 1: Changed to "Cancel" - start timing
                if (newLabel === CANCEL_LABEL && !timerStarted) {
                    timerStarted = true;
                    startTime = performance.now();
                    console.log(`%c⏱️ STARTED TIMING at ${new Date().toLocaleTimeString()}`, 'color: green; font-weight: bold');
                    stateChanged = true;
                } 
                
                console.groupEnd();
                break;
            }
        }
        
        // Check if we've reached the final state
        finalStateDetected = isInFinalState();
        
        // If we have an active timer and reached the final state, stop timing
        if (timerStarted && finalStateDetected) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            totalExecutions++;
            totalExecutionTime += duration;
            
            console.group('%c⏱️ COMPLETED TIMING: Element returned to final state', 'color: blue; font-weight: bold');
            console.log(`%cTime elapsed: ${duration.toFixed(2)}ms`, 'color: red; font-weight: bold; font-size: 14px');
            console.log(`Average (${totalExecutions} executions): ${(totalExecutionTime/totalExecutions).toFixed(2)}ms`);
            
            // Log the exact HTML structure that triggered the completion
            console.log('Completion triggered by this HTML state:');
            console.log(parentElement.outerHTML);
            console.groupEnd();
            
            timerStarted = false;
            startTime = null;
            stateChanged = true;
        }
        
        // For any significant state change, capture and log the full state
        if (stateChanged || buttonLabelChanged || (mutations.length > 0 && timerStarted)) {
            const currentState = captureCurrentState();
            console.log('%c📊 Current state after changes:', 'color: purple', currentState);
        }
    });
    
    // Start observing with a configuration that catches everything
    observer.observe(parentElement, {
        attributes: true,
        attributeOldValue: true,
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: true
    });
    
    // Start the periodic logging
    startPeriodicLogging(30000);
    
    // Return control object
    return {
        parentElement,
        sendButton,
        observer,
        stop: () => {
            observer.disconnect();
            if (periodicLoggingInterval) {
                clearInterval(periodicLoggingInterval);
                periodicLoggingInterval = null;
            }
            console.log('Stopped monitoring parent button element');
        },
        getStats: () => {
            return {
                totalExecutions,
                totalExecutionTime,
                averageTime: totalExecutions ? (totalExecutionTime/totalExecutions).toFixed(2) + 'ms' : 'N/A'
            };
        },
        logNow: logCurrentState,
        setLoggingInterval: startPeriodicLogging,
        getCurrentStatus: () => {
            const currentState = captureCurrentState();
            if (timerStarted) {
                const currentDuration = performance.now() - startTime;
                return {
                    state: 'executing',
                    timeElapsed: currentDuration.toFixed(2) + 'ms',
                    startedAt: new Date(performance.now() - currentDuration).toLocaleTimeString(),
                    buttonLabel: currentState.button ? currentState.button.ariaLabel : 'unknown',
                    isInFinalState: isInFinalState(),
                    fullState: currentState
                };
            } else {
                return {
                    state: 'idle',
                    buttonLabel: currentState.button ? currentState.button.ariaLabel : 'unknown',
                    isInFinalState: isInFinalState(),
                    totalExecutions,
                    averageTime: totalExecutions ? (totalExecutionTime/totalExecutions).toFixed(2) + 'ms' : 'N/A',
                    fullState: currentState
                };
            }
        },
        forceCheck: isInFinalState
    };
}

// Usage examples:
// 
// 1. Monitor all changes to a specific element:
//    const monitor = monitorElements('#elementId');
// 
// 2. Monitor only attribute changes:
//    const monitor = monitorElements('.someClass', { attributes: true, childList: false, characterData: false });
// 
// 3. Stop monitoring:
//    monitor.stop();
//
// 4. Check currently active timers:
//    monitor.getActiveTimers();
//
// 5. Monitor the VSCode chat execute button:
//    const chatMonitor = monitorVSCodeChatExecuteButton();
//
// 6. Run the complete test:
//    const test = testVSCodeMonitoring();
//
// 7. Run a diagnostic test on an existing monitor:
//    diagnosticTest(chatMonitor);
//
// 8. Complete verification with artificial state changes:
//    const verification = verifyMonitoring();
//
// 9. Monitor specifically for Send/Cancel button state changes:
//    const sendCancelMonitor = monitorVSCodeSendToCancelButton();
//
// 10. Check current status and statistics:
//    sendCancelMonitor.getCurrentStatus();
//    sendCancelMonitor.getStats();
//
// 11. Test the Send/Cancel monitoring:
//    const sendCancelTest = testSendCancelMonitoring();
//
// 12. If timing seems stuck, manually check state:
//    sendCancelMonitor.checkState();
//
// 13. Force stop a timer if it gets stuck:
//    sendCancelMonitor.forceStop();
//
// 14. Monitor the parent element with periodic state logging:
//    const parentMonitor = monitorParentButtonElement();
//
// 15. Get current state immediately:
//    parentMonitor.logNow();
//
// 16. Change the logging interval (in milliseconds):
//    parentMonitor.setLoggingInterval(10000); // Log every 10 seconds
//
// 17. Stop monitoring:
//    parentMonitor.stop();
