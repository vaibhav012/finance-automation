// services.js
const fs = require('fs').promises;
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const axios = require('axios');
const { PATTERNS_FILE } = require('./constants');
const db = require('./db');

/** Build matcher from JSON: regex pattern(s) + map with "{{n}}" capture placeholders */
function hydrateMatcher(account, matcher, matcherIndex = 0) {
    const regexes = Array.isArray(matcher.regex)
        ? matcher.regex.map((pattern) => (typeof pattern === 'string' ? new RegExp(pattern) : pattern))
        : [typeof matcher.regex === 'string' ? new RegExp(matcher.regex) : matcher.regex];
    const mapTemplate = matcher.map;
    const map =
        typeof mapTemplate === 'function'
            ? mapTemplate
            : (m) => {
                  const out = {};
                  for (const [key, val] of Object.entries(mapTemplate)) {
                      if (typeof val === 'string' && /^\{\{\d+\}\}$/.test(val)) {
                          const i = Number(val.slice(2, -2));
                          out[key] = m[i];
                      } else {
                          out[key] = val;
                      }
                  }
                  return out;
              };
    const matcherName = matcher.label || matcher.name || account.name;
    return {
        ...account,
        ...matcher,
        regexes,
        map,
        matcherName,
        matcherIndex
    };
}

function expandPatterns(rawPatterns = []) {
    return rawPatterns.flatMap((account) => {
        if (Array.isArray(account.patterns) && account.patterns.length > 0) {
            return account.patterns.map((matcher, index) => hydrateMatcher(account, matcher, index));
        }

        if (account.regex && account.map) {
            return [hydrateMatcher(account, account)];
        }

        return [];
    });
}

function getHeaderValue(headers, name) {
    return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
}

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

function isLoginRequiredError(error) {
    return (
        error?.response?.status === 401 ||
        error?.status === 401 ||
        error?.message?.includes('Login Required')
    );
}

async function saveAuthorizedUser(client) {
    if (!client.credentials?.refresh_token) return;

    const keys = JSON.parse(await fs.readFile(CREDENTIALS_PATH));
    const key = keys.installed || keys.web;
    await fs.writeFile(
        TOKEN_PATH,
        JSON.stringify({
            type: 'authorized_user',
            client_id: key.client_id,
            client_secret: key.client_secret,
            refresh_token: client.credentials.refresh_token,
        })
    );
}

async function authorize(forceNew = false) {
    if (!forceNew) {
        try {
            const content = await fs.readFile(TOKEN_PATH);
            return google.auth.fromJSON(JSON.parse(content));
        } catch (err) {
            if (err?.code !== 'ENOENT') {
                console.warn('Stored token could not be loaded, starting a fresh auth flow.');
            }
        }
    }

    const client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
    await saveAuthorizedUser(client);
    return client;
}

async function getTransactions(auth) {
    let gmail = google.gmail({ version: 'v1', auth });
    let res;

    try {
        res = await gmail.users.messages.list({
            userId: 'me',
            q: 'subject:(Transaction OR Alert OR Debit OR Credit OR UPI) after:2026/03/01',
        });
    } catch (error) {
        if (!isLoginRequiredError(error)) throw error;

        console.warn('Stored Google token was rejected. Removing token.json and retrying auth.');
        await fs.rm(TOKEN_PATH, { force: true });

        const refreshedAuth = await authorize(true);
        gmail = google.gmail({ version: 'v1', auth: refreshedAuth });
        res = await gmail.users.messages.list({
            userId: 'me',
            q: 'subject:(Transaction OR Alert OR Debit OR Credit) after:2026/03/01',
        });
    }

    const rawPatterns = await db.read(PATTERNS_FILE);
    const BANK_PATTERNS = expandPatterns(rawPatterns || []);

    const messages = res.data.messages || [];
    const parsedResults = [];
    const unparsedSnippets = [];
    const rawEmails = [];

    for (const msg of messages) {
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });

        const body = details.data.snippet;
        const dateEpoch = details.data.internalDate;
        const headers = details.data.payload?.headers || [];
        const rawEmail = {
            id: details.data.id,
            threadId: details.data.threadId,
            snippet: body,
            internalDate: dateEpoch,
            subject: getHeaderValue(headers, 'Subject') || null,
            from: getHeaderValue(headers, 'From') || null,
            matched: false,
            matchedPatternName: null
        };

        let found = false;
        for (const pattern of BANK_PATTERNS) {
            const match = pattern.regexes
                .map((regex) => body.match(regex))
                .find(Boolean);
            if (match) {
                const accountId = `${pattern.name}_${pattern.type}_${pattern.ending_number}`;
                parsedResults.push({
                    patternName: pattern.matcherName,
                    accountId,
                    ...pattern.map(match),
                    dateEpoch: dateEpoch,
                    dateParsed: new Date(Number(dateEpoch))
                });
                rawEmail.matched = true;
                rawEmail.matchedPatternName = pattern.matcherName;
                found = true;
                break;
            }
        }
        if (!found) unparsedSnippets.push(body);
        rawEmails.push(rawEmail);
    }
    return { parsedResults, unparsedSnippets, rawEmails };
}

async function getStockData(watchlist) {
    const results = [];
    for (const symbol of watchlist) {
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

module.exports = { authorize, getTransactions, getStockData };
