const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

const baseUrl = 'http://localhost:3000'; // Replace with your starting URL
const crawlDepth = 5; // Number of levels deep to crawl (adjust as needed)
const userInteractions = {}; // Stores user interaction data across pages
const visitedUrls = []; // Keeps track of visited URLs

const username = 'user@nextmail.com'; // Replace with your username
const password = '123456'; // Replace with your password

let browser; // Launch headless Chrome
let page;


async function crawlPage(url, depth = 1) {
    if (depth > crawlDepth || visitedUrls.includes(url)) {
        return; // Reached maximum crawl depth or already visited URL
    }

    visitedUrls.push(url); // Add the URL to the visited list

    try {
        //const browser = await puppeteer.launch({ headless: true }); // Launch headless Chrome
        //const page = await browser.newPage();

        browser = await puppeteer.launch({ headless: true }); // Launch headless Chrome
        page = await browser.newPage();


        // Fetch the page content using Puppeteer (recommended for interactive elements)
        await page.goto(url);

        // Check if there is a login form on the page
        const loginButton = url.includes("login") //? await page.$('button[aria-disabled="false"]:contains("Log in")') : null;
        //const loginForm = await page.$('form[action="/login"]');
        if (loginButton) {
            // Fill in the login form
            await page.type('input[name="email"]', username);
            await page.type('input[name="password"]', password);
            const loginButtonText = await page.$eval('button[aria-disabled="false"]', button => button.textContent.trim());
            if (loginButtonText === "Log in") {
                await page.click('button[aria-disabled="false"]');
            }
            await page.waitForNavigation();
        }

        //if ()

        // Analyze all page content to identify user interaction elements
        const interactionElements = await page.$$eval('button, a', elements => {
            return elements.map(element => ({
                type: element.tagName.toLowerCase(),
                text: element.textContent.trim(),
                href: element.href || '', // Handle links and buttons
            }));
        });

        userInteractions[url] = interactionElements;

        // Follow links to crawl deeper (adjust selector as needed)
        const links = await page.$$eval('a[href]', anchors => anchors.map(a => a.href));
        for (const link of links) {
            if (link.startsWith(baseUrl) && !visitedUrls.includes(link)) { // Avoid duplicates
                await crawlPage(link, depth + 1); // Recursive call to crawl the linked page
            }
        }

        await browser.close();
    } catch (error) {
        console.error(`Error crawling ${url}:`, error);
    }
}

(async () => {
    await crawlPage(baseUrl);

    // Save user interactions data to JSON file
    fs.writeFile('user-interactions.json', JSON.stringify(userInteractions, null, 2), (err) => {
        if (err) {
            console.error('Error saving JSON data:', err);
        } else {
            console.log('User interactions saved to user-interactions.json');
        }
    });
})();
