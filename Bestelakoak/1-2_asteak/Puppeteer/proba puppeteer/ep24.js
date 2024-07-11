const puppeteer = require("puppeteer");

(async () => {

    const browser =await puppeteer.launch({headless: false});

    const page = await browser.newPage();

    const latitude = 37.7749;
    const longitude = 122.4194;

    await page.browserContext().overridePermissions("https://example.com", ["geolocation"]);

    await page.setGeolocation({latitude, longitude});

    await page.goto("https://example.com");

    await page.screenshot({path: "geolocation_example.png"});

    await browser.close();
})();