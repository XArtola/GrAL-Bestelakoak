const puppeteer = require("puppeteer");
const fs = require("fs");

async function run(){


    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    // Navigate to page
    await page.goto("https://www.pirate-king.es/");

    // SEO related data
    const title = await page.title();
    const metaDescription = await page.$eval("meta[name='description']", (element) => element.textContent);
    const metaKeywords = await page.$eval("meta[name='keywords']", (element) => element.textContent);

    // Extract Links
    const links = await page.$$eval("a",(elements) =>

        elements.map((element) => ({
            src: element.href,
            text: element.textContent
        }))

    );

    // Extract Images
    const images = await page.$$eval("img", (elements) =>
    
        elements.map((element) => ({

            src: element.src,
            alt: element.alt

        }))
    )

    // Take counts of the images and links
    const imageCount = images.length;
    const linkCount = links.length;

    // Prepare output format
    const outputData = {
        title,
        metaDescription,
        metaKeywords,
        images,
        links,
        imageCount,
        linkCount
    };

    // Convert JSON into a string
    const outputJSON = JSON.stringify(outputData);

    // Write to file
    fs.writeFileSync("output.json", outputJSON);


};

run();