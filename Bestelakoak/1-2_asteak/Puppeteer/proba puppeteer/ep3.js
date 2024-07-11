const puppeteer = require("puppeteer");

async function run(){

    //Launch new browser instance

    const browser = await puppeteer.launch({headless:false})

    const page = await browser.newPage();

    await page.goto("https://yahoo.com");

    const title = await page.title();
    console.log(title);

    const heading = await page.$eval('p', (element)=>element.textContent)
    console.log(heading);

    await page.screenshot({path: "episode3.png"});

    await page.pdf({path: 'example.pdf', format: 'A4'});

    await browser.close();

}

run();