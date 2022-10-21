import puppeteer from "puppeteer";
import * as dotenv from 'dotenv';
import twilio from "twilio";
import { createLogger, format, transports } from "winston";
dotenv.config();

const logger = createLogger({
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.json()
    ),
    transports: [
        new transports.File({ filename: 'info.log' })
    ]
});
const twilioClient = twilio(process.env.TWILIO_ACCOUNTSID, process.env.TWILIO_AUTHTOKEN);
const startUrl = "https://ticketcenter.wacken.com/tickets/market";
const headless = process.env.NODE_ENV || false;
let page;
let firstContent;
let first = true;
let different = false;

async function main() {
    const browser = await puppeteer.launch({ 
        headless: true,
        args:["--no-sandbox"]
    });
    page = await browser.newPage();
    await page.goto(startUrl);
    await recursive();
}

async function recursive() {
    if (page.url() != startUrl) {
        page.waitForSelector("#username", {
            timeout: 2000
        })
            .then(async () => {
                await page.type('#username', process.env.WACKEN_USERNAME);
                await page.type('#password', process.env.WACKEN_PASSWORD);
                await page.click("button[type='submit']");
                setTimeout(timeout, 2000);
            })
            .catch(async () => {
                await page.reload();
                await recursive();
            });
    }
    else
    {
        setTimeout(timeout, 2000);
    }
}

async function timeout() {
    if(page.url() == startUrl){
        const content = await page.content();

        if(first){
            first = false;
            firstContent = content;
        }
        
        if(firstContent == content)
        {
            console.log("SAME");
            logger.info("SAME");
            different = false;
        }
        else if (firstContent != content && !different)
        {
            console.log("DIFFERENT");
            logger.info("DIFFERENT");
            twilioClient.messages
                .create({
                    body: "TICKET AVAILABLE",
                    messagingServiceSid: process.env.TWILIO_MESSAGINGSID,
                    to: process.env.TWILIO_TO
                })
                .done();
            different = true;
        }
    }

    await page.reload();
    await recursive();
}

main();