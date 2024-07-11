const puppeteer = require("puppeteer");

async function run(){

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    // Navigate to page
    await page.goto("http://yahoo.com");

    // Extract Images
    const images = await page.$$eval("img", (elements) => 

        elements.map((element) => ({
            src: element.src,
            alt: element.alt,
        }))

    );


    // Extract Link
    const links = await page.$$eval("a",(elements) =>
    
        elements.map((element) =>({
            href: element.href,
            text: element.text,
        }))
    );

    const imageCount = images.length;
    const linkCount = links.length;

    // output of the above

    const output = JSON.stringify({images, links, imageCount, linkCount});

    console.log(output);

    // Close the browser
    await browser.close();

}

run();