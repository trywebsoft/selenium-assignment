require("dotenv").config();
const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const chrome = require("selenium-webdriver/chrome");
const webDriverIO = require("webdriverio");
const chromeDriver = require("chromedriver");
const proxyChain = require("proxy-chain");
const express = require('express');
const path = require('path');
const { connectClient,getTrends,addData,closeConnection } = require('./mongoDB');

const app = express();

connectClient();

//Fetching current ip being used.
const fetchIP = async (browser) => {
    await browser.navigateTo('https://api.ipify.org?format=json');
    const tokenElem = await browser.$("pre");
    const token = await JSON.parse(await tokenElem.getText());
    return token.ip;
}

//Fetching the trends from twitter
const fetchTrend = async (browser) => {

    const trends = [];
    
    await browser.navigateTo('https://x.com/i/flow/login');

    let usernameField = browser.$('input[autocomplete=username]');
    await usernameField.waitForClickable({timeout:60000});
    await usernameField.setValue(process.env.X_ID);
    
    let loginBtn = await browser.$('[role=button].r-13qz1uu');
    await loginBtn.waitForClickable({timeout:60000});
    await loginBtn.click();

    let passwordField = await browser.$('[type=password]');
    await passwordField.waitForClickable({timeout:60000});
    await passwordField.setValue(process.env.X_PASSWORD);

    loginBtn = await browser.$('[data-testid*=Login_Button]');
    await loginBtn.waitForClickable({timeout:60000});
    await loginBtn.click();

    await browser.pause(60000);

    let trendingNow = await browser.$$('div[data-testid="trend"]');

    await browser.pause(20000);

    //filtering out redundant data
    for(let trendingTopic of trendingNow){
        let top5 = await trendingTopic.$$('span');
        for(let obj of top5){
            let fontWeight = await obj.getCSSProperty('font-weight');
            if(fontWeight.value==700){
            let text= await obj.getText();
            if(!trends.find((data)=>data==text))
                trends.push(text);
            }
        }
    }

    return trends;
}

//Main Selenium script
const runSeleniumScript = async () => {

    //using proxy chain to authenticate proxy and create a temporay new proxy
    const proxyAnonymized = await proxyChain.anonymizeProxy(`http://dash213:test1234@us-ca.proxymesh.com:31280`);
    const newProxy = new URL(proxyAnonymized);

    const newProxyHost = newProxy.hostname;
    const newProxyPort = newProxy.port;

    const browser = await webDriverIO.remote({
        capabilities: {
            browserName: 'chrome',
            "goog:chromeOptions":{args:[`proxy-server=http://${newProxyHost}:${newProxyPort}`]}
          }
    });
    
    try{
        const trends = await fetchTrend(browser);
        const ip = await fetchIP(browser);
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
        chromeDriver.stop();
        await browser.deleteSession();
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