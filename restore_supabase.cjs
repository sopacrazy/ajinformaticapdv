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

async function restoreTable(tableName) {
    console.log(`Baixando dados da tabela ${tableName} do Supabase...`);
    
    const { data, error } = await supabase
        .from(tableName)
        .select('*');

    if (error) {
        console.error(`Erro ao baixar ${tableName}:`, error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log(`Tabela ${tableName} está vazia no Supabase.`);
        return;
    }

    return new Promise((resolve) => {
        // Primeiro, limpa a tabela local para evitar conflitos de restauro total
        db.run(`DELETE FROM ${tableName}`, (err) => {
            if (err) {
                console.error(`Erro ao limpar tabela local ${tableName}:`, err.message);
                return resolve();
            }

            const columns = Object.keys(data[0]);
            const placeholders = columns.map(() => '?').join(',');
            const sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

            db.serialize(() => {
                const stmt = db.prepare(sql);
                data.forEach(row => {
                    const values = columns.map(col => row[col]);
                    stmt.run(values);
                });
                stmt.finalize();
                console.log(`✅ Restaurados ${data.length} registros em ${tableName}.`);
                resolve();
            });
        });
    });
}

async function runRestore() {
    console.log(`[${new Date().toLocaleString()}] Iniciando Restauração do Supabase...`);
    console.warn("AVISO: Isso irá sobrescrever os dados locais atuais!");

    for (const table of tables) {
        await restoreTable(table);
    }

    console.log("✅ Processo de restauração concluído!");
    db.close();
}

runRestore();
