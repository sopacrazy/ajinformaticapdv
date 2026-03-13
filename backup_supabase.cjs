const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: SUPABASE_URL e SUPABASE_KEY não configurados no .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dbPath = path.resolve(__dirname, 'loja.db');
const db = new sqlite3.Database(dbPath);

const tables = [
    'categories',
    'products',
    'transactions',
    'finance_records',
    'clients',
    'suppliers',
    'service_orders',
    'settings',
    'users',
    'material_shipments',
    'quotes'
];

async function syncTable(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
            if (err) {
                console.error(`Erro ao ler tabela ${tableName}:`, err.message);
                return resolve(); // Continua para a próxima
            }

            if (rows.length === 0) {
                console.log(`Tabela ${tableName} está vazia localmente.`);
                return resolve();
            }

            // Limpeza de dados: converter strings vazias em null para campos de data/número
            const cleanedRows = rows.map(row => {
                const newRow = { ...row };
                for (let key in newRow) {
                    if (newRow[key] === "") {
                        newRow[key] = null;
                    }
                }
                return newRow;
            });

            console.log(`Enviando ${cleanedRows.length} registros da tabela ${tableName}...`);

            // Dividir em chunks para evitar limites de payload se necessário
            const chunkSize = 100;
            for (let i = 0; i < cleanedRows.length; i += chunkSize) {
                const chunk = cleanedRows.slice(i, i + chunkSize);
                const { error } = await supabase
                    .from(tableName)
                    .upsert(chunk, { onConflict: (tableName === 'transactions' ? 'id, product_id' : 'id') });

                if (error) {
                    console.error(`Erro no Supabase ao sincronizar ${tableName}:`, error.message);
                    if (error.message.includes('can_view_stock')) {
                        console.log("Dica SQL: ALTER TABLE users ADD COLUMN can_view_stock BOOLEAN DEFAULT FALSE;");
                    }
                    if (error.message.includes('last_backup_at')) {
                        console.log("Dica SQL: ALTER TABLE settings ADD COLUMN last_backup_at TEXT;");
                    }
                }
            }

            resolve();
        });
    });
}

async function runBackup() {
    console.log(`[${new Date().toLocaleString()}] Iniciando Sincronização com Supabase...`);
    
    for (const table of tables) {
        await syncTable(table);
    }

    console.log("✅ Processo de backup concluído!");
    db.close();
}

runBackup();
