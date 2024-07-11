// Nodejs project that uses Selenium to find the interactuable elements of a web page
// and save theme in a JSON file

// Required modules
const { Builder, By, Key, until } = require('selenium-webdriver');
const fs = require('fs');

// Function to save the elements in a JSON file
function saveElements(elements) {
    // Convert the elements to a JSON string
    const elementsString = JSON.stringify(elements, null, 2);
    // Save the elements in a JSON file
    fs.writeFileSync('elements.json', elementsString);
    console.log('Elements saved in elements.json');
}

// Function to get the interactuable elements of a web page
async function getElements() {
    // Create a new instance of the Chrome driver
    let driver = await new Builder().forBrowser('chrome').build();
    try {
        // Open the web page
        await driver.get('https://www.google.com/intl/es/gmail/about/');
        // Wait until the page is loaded
        await driver.sleep(2000);
        // Get a screenshot of the page
        await driver.takeScreenshot().then(function (data) {
            fs.writeFileSync('screenshot.png', data, 'base64');
        });
        // Find the interactuable elements
        //let elements = await driver.findElements(By.css('a, button, input, select'));

        // Find all elements on the page
        const allElements = await driver.findElements(By.css('a, button'));

        // Define an empty array to store interactive elements
        const interactiveElements = [];

        // Loop through all elements
        for (const element of allElements) {
            // Check if the element is interactive (can be clicked, typed in, etc.)
            const isInteractive = await element.isEnabled();

            if (isInteractive) {
                // Get element details like tag name, text content, and attributes
                const tagName = await element.getTagName();
                const textContent = await element.getText();
                //const attributes = await element.getAttributeNames();
                
                const href = await element.getAttribute('href');

                // Get the position of the element
                const position = await element.getLocation();
                const { x, y } = position;

                /*
                const position = await element.getLocation();
                const { x, y } = position;
                */
                // Create an object to store element information
                const elementInfo = {
                    tagName,
                    textContent,
                    href,
                    x,
                    y,
                };

                // Add the element information to the interactiveElements array
                interactiveElements.push(elementInfo);
            }

            console.log('Found elements:', interactiveElements);
            // Save the elements in a JSON file
            saveElements(interactiveElements);
        }
    } finally {
        // Close the driver
        await driver.quit();
    }

}
// Call the function to get the interactuable elements
getElements();