const puppeteer = require("puppeteer");
const axios = require("axios");
const {parseStringPromise} = require("xml2js");
const fs = require("fs");

async function extractDataFromSitemap(sitemapURL){

    try{
        // Extract data from sitemap
        const response = await axios.get(sitemapURL);
        const sitemap = response.data;

        // Parse the XML sitemap
        const parsedXML = await parseStringPromise(sitemap);
        // Extracting the URLs
        const urls = parsedXML.urlset.url.map(url => url.loc[0]);

        // Browser launch
        const browser = await puppeteer.launch();

        // Create the promise of loopig all the URLs
        const scrapingDataPromises = urls.map(async (url) =>
        {
            const page = await browser.newPage();
            await page.goto(url);

            const data = await page.evaluate(() => {
                const title = document.title;

                return {title}
            });

            await page.close();

            return data;
        });

        // output file name
        const outputData = "sitemapData.json";

        // Resolve the promises
        const scrapedDataArray = await Promise.all(scrapingDataPromises);

        // Write it to the output file
        fs.writeFileSync(outputData, JSON.stringify(scrapedDataArray));

        // Closing the browser
        await browser.close();
    }
    catch(err){
        console.log("Unable to extract data from site", err);
    }
}

extractDataFromSitemap("https://yoast.com/page-sitemap.xml");