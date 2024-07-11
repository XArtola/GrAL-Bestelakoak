const puppeteer = require("puppeteer");

async function checkElementsPresent(url, elements){

    try{

        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        await page.goto(url);

        const presenceResults = [];

        for (const element of elements){
            const foundElements = await page.$$(element);
            presenceResults[element] = foundElements.length > 0;
        }

        console.log("Elements Presents");
        console.log(presenceResults);

        await browser.close();
    }
    catch(e){
        console.log("Unable to check elements", e);
    }

};

const elements = [".header", "#main-content", "footer"];

checkElementsPresent("https://pirateking.es",elements);