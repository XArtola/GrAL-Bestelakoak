const puppeteer = require("puppeteer");

async function checkBrokenLinks(url){

    try{
        const browser = await puppeteer.launch({headless: false});
        const page =  await browser.newPage();

        await page.goto(url);

        const links = await page.$$eval("a", anchors => anchors.map(a => a.href));

        console.log("LINKSDSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS")
        console.log(links);

        const brokenLinks = [];

        for(const link of links){

            const response = await page.goto(link, {waitUntil: "networkidle0", timeout: 5000});
            if(response.status() >= 400){
                brokenLinks.push({link, status: response.status });
            }

        }

        console.log("Broken Links", brokenLinks);

        await browser.close();


    }
    catch(err){
        console.log(err);
    }

}

checkBrokenLinks("https://yahoo.com");