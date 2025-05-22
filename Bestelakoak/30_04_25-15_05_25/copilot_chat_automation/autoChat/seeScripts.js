// Require the ScrollableElement class
const { ScrollableElement } = require('./scrollableElement');

// Function to observe changes in the DOM
function observeWorkspaceChanges() {
    const targetNode = document.body; // Change this to the specific workspace element if needed
    const config = { attributes: true, childList: true, subtree: true };

    const callback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                console.log('A child node has been added or removed:', mutation);
            } else if (mutation.type === 'attributes') {
                console.log(`The ${mutation.attributeName} attribute was modified:`, mutation);
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    console.log('Observation started. Monitoring changes in the workspace...');
}

// Execute the function
observeWorkspaceChanges();

// Function to log changes during scrolling
function logScrollChanges() {
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        console.log(`Scroll position changed: ${scrollTop > lastScrollTop ? 'down' : 'up'}`);
        lastScrollTop = scrollTop;
    });

    console.log('Scroll observation started. Monitoring scroll changes...');
}

// Execute the function
logScrollChanges();

// Function to force scroll in an Ionic application
function forceScroll(content) {
    if (!content || typeof content.scrollTo !== 'function') {
        console.error('Ionic Content instance is required to force scroll.');
        return;
    }

    // Example: Scroll to a specific position (x: 0, y: 500) over 500ms
    content.scrollTo(0, 500, 500).then(() => {
        console.log('Forced scroll completed.');
    }).catch((err) => {
        console.error('Error during forced scroll:', err);
    });
}

// Example usage (replace 'content' with your actual Ionic Content instance)
// forceScroll(content);

// Function to force scroll in an Ionic application from the console
function forceScrollFromConsole() {
    const content = document.querySelector('ion-content'); // Adjust selector if needed
    if (!content || typeof content.scrollTo !== 'function') {
        console.error('Ionic Content element not found or does not support scrollTo.');
        return;
    }

    // Example: Scroll to a specific position (x: 0, y: 500) over 500ms
    content.scrollTo(0, 500, 500).then(() => {
        console.log('Forced scroll completed.');
    }).catch((err) => {
        console.error('Error during forced scroll:', err);
    });
}

// Example usage from the console
forceScrollFromConsole();

// Function to observe DOM changes during scrolling
function observeScrollAndDOMChanges() {
    const targetNode = document.body; // Adjust to the specific container if needed
    const config = { childList: true, subtree: true };

    const callback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                console.log('DOM updated during scroll:', mutation);
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    window.addEventListener('scroll', () => {
        console.log('Scroll event detected. Monitoring DOM changes...');
    });

    console.log('Observation of scroll and DOM changes started.');
}

// Execute the function
observeScrollAndDOMChanges();

// Function to observe dynamic element generation during scrolling
function observeDynamicElements() {
    const targetNode = document.body; // Adjust to the specific container if needed
    const config = { childList: true, subtree: true };

    const callback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    console.log('Element added:', node);
                });
                mutation.removedNodes.forEach((node) => {
                    console.log('Element removed:', node);
                });
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    window.addEventListener('scroll', () => {
        console.log('Scroll event detected. Monitoring dynamic elements...');
    });

    console.log('Observation of dynamic elements during scroll started.');
}

// Execute the function
observeDynamicElements();

// Function to force the generation of elements by scrolling, focusing, and simulating user interactions
function forceElementGeneration(scrollContainerSelector, positions) {
    const container = document.querySelector(scrollContainerSelector);
    if (!container) {
        console.error('Scroll container not found:', scrollContainerSelector);
        return;
    }

    if (!container.scrollTo) {
        console.error('The container does not support the scrollTo method.');
        return;
    }

    const listRows = container.querySelector('.monaco-list-rows');
    if (!listRows) {
        console.error('The .monaco-list-rows element was not found inside the container.');
        return;
    }

    // Ensure the container is visible
    if (getComputedStyle(container).display === 'none' || getComputedStyle(container).visibility === 'hidden') {
        console.error('The scroll container is not visible. Ensure it is not hidden.');
        return;
    }

    let index = 0;

    const scrollToNextPosition = () => {
        if (index >= positions.length) {
            console.log('Finished forcing element generation.');
            return;
        }

        const position = positions[index];
        container.scrollTo({ top: position, behavior: 'smooth' });
        console.log(`Scrolled to position: ${position}`);

        // Update the transform property of .monaco-list-rows
        listRows.style.transform = `translate3d(0px, ${-position}px, 0px)`;
        console.log(`Updated transform to: translate3d(0px, ${-position}px, 0px)`);

        // Dispatch a scroll event to simulate user interaction
        const scrollEvent = new Event('scroll', { bubbles: true, cancelable: true });
        container.dispatchEvent(scrollEvent);
        console.log('Dispatched scroll event.');

        // Dispatch a focus event to simulate user interaction
        const focusEvent = new Event('focus', { bubbles: true, cancelable: true });
        container.dispatchEvent(focusEvent);
        console.log('Dispatched focus event.');

        // Simulate a mouse move event
        const mouseMoveEvent = new MouseEvent('mousemove', { bubbles: true, cancelable: true });
        container.dispatchEvent(mouseMoveEvent);
        console.log('Dispatched mouse move event.');

        index++;

        // Wait for elements to render before scrolling to the next position
        setTimeout(scrollToNextPosition, 500); // Adjust delay as needed
    };

    scrollToNextPosition();
}

