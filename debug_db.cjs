const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('loja.db');

console.log('--- RECENT TRANSACTIONS ---');
db.all('SELECT client_name, type, created_at, total FROM transactions ORDER BY created_at DESC LIMIT 5', [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    
    console.log('--- RECENT SHIPMENTS ---');
    db.all('SELECT client_name, created_at, total FROM material_shipments ORDER BY created_at DESC LIMIT 5', [], (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
        
        console.log('--- CLIENTS LIST ---');
        db.all('SELECT name FROM clients LIMIT 5', [], (err, rows) => {
            if (err) console.error(err);
            else console.log(JSON.stringify(rows, null, 2));
            db.close();
        });
    });
});
