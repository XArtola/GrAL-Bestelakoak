const puppeteer =  require("puppeteer");

async function simulateMobileDevice(){

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.setUserAgent("Mozzila/5.0 (iPhone, CPU iPhone 05 11_0 like Mac OS X 10 )");
    await page.setViewport({width: 375, height: 812});

    await page.goto("https://yahoo.com");

    await browser.close();

}

simulateMobileDevice()