// Example usage:

// Example usage with the updated selector and event simulation
forceElementGeneration(
    "#workbench\\.view\\.explorer",
    [0, 200, 400, 600, 800] // Adjust positions as needed
);

// Function to log all events triggered on a target element
function logAllEvents(target) {
    const eventTypes = [
        'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick',
        'wheel', 'scroll', 'focus', 'blur', 'resize', 'input', 'change', 'drag', 'drop', 'contextmenu'
    ];

    eventTypes.forEach((eventType) => {
        target.addEventListener(eventType, (event) => {
            console.log(`Event triggered: ${event.type}`, event);
        });
    });

    console.log('Event logging started for:', target);
}

// Example usage: Log events on the scroll container
const scrollContainer = document.querySelector("#workbench\\.view\\.explorer");
if (scrollContainer) {
    logAllEvents(scrollContainer);
} else {
    console.error('Scroll container not found.');
}

// Example usage: Log events on the entire document
logAllEvents(document);

// Function to log all events triggered on a specific element
function logEventsOnElement(selector) {
    const targetElement = document.querySelector(selector);
    if (!targetElement) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    const eventTypes = [
        'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick',
        'wheel', 'scroll', 'focus', 'blur', 'resize', 'input', 'change', 'drag', 'drop', 'contextmenu'
    ];

    eventTypes.forEach((eventType) => {
        targetElement.addEventListener(eventType, (event) => {
            console.log(`Event triggered: ${event.type}`, event);
        });
    });

    console.log(`Event logging started for element: ${selector}`);
}

// Example usage: Replace with the selector of the element you suspect
logEventsOnElement(".monaco-scrollable-element");

// Function to observe changes in monaco-scrollable-element and its children
function observeScrollableElement() {
    const scrollableElement = document.querySelector('.monaco-scrollable-element');
    if (!scrollableElement) {
        console.error('Scrollable element not found.');
        return;
    }

    const config = { attributes: true, childList: true, subtree: true };

    const callback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                console.log('Child nodes changed:', mutation);
            } else if (mutation.type === 'attributes') {
                console.log(`Attribute ${mutation.attributeName} changed:`, mutation);
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(scrollableElement, config);

    console.log('Observation started for .monaco-scrollable-element');
}

// Function to log events on monaco-scrollable-element and its children
function logScrollableElementEvents() {
    const scrollableElement = document.querySelector('.monaco-scrollable-element');
    if (!scrollableElement) {
        console.error('Scrollable element not found.');
        return;
    }

    const eventTypes = ['scroll', 'mousedown', 'mouseup', 'mousemove', 'wheel', 'keydown', 'keyup'];
    eventTypes.forEach((eventType) => {
        scrollableElement.addEventListener(eventType, (event) => {
            console.log(`Event triggered: ${event.type}`, event);
        });
    });

    console.log('Event logging started for .monaco-scrollable-element');
}

// Execute the functions
observeScrollableElement();
logScrollableElementEvents();

/**
 * Simulate mouse movement or scrolling on a scrollable element using ScrollableElement.
 * @param selector The CSS selector for the target scrollable element.
 * @param deltaX Horizontal scroll delta.
 * @param deltaY Vertical scroll delta.
 */
function simulateMouseScroll(selector, deltaX, deltaY) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    // Use ScrollableElement to programmatically update the scroll position
    const scrollableInstance = new ScrollableElement(element, {
        handleMouseWheel: true,
        mouseWheelScrollSensitivity: 1,
        fastScrollSensitivity: 5,
    });

    scrollableInstance.setScrollPosition({
        scrollLeft: element.scrollLeft + deltaX,
        scrollTop: element.scrollTop + deltaY,
    });

    console.log(`Programmatically updated scroll position using ScrollableElement to scrollLeft: ${element.scrollLeft + deltaX}, scrollTop: ${element.scrollTop + deltaY}`);
}

