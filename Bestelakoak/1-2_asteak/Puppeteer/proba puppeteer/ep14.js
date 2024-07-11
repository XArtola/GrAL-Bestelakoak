const puppeteer = require("puppeteer");
const device = puppeteer.KnownDevices["iPhone 12"];


(async () => {

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.emulate(device);
    await page.goto("https://yahoo.com");

    await page.screenshot({path: "iphone12View.png"});
    await browser.close();

})();