const puppeteer = require("puppeteer");
const fs = require("fs");

async function scrapeURLs(urls){
    try{

        const browser = await puppeteer.launch();
        const scrapingPromises = urls.map(async(url) => {

            const page = await browser.newPage();
            await page.goto(url);

            const data = await page.evaluate(
                () => {
                    const title = document.querySelector("h1").textContent.trim();
                    const description = document.querySelector("p").textContent.trim()

                    return {title, description};
            });

            await page.close();

            return data;
        });
        
        const strapedDataArray = await Promise.all(scrapingPromises);

        const outputData = "outpuData.json";
        fs.writeFileSync(outputData, JSON.stringify(strapedDataArray));

        console.log("Scrapped data"+ outputData);

        await browser.close();
    }
    catch(err){
        console.log(err);
    }
}
scrapeURLs(["https://example.com","https://example.org","https://example.net"]);