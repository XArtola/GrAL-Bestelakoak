const puppeteer = require("puppeteer");

(async () => {

    const browser = await puppeteer.launch({headless: false});

    const page = await browser.newPage();
    await page.goto("https://pirateking.es");

    await page.goto("https://www.pirate-king.es/foro/");

    await page.goBack();

    // Operation here

    const title = await page.title();

    console.log(title);

    await page.goForward();

    
    await browser.close();

})();