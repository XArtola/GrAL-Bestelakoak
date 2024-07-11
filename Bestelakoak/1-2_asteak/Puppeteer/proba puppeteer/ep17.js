const puppeteer = require("puppeteer");

async function disableJS(url){

    try{
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        // Disable JavaScript
        await page.setJavaScriptEnabled(false);

        await page.goto(url);

        //Perform operations

        //await browser.close();

    }
    catch(err){
        console.log("Error disabling JavaScript");
    }

}

disableJS("https://yahoo.com");