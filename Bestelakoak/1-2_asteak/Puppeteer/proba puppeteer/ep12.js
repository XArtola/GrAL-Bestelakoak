const puppeteer = require("puppeteer");

async function interceptRequest(url){

    try{

        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on("request", (interceptedRequest) =>{
            if(interceptedRequest.url().endsWith(".png")){
                interceptedRequest.abort();
                console.log("Request aborted");
            }
            else
            {
                interceptedRequest.headers({"secretKey": "abc123"});
                interceptedRequest.continue();
                console.log("Request Continued with headers");

            }


        });

        //await browser.close();

    }
    catch(err){
        console.error(err);
    }

}

interceptRequest('https://yahoo.com')