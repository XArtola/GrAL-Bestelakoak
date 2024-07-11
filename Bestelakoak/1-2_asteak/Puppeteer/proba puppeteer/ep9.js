const puppeteer = require("puppeteer");

async function captureAndGeneratePDF(url, outputPath){

    try{

        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        await page.goto(url);

        await page.screenshot({path: "google-9.png"});

        await page.pdf({path: outputPath, format: "A4"});
        console.log("Succesfully generated Screenshot and PDF");

        await browser.close();
    }
    catch(err){
        console.log(err);

    }
}

captureAndGeneratePDF("https://google.com", "google-9.pdf");