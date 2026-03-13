const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: Credenciais Supabase não encontradas.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dbPath = path.resolve(__dirname, 'loja.db');
const db = new sqlite3.Database(dbPath);

const tables = [
    'categories', 'products', 'transactions', 'finance_records', 
    'clients', 'suppliers', 'service_orders', 'settings', 
    'users', 'material_shipments', 'quotes'
];

async function compareTables() {
    console.log("------------------------------------------------------------------");
    console.log("| Tabela            | Local (SQLite) | Nuvem (Supabase) | Status |");
    console.log("------------------------------------------------------------------");

    for (const table of tables) {
        // Contagem Local
        const localCount = await new Promise((resolve) => {
            db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
                resolve(err ? "ERRO" : row.count);
            });
        });

        // Contagem Nuvem
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        const remoteCount = error ? "ERRO" : count;

        let status = "✅ OK";
        if (localCount !== remoteCount) {
            status = "⚠️ DIFF";
        }
        if (localCount === "ERRO" || remoteCount === "ERRO") {
            status = "❌ ERRO";
        }

        console.log(`| ${table.padEnd(17)} | ${localCount.toString().padEnd(14)} | ${remoteCount.toString().padEnd(16)} | ${status} |`);
    }
    console.log("------------------------------------------------------------------");
    db.close();
}

compareTables();
