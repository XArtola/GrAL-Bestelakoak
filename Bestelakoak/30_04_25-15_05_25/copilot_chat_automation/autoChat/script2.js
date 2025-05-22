/**
 * VS Code Explorer Scraper Script - Modified with VS Code API
 * 
 * This script now attempts to use VS Code's API for scrolling when possible
 * and falls back to DOM methods when needed.
 */

(async function() {
    console.log("Attempting to scan visible elements in Explorer and find 'prompts'...");

    // Try to get VS Code API - only works in webviews
    let vscode = null;
    try {
        vscode = acquireVsCodeApi();
        console.log("Successfully connected to VS Code API");
    } catch (e) {
        console.log("Running outside of webview context - will use fallback methods");
    }

    const explorerRowsContainerSelector = "#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div > div.monaco-list-rows";
    const scrollerSelector = "#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div > div.invisible.scrollbar.vertical.fade > div";

    const rowsContainer = document.querySelector(explorerRowsContainerSelector);
    const scroller = document.querySelector(scrollerSelector);

    if (!rowsContainer || !scroller) {
        console.error("Could not find the Explorer row container or vertical scroller. The selector might be outdated.");
        console.log("Please ensure the Explorer view is visible and has content.");
        return;
    }

    // Make the scrollbar visible by simulating a hover event
    const sliderParent = scroller.parentElement;
    if (sliderParent) {
        sliderParent.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    }

    const items = () => Array.from(rowsContainer.querySelectorAll('div[role="treeitem"]'));

    if (items().length === 0) {
        console.log("No elements found in the Explorer row container.");
        return;
    }

    let promptsFolderItem = null;
    let promptsFolderLevel = -1;
    let promptsFolderExpanded = false;
    let promptsFolderIndex = -1;

    // Phase 1: Find the "prompts" folder and check if it's expanded
    for (let i = 0; i < items().length; i++) {
        const item = items()[i];
        const name = item.getAttribute('aria-label');
        const isFolder = item.getAttribute('aria-expanded') !== null;

        if (isFolder && name && name.toLowerCase() === 'prompts') {
            promptsFolderItem = item;
            promptsFolderLevel = parseInt(item.getAttribute('aria-level')) || 1;
            promptsFolderExpanded = item.getAttribute('aria-expanded') === 'true';
            promptsFolderIndex = i;
            console.log(`Found 'prompts' folder. Level: ${promptsFolderLevel}, Expanded: ${promptsFolderExpanded}`);
            break;
        }
    }

    if (!promptsFolderItem) {
        console.log("The 'prompts' folder was not found among visible elements.");
        return;
    }

    if (!promptsFolderExpanded) {
        console.log("The 'prompts' folder is collapsed. Attempting to click to expand it...");
        promptsFolderItem.click();
        console.log("Clicked on 'prompts'. Please wait for it to expand and RUN THE SCRIPT AGAIN to process its content.");
        return;
    }

    // Function to scroll using VS Code API if available, otherwise fall back to DOM methods
    async function scrollContainer(container, step = 100, delay = 500) {
        if (vscode) {
            // Use VS Code API for scrolling
            console.log("Using VS Code API for scrolling");
            for (let i = 0; i < 20; i++) { // Adjust number of scrolls as needed
                vscode.postMessage({
                    command: 'scroll',
                    direction: 'down',
                    amount: step
                });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            return;
        } else {
            // Fallback to DOM scrolling with scrollIntoView and requestAnimationFrame
            console.log("Using DOM methods for scrolling");
            let currentScrollTop = container.scrollTop;
            let maxScrollTop = container.scrollHeight - container.clientHeight;

            while (currentScrollTop < maxScrollTop) {
                currentScrollTop = Math.min(currentScrollTop + step, maxScrollTop);
                container.scrollTop = currentScrollTop;

                // Smooth scrolling using requestAnimationFrame
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        container.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(resolve, delay);
                    });
                });
            }
        }
    }

    // Function to move the slider element directly
    async function moveSlider(slider, step = 10, delay = 100, iterations = 20) {
        console.log("Moving the slider directly...");
        for (let i = 0; i < iterations; i++) {
            const currentTransform = slider.style.transform.match(/translate3d\(0px, (-?\d+)px, 0px\)/);
            const currentY = currentTransform ? parseInt(currentTransform[1], 10) : 0;
            const newY = currentY + step;

            slider.style.transform = `translate3d(0px, ${newY}px, 0px)`;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // Locate the slider element
    const slider = document.querySelector("#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div > div.invisible.scrollbar.vertical.fade > div");

    if (slider) {
        // Move the slider directly
        await moveSlider(slider, 10, 100, 20);
    } else {
        console.error("Slider element not found. Please ensure the selector is correct.");
    }

    // Function to move the horizontal slider directly
    async function moveHorizontalSlider(slider, step = 10, delay = 100, iterations = 20) {
        console.log("Moving the horizontal slider directly...");
        for (let i = 0; i < iterations; i++) {
            const currentTransform = slider.style.transform.match(/translate3d\((-?\d+)px, 0px, 0px\)/);
            const currentX = currentTransform ? parseInt(currentTransform[1], 10) : 0;
            const newX = currentX + step;

            slider.style.transform = `translate3d(${newX}px, 0px, 0px)`;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // Locate the horizontal slider element
    const horizontalSlider = document.querySelector(
        "#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div > div.invisible.scrollbar.horizontal.fade > div.slider"
    );

    if (horizontalSlider) {
        // Move the horizontal slider directly
        await moveHorizontalSlider(horizontalSlider, 10, 100, 20);
    } else {
        console.error("Horizontal slider element not found. Please ensure the selector is correct.");
    }

    // Function to move the horizontal scrollbar by adjusting scrollLeft
    async function moveHorizontalScroll(container, step = 10, delay = 100, iterations = 20) {
        console.log("Moving the horizontal scrollbar...");
        for (let i = 0; i < iterations; i++) {
            container.scrollLeft += step;
            console.log(`ScrollLeft is now: ${container.scrollLeft}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // Locate the parent container of the horizontal scrollbar
    const horizontalScrollContainer = document.querySelector(
        "#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div"
    );

    if (horizontalScrollContainer) {
        // Move the horizontal scrollbar
        await moveHorizontalScroll(horizontalScrollContainer, 10, 100, 20);
    } else {
        console.error("Horizontal scroll container not found. Please ensure the selector is correct.");
    }

    // Function to move the parent container of the vertical slider
    async function moveVerticalScroll(container, step = 10, delay = 100, iterations = 20) {
        console.log("Moving the vertical scrollbar...");
        for (let i = 0; i < iterations; i++) {
            container.scrollTop += step;
            console.log(`ScrollTop is now: ${container.scrollTop}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // Locate the parent container of the vertical scrollbar
    const verticalScrollContainer = document.querySelector(
        "#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div"
    );

    if (verticalScrollContainer) {
        // Move the vertical scrollbar
        await moveVerticalScroll(verticalScrollContainer, 10, 100, 20);
    } else {
        console.error("Vertical scroll container not found. Please ensure the selector is correct.");
    }

    // Use VS Code API to invoke built-in commands if available
    function executeCommand(command, args) {
        if (vscode) {
            vscode.postMessage({
                command: 'executeCommand',
                commandId: command,
                args: args
            });
            return true;
        }
        return false;
    }

    // Function to simulate pressing the "ArrowDown" key
    async function pressDownKey(times = 1, delay = 200) {
        for (let i = 0; i < times; i++) {
            const keyDownEvent = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
            const keyUpEvent = new KeyboardEvent("keyup", { key: "ArrowDown", bubbles: true });
            document.dispatchEvent(keyDownEvent);
            document.dispatchEvent(keyUpEvent);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // Always start from the first file and navigate using "ArrowDown"
    async function navigateFilesWithArrowDown(startIndex = 0, delay = 200) {
        console.log("Navigating files using 'ArrowDown' key...");
        await pressDownKey(startIndex, delay); // Start from the first file
    }

    // Scroll to ensure elements are visible
    console.log("Ensuring all elements are visible...");

    // Replace scrolling logic with ArrowDown navigation
    await navigateFilesWithArrowDown(20, 300); // Adjust the number of key presses and delay as needed

    // Function to expand all folders in the workspace
    async function expandAllFolders(container, delay = 200) {
        console.log("Expanding all folders in the workspace...");
        const folders = container.querySelectorAll('div[role="treeitem"][aria-expanded="false"]');
        for (const folder of folders) {
            folder.click(); // Trigger a click to expand the folder
            await new Promise(resolve => setTimeout(resolve, delay)); // Wait for the folder to expand
        }
    }

    // Reuse the previously declared rows container
    if (rowsContainer) {
        // Expand all folders to make all files visible
        await expandAllFolders(rowsContainer, 200);
    } else {
        console.error("Rows container not found. Please ensure the selector is correct.");
    }

    // Find and process .txt files
    console.log("Looking for .txt files in the 'prompts' folder...");
    let foundTxtFiles = false;

    for (let i = promptsFolderIndex + 1; i < items().length; i++) {
        const currentItem = items()[i];
        const currentName = currentItem.getAttribute('aria-label');
        const currentLevel = parseInt(currentItem.getAttribute('aria-level')) || 1;

        if (currentLevel <= promptsFolderLevel) {
            console.log("Exited the scope of the 'prompts' folder.");
            break;
        }

        if (currentLevel === promptsFolderLevel + 1 && currentName && currentName.endsWith('.txt')) {
            console.log(`Found .txt file: ${currentName}. Clicking...`);
            
            // Try to use VS Code API to open the file if available
            const openedWithCommand = executeCommand('explorer.openAndPassFocus', [currentName]);
            
            if (!openedWithCommand) {
                // Fall back to DOM methods
                currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                currentItem.click();
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            foundTxtFiles = true;
        }
    }

    if (!foundTxtFiles) {
        console.log("No visible .txt files found inside the 'prompts' folder.");
    }

    console.log("--------------------------------------------------");
    console.log("Scan and actions in 'prompts' completed.");

})();