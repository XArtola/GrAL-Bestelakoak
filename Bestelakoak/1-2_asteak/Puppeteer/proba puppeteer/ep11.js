const puppeteer = require("puppeteer");

async function submit(url, serarchQuery){

    try{
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();
        await page.goto(url);

        await page.focus("input[id='searchbox_input']");
        await page.keyboard.type(serarchQuery);

        await page.keyboard.press("Enter");

        await page.waitForNavigation({waitUntil: "networkidle2"});

        await page.screenshot({path: 'query.png'})

        await browser.close();

        console.log("Form Data Submitted Succesfully");
    }
    catch(err){
        console.error(err);
    }

}

submit("https://duckduckgo.com/","rastreator");