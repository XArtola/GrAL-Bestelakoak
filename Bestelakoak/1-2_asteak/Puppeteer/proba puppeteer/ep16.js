const puppeteer = require("puppeteer");

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await Promise.all([
        page.coverage.startCSSCoverage(),
        page.coverage.startJSCoverage(),
    ]);

    await page.goto("http://example.com");

    // Operations here

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopCSSCoverage(),
        page.coverage.stopJSCoverage(),
    ]);

    let totalBytes = 0;
    let usedBytes = 0;

    
    for (const entry in jsCoverage ){
        totalBytes += entry.text.length;
        for (const range of entry.ranges){
            usedBytes += range.end - range.start - 1;
        }
    }
    
    for (const entry in cssCoverage){
        totalBytes += entry.text.length;

        for (const range of entry.ranges){
            usedBytes+= range.end - range.start - 1;
        }
    }

 

    console.log(totalBytes);
    console.log(usedBytes);

    await browser.close();

})();