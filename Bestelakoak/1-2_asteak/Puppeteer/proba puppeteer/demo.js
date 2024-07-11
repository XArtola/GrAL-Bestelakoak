const puppeteer = require("puppeteer");

async function demo(url){

    try{

        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        await page.goto(url);
        await page.screenshot({path: "demo/before.png"});
        await page.evaluate(() => {
            document.querySelector('button[name="button"]').click();
          });
        await page.screenshot({path: "demo/after.png"})

       await browser.close();

    }
    catch(err){

        console.log(err);
    }
}

demo("http://localhost:3010");