const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the electron app data db
const appDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
const dbPath = path.join(appDataPath, 'micro-erp-varejo', 'loja.db');

console.log('Checking DB at:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.log('DB file not found!');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- TRANSACTIONS ---");
    db.each("SELECT id, type, total, created_at FROM transactions", (err, row) => {
        console.log(row);
    });

    console.log("--- FINANCE RECORDS ---");
    db.each("SELECT id, type, amount, transaction_id FROM finance_records", (err, row) => {
        console.log(row);
    });
});
