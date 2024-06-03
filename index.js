require("dotenv").config();
const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const chrome = require("selenium-webdriver/chrome");
const chromeDriver = require("chromedriver");
const proxyChain = require("proxy-chain");
const express = require('express');
const path = require('path');
const { connectClient,getTrends,addData,closeConnection } = require('./mongoDB');

const app = express();

connectClient();

//List of proxies provided by proxymesh
const PROXY_LIST = [
    { host: 'us-ca.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'us-wa.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'fr.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'jp.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'au.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'nl.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'de.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'sg.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'us-il.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'us-tx.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'us-dc.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'us-ny.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'us-fl.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'uk.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'ch.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'in.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'open.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'world.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    { host: 'usisp.proxymesh.com', port: '31280', username: 'testseleni21292', password: 'test@1234' },
    // Add more proxies as needed
];

let currentProxyIndex = 0;

//Fetching current ip being used.
const fetchIP = async (driver) => {
    await driver.get('https://api.ipify.org?format=json');
    const tokenElem = await driver.wait(until.elementLocated(By.css("pre")),3000);
    const token = await JSON.parse(await tokenElem.getText());
    return token.ip;
}

//Fetching the trends from twitter
const fetchTrend = async (driver) => {

    const trends = [];
    
    await driver.get('https://x.com/i/flow/login');
    
    await driver.wait(until.urlIs("https://x.com/i/flow/login"),20000);

    let usernameField = await driver.wait(until.elementLocated(By.css('input[autocomplete=username]')),10000);
    await usernameField.sendKeys(process.env.X_ID);

    let loginBtn = await driver.wait(until.elementLocated(By.css('[role=button].r-13qz1uu')),10000);
    loginBtn.click();

    let passwordField = await driver.wait(until.elementLocated(By.css('[type=password]')),10000);
    await passwordField.sendKeys(process.env.X_PASSWORD);

    loginBtn = await driver.wait(until.elementLocated(By.css('[data-testid*=Login_Button]')),10000);
    loginBtn.click();

    let trendingNow = await driver.wait(until.elementLocated(By.css('div[aria-label="Timeline: Trending now"]')),20000);

    await driver.sleep(6000);

    let top5 = await trendingNow.findElements(By.css('span'));

    //filtering out redundant data
    for(let trendingTopic of top5){
        let fontWeight = await trendingTopic.getCssValue('font-weight');
        
        if(fontWeight==700){
        let text= await trendingTopic.getText();
        if(!trends.find((data)=>data==text))
            trends.push(text);
        }
    }

    return trends;
}

//Main Selenium script
const runSeleniumScript = async () => {
    const proxy = PROXY_LIST[currentProxyIndex];

    //using proxy chain to authenticate proxy and create a temporay new proxy
    const proxyAnonymized = await proxyChain.anonymizeProxy(`http://dash213:${proxy.password}@us-ca.proxymesh.com:${proxy.port}`);
    const newProxy = new URL(proxyAnonymized);

    const newProxyHost = newProxy.hostname;
    const newProxyPort = newProxy.port;

    //adding proxy to chrome driver
    let option = new chrome.Options();
    option.addArguments(`proxy-server=http://${newProxyHost}:${newProxyPort}`,"headless","window-size=1920,1080");

    let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(option)
    .build();
    
    try{
        const trends = await fetchTrend(driver);
        const ip = await fetchIP(driver);
        const d = new Date();
        const date = d.toLocaleDateString();
        const time = d.toLocaleTimeString();
        const result = await addData({trends:trends,date:date,time:time,ip:ip});
        console.log(result);
    }
    catch(e){
        console.log("Error"+e);
    }
    finally{
        await driver.quit();
        currentProxyIndex = (currentProxyIndex + 1) % PROXY_LIST.length;
    }
}

app.get("/",(req,res)=>{
    res.sendFile("index.html",{root:path.join(__dirname)});
});

app.get("/get-data",async (req,res)=>{
    await runSeleniumScript();
    let data = await getTrends();
    res.send(data);
});

app.listen(3000,()=>{
    console.log("App is listening on 3000");
})

app.on("close", async () => {
    await closeConnection();
});