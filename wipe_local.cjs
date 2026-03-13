const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'loja.db');
const db = new sqlite3.Database(dbPath);

const tables = [
    'categories', 'products', 'transactions', 'finance_records', 
    'clients', 'suppliers', 'service_orders', 'settings', 
    'users', 'material_shipments', 'quotes'
];

async function wipe() {
    console.log("⚠️ LIMPANDO BANCO DE DADOS LOCAL...");
    
    for (const table of tables) {
        await new Promise((resolve) => {
            db.run(`DELETE FROM ${table}`, (err) => {
                if (err) console.error(`Erro ao limpar ${table}:`, err.message);
                else console.log(`✅ Tabela ${table} limpa.`);
                resolve();
            });
        });
    }
    
    console.log("\n🔥 O BANCO LOCAL ESTÁ VAZIO AGORA.");
    db.close();
}

wipe();
