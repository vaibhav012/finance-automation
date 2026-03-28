require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const cron = require('node-cron');

// Configuration
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const STOCK_WATCHLIST = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS'];

/** 1. GOOGLE AUTHENTICATION **/
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        return google.auth.fromJSON(JSON.parse(content));
    } catch (err) { return null; }
}

async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) return client;
    client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
    if (client.credentials) await saveCredentials(client);
    return client;
}

/** 2. GMAIL READER **/
async function getTransactions(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    // Search for emails from the last 7 days with keywords
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'subject:(Transaction OR Alert OR Debit OR Credit) after:2026/03/08',
    });

    const messages = res.data.messages || [];
    const transactions = [];

    for (const msg of messages) {
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        const body = details.data.snippet; // Use snippet for speed or parse payload.parts for full HTML
        
        // Agent Transformation
        const structured = await transformWithAI(body);
        if (structured) transactions.push(structured);
    }
    return transactions;
}

/** 3. AI TRANSFORMATION AGENT **/
async function transformWithAI(text) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Extract transaction info into JSON: {amount, currency, merchant, date}. Text: ${text}`;
        const result = await model.generateContent(prompt);
        const jsonStr = result.response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(jsonStr);
    } catch (e) { return null; }
}

/** 4. STOCK FETCHER **/
async function getStockData() {
    const results = [];
    for (const symbol of STOCK_WATCHLIST) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
            const res = await axios.get(url);
            const data = res.data.chart.result[0].meta;
            const change = ((data.regularMarketPrice - data.previousClose) / data.previousClose) * 100;
            results.push({ symbol, price: data.regularMarketPrice, change: change.toFixed(2) });
        } catch (e) { console.error(`Stock error for ${symbol}`); }
    }
    return results;
}

/** 5. FINAL REPORT & AUTOMATION **/
async function main() {
    const auth = await authorize();
    const transactions = await getTransactions(auth);
    const stocks = await getStockData();

    console.log("--- WEEKLY REPORT ---");
    console.log("Transactions:", transactions);
    console.log("Stocks:", stocks);
    
    // Logic to send mail back to yourself via gmail.users.messages.send goes here
}

// Schedule: Sunday at 9 AM
cron.schedule('0 9 * * 0', () => {
    main().catch(console.error);
});

// Initial run for testing
main();