// Example usage
simulateMouseScroll('.monaco-scrollable-element', 0, 100); // Scroll down by 100 pixels

/**
 * Simulate zooming in and out on a scrollable element.
 * @param selector The CSS selector for the target element.
 * @param zoomLevels Array of zoom levels to apply (e.g., [1, 1.2, 1.5, 1]).
 * @param delay Delay in milliseconds between zoom levels.
 */
function simulateZoom(selector, zoomLevels, delay) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    let index = 0;

    const applyZoom = () => {
        if (index >= zoomLevels.length) {
            console.log('Finished simulating zoom.');
            return;
        }

        const zoomLevel = zoomLevels[index];
        element.style.transform = `scale(${zoomLevel})`;
        element.style.transformOrigin = '0 0'; // Ensure scaling happens from the top-left corner
        console.log(`Applied zoom level: ${zoomLevel}`);

        // Dispatch a resize event to simulate UI updates
        const resizeEvent = new Event('resize', { bubbles: true, cancelable: true });
        window.dispatchEvent(resizeEvent);
        console.log('Dispatched resize event.');

        index++;
        setTimeout(applyZoom, delay);
    };

    applyZoom();
}

// Example usage
simulateZoom('.monaco-scrollable-element', [1, 1.2, 1.5, 1], 500); // Zoom in and out with a delay of 500ms

/**
 * Simulate a wheel event on a target element.
 * @param selector The CSS selector for the target element.
 * @param deltaX Horizontal scroll delta.
 * @param deltaY Vertical scroll delta.
 */
function simulateWheelEvent(selector, deltaX, deltaY) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX,
        deltaY,
    });
    element.dispatchEvent(wheelEvent);
    console.log(`Simulated wheel event on ${selector} with deltaX: ${deltaX}, deltaY: ${deltaY}`);
}

/**
 * Simulate a mouseover event on a target element.
 * @param selector The CSS selector for the target element.
 */
function simulateMouseOverEvent(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    const mouseOverEvent = new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(mouseOverEvent);
    console.log(`Simulated mouseover event on ${selector}`);
}

/**
 * Simulate a mouseleave event on a target element.
 * @param selector The CSS selector for the target element.
 */
function simulateMouseLeaveEvent(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(mouseLeaveEvent);
    console.log(`Simulated mouseleave event on ${selector}`);
}

// Example usage
simulateWheelEvent('.monaco-scrollable-element', 0, 100); // Simulate scrolling down
simulateMouseOverEvent('.monaco-scrollable-element'); // Simulate mouseover
simulateMouseLeaveEvent('.monaco-scrollable-element'); // Simulate mouseleave

/**
 * Test the wheel event by directly simulating it.
 */
function testSimulateWheelEvent() {
    const selector = '.monaco-scrollable-element';
    const element = document.querySelector(selector);

    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    element.addEventListener('wheel', (event) => {
        console.log('Wheel event triggered:', event);
        console.assert(event.deltaX === 0, 'Expected deltaX to be 0');
        console.assert(event.deltaY === 100, 'Expected deltaY to be 100');
    });

    const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: 0,
        deltaY: 100,
    });
    element.dispatchEvent(wheelEvent);
    console.log(`Simulated wheel event on ${selector} with deltaX: 0, deltaY: 100`);
}

/**
 * Test the mouseover event by directly simulating it.
 */
function testSimulateMouseOverEvent() {
    const selector = '.monaco-scrollable-element';
    const element = document.querySelector(selector);

    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    element.addEventListener('mouseover', (event) => {
        console.log('Mouseover event triggered:', event);
    });

    const mouseOverEvent = new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(mouseOverEvent);
    console.log(`Simulated mouseover event on ${selector}`);
}

/**
 * Test the mouseleave event by directly simulating it.
 */
function testSimulateMouseLeaveEvent() {
    const selector = '.monaco-scrollable-element';
    const element = document.querySelector(selector);

    if (!element) {
        console.error(`Element not found for selector: ${selector}`);
        return;
    }

    element.addEventListener('mouseleave', (event) => {
        console.log('Mouseleave event triggered:', event);
    });

    const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(mouseLeaveEvent);
    console.log(`Simulated mouseleave event on ${selector}`);
}

// Execute tests
testSimulateWheelEvent();
testSimulateMouseOverEvent();
testSimulateMouseLeaveEvent();
