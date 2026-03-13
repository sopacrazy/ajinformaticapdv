const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.all('SELECT client_name, type, created_at, total FROM transactions ORDER BY created_at DESC LIMIT 10', [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Transactions:', JSON.stringify(rows, null, 2));
    }
    
    db.all('SELECT client_name, created_at, total FROM material_shipments ORDER BY created_at DESC LIMIT 10', [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Shipments:', JSON.stringify(rows, null, 2));
        }
        db.close();
    });
});
