// Data sync: Gmail → parsed JSON (no HTTP server). Run the UI with `npm run web` in ./web
require('dotenv').config();
const cron = require('node-cron');
const { authorize, getTransactions } = require('./services');
const db = require('./db');
const { PARSED_TRANSACTIONS_FILE, RAW_EMAILS_FILE } = require('./constants');

async function runReport() {
    try {
        const auth = await authorize();
        const { parsedResults, unparsedSnippets, rawEmails } = await getTransactions(auth);

        const finalReport = {
            reportDate: new Date().toISOString(),
            summary: {
                totalEmailsProcessed: parsedResults.length + unparsedSnippets.length,
                successfullyParsed: parsedResults.length
            },
            transactions: parsedResults
        };

        await db.write(PARSED_TRANSACTIONS_FILE, finalReport);
        await db.write(RAW_EMAILS_FILE, {
            reportDate: finalReport.reportDate,
            totalEmailsProcessed: rawEmails.length,
            emails: rawEmails
        });
        console.log('✅ Database updated.');
    } catch (error) {
        console.error('❌ Sync Error:', error);
    }
}

cron.schedule('0 9 * * 0', runReport);
runReport();
console.log('📅 Weekly sync scheduled (Sun 09:00). Dashboard: run `npm run web` in ./web');
