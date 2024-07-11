/* Este programa de Node.js abre el navegador y hace una captura de pantalla
despues dibuja sobre esa captura de pantalla una cuadricula de 10x10. Y guarda esa imagen*/
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com/intl/es/gmail/about/'); // Replace with the URL you want to capture
    
    await page.keyboard.press('f');
    await page.waitForTimeout(5000);
    await page.waitForSelector('body');
    await page.keyboard.press('Enter');

    // Capture screenshot
    const screenshotPath = path.join(__dirname, 'screenshot.png');
    await page.screenshot({ path: screenshotPath });

    // Draw grid on the screenshot
    const screenshotBuffer = await fs.promises.readFile(screenshotPath);
    // Draw grid logic goes here

    const image = await Jimp.read(screenshotBuffer);
    const width = image.getWidth();
    const height = image.getHeight();
    const gridWidth = Math.floor(width / 10);
    const gridHeight = Math.floor(height / 10);

    for (let x = 0; x < width; x += gridWidth) {
        for (let y = 0; y < height; y++) {
            image.setPixelColor(0x00FF00, x, y);
        }
    }

    for (let y = 0; y < height; y += gridHeight) {
        for (let x = 0; x < width; x++) {
            image.setPixelColor(0x00FF00, x, y);
        }
    }

    const modifiedScreenshotBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

    // Save the modified screenshot
    const modifiedScreenshotPath = path.join(__dirname, 'modified-screenshot.png');
    await fs.promises.writeFile(modifiedScreenshotPath, screenshotBuffer);

    await browser.close();
})();