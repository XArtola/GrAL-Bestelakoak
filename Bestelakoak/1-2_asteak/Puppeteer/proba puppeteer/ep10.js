const puppeteer = require("puppeteer");
const fs = require("fs");
const { get } = require("http");

async function getSourceCode(url, outputData){

    try{

        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        await page.goto(url);

        const sourceCode = await page.content();

        fs.writeFileSync(outputData, sourceCode, "utf-8");

        console.log("Succesfully executed the source code of the URL");
    }
    catch(err){
        console.error("Error getting source code");
    }

}

getSourceCode("https://yahoo.com","code.html");