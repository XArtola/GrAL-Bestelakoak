// main.js

const puppeteer = require('puppeteer');
const vision = require('./vision.js');

async function main(voiceMode) {
    console.log("Initializing the Vimbot driver...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    console.log("Navigating to Google...");
    await page.goto('https://www.google.com');

    let objective;
    if (voiceMode) {
        console.log("Voice mode enabled. Listening for your command...");
        // Aquí necesitarías implementar la funcionalidad de captura de voz.
        // Como JavaScript se ejecuta en el lado del cliente, podrías usar la API de reconocimiento de voz del navegador.
    } else {
        objective = await new Promise(resolve => {
            process.stdin.once('data', data => {
                resolve(data.toString().trim());
            });
            console.log("Please enter your objective: ");
        });
    }

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Capturing the screen...");
        const screenshot = await page.screenshot();

        console.log("Getting actions for the given objective...");
        const action = await vision.getActions(screenshot, objective);
        console.log(`JSON Response: ${action}`);
        if (await performAction(page, action)) {  // returns True if done
            break;
        }
    }

    await browser.close();
}

async function performAction(page, action) {
    if (action) {
        if ("done" in action) {
            return true;
        }
        if ("click" in action && "type" in action) {
            await click(page, action["click"]);
            await type(page, action["type"]);
        }
        if ("navigate" in action) {
            await navigate(page, action["navigate"]);
        } else if ("type" in action) {
            await type(page, action["type"]);
        } else if ("click" in action) {
            await click(page, action["click"]);
        }
    } else {
        console.log("Action is undefined.");
    }
}

async function navigate(page, url) {
    await page.goto(url.includes("://") ? url : `https://${url}`);
}

async function type(page, text) {
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
}

async function click(page, text) {
    await page.keyboard.type(text);
}

main(process.argv.includes('--voice'));
