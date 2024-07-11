const { By, Builder } = require('selenium-webdriver');
const assert = require("assert");

async function run() {

    let driver;
    try {

        driver = await new Builder().forBrowser('firefox').build();
        await driver.get('https://www.selenium.dev/selenium/web/web-form.html');

        let title = await driver.getTitle();
        console.log(title);

        await driver.manage().setTimeouts({ implicit: 500 });

        let textbox = await driver.findElement(By.name("my-text"));
        let submitButton = await driver.findElement(By.css("button"));

        await textbox.sendKeys("Selenium");
        await submitButton.click();

        let message = await driver.findElement(By.id("message"));
        let value = await message.getText();

        console.log(value);


    }
    catch (err) {
        console.log(err);
    }
    finally {
        await driver.quit();

    }
}

run();