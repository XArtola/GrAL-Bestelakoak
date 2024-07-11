const puppeteer =  require("puppeteer");

async function highlightLinks(url){

    try{
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        await page.goto(url);

        await page.screenshot({path: "visualizePage.png"});

        await page.evaluate(() => {

            const links = document.querySelectorAll("a");

            links.forEach(link => {
                link.style.border = "2px solid red";
                link.style.backgroundColor = "yellow";
            });

        });

        await page.screenshot({path: "updatedLinks.png"});

        await browser.close();
    }
    catch(err){
        console.error(err);
    }

}

highlightLinks("http://example.com");