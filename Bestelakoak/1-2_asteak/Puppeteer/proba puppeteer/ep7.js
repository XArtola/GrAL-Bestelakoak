const puppeteer = require("puppeteer");

async function generatePDF(url, outputFile){

    try{
        // Launch the browser
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        // Navigate to the page
        await page.goto(url);

        // Generate PDF
        await page.pdf({path: outputFile, format: 'A4'});

        // Close browser
        await browser.close();
    }
    catch(err){
        console.log(err);
    }

}

generatePDF("http://localhost:3005","output.pdf");