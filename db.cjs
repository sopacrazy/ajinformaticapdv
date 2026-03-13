const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'loja.db');
console.log(`[Database] Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

/**
 * Wrapper to mimic mysql2/promise query interface
 */
db.query = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    const trimmedSql = sql.trim().toLowerCase();
    const isSelect = trimmedSql.startsWith('select') || trimmedSql.startsWith('pragma') || trimmedSql.startsWith('show');
    const method = isSelect ? 'all' : 'run';
    
    db[method](sql, params, function(err, rows) {
      if (err) {
        // Only log errors if they aren't "duplicate column" which are expected during migrations
        if (!err.message.includes('duplicate column name')) {
            console.error('SQL Error:', err.message, 'Query:', sql);
        }
        return reject(err);
      }
      
      if (method === 'run') {
        resolve([{ insertId: this.lastID, affectedRows: this.changes }, undefined]);
      } else {
        resolve([rows, undefined]);
      }
    });
  });
};

async function initDb() {
  try {
    // Helper to run sequential migrations
    const run = (sql) => new Promise((res, rej) => db.run(sql, (err) => err ? rej(err) : res()));

    // Products
    await run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        barcode TEXT UNIQUE,
        cost_price REAL NOT NULL DEFAULT 0.00,
        sale_price REAL NOT NULL DEFAULT 0.00,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 5,
        category TEXT DEFAULT 'Geral',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Transactions
    await run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT, 
        product_id TEXT, 
        product_name TEXT,
        type TEXT CHECK(type IN ('SALE', 'IN', 'OUT')),
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT,
        client_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, product_id)
    )`);

    try {
        await run(`ALTER TABLE transactions ADD COLUMN client_name TEXT`);
    } catch (e) { /* column exists */ }

    // Finance
    await run(`CREATE TABLE IF NOT EXISTS finance_records (
        id TEXT PRIMARY KEY,
        type TEXT CHECK(type IN ('RECEIVABLE', 'PAYABLE')),
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'PAID')),
        due_date DATE NOT NULL,
        transaction_id TEXT,
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings
    await run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT,
        logo_url TEXT,
        pix_key TEXT,
        pix_favorecido TEXT,
        signature_name TEXT,
        cnpj TEXT,
        insc_est TEXT,
        phone TEXT,
        email TEXT,
        address TEXT
    )`);

    // Migration for settings columns
    const settingColumns = ['pix_key', 'pix_favorecido', 'signature_name', 'cnpj', 'insc_est', 'phone', 'email', 'address', 'last_backup_at'];
    for (const col of settingColumns) {
        try {
            await db.query(`ALTER TABLE settings ADD COLUMN ${col} TEXT`);
        } catch (e) { /* Expected if column exists */ }
    }

    // Categories
    await run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )`);

    const [catCount] = await db.query("SELECT COUNT(*) as count FROM categories");
    if (catCount && catCount[0] && catCount[0].count === 0) {
        const defaults = ['Geral', 'Toner', 'Impressora', 'Peça'];
        for (const name of defaults) {
            await db.query("INSERT OR IGNORE INTO categories (name) VALUES (?)", [name]);
        }
    }

    // Clients
    await run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cpf_cnpj TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Suppliers
    await run(`CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cnpj TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Material Shipments (Expedição)
    await run(`CREATE TABLE IF NOT EXISTS material_shipments (
        id TEXT PRIMARY KEY,
        client_id INTEGER,
        client_name TEXT,
        items TEXT,
        total REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
    )`);

    // Users
    await run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'OPERATOR' CHECK(role IN ('ADMIN', 'OPERATOR')),
        can_view_dashboard INTEGER DEFAULT 1,
        can_view_pdv INTEGER DEFAULT 1,
        can_view_sales INTEGER DEFAULT 1,
        can_view_inventory INTEGER DEFAULT 1,
        can_view_clients INTEGER DEFAULT 1,
        can_view_suppliers INTEGER DEFAULT 1,
        can_view_material_shipment INTEGER DEFAULT 1,
        can_view_finance INTEGER DEFAULT 1,
        can_view_service_orders INTEGER DEFAULT 1,
        can_view_reports INTEGER DEFAULT 1,
        can_view_settings INTEGER DEFAULT 1,
        can_manage_users INTEGER DEFAULT 0
    )`);

    // Migrations for existing users table
    const columns = [
        'role', 'can_view_dashboard', 'can_view_pdv', 'can_view_sales', 
        'can_view_inventory', 'can_view_clients', 'can_view_suppliers', 
        'can_view_material_shipment', 'can_view_finance', 'can_view_service_orders', 
        'can_view_reports', 'can_view_settings', 'can_manage_users'
    ];
    for (const col of columns) {
        try {
            if (col === 'role') {
                await db.query(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'OPERATOR' CHECK(role IN ('ADMIN', 'OPERATOR'))`);
            } else if (col === 'can_manage_users') {
                await db.query(`ALTER TABLE users ADD COLUMN ${col} INTEGER DEFAULT 0`);
            } else {
                await db.query(`ALTER TABLE users ADD COLUMN ${col} INTEGER DEFAULT 1`);
            }
        } catch (e) { /* Expected if column exists */ }
    }

    const [adminCheck] = await db.query("SELECT * FROM users WHERE username = 'admin'");
    if (adminCheck && adminCheck.length === 0) {
        await db.query(`
            INSERT INTO users (
                username, password, role, 
                can_view_dashboard, can_view_pdv, can_view_sales, can_view_inventory, 
                can_view_clients, can_view_suppliers, can_view_material_shipment,
                can_view_finance, can_view_service_orders, can_view_reports, 
                can_view_settings, can_manage_users
            ) VALUES ('admin', '123456', 'ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
        `);
    } else {
        await db.query(`
            UPDATE users SET 
                role = 'ADMIN', can_view_dashboard = 1, can_view_pdv = 1, can_view_sales = 1, 
                can_view_inventory = 1, can_view_clients = 1, can_view_suppliers = 1, 
                can_view_material_shipment = 1, can_view_finance = 1, can_view_service_orders = 1, 
                can_view_reports = 1, can_view_settings = 1, can_manage_users = 1 
            WHERE username = 'admin'
        `);
    }

    // Service Orders
    await run(`CREATE TABLE IF NOT EXISTS service_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT UNIQUE NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        client_cpf TEXT,
        client_address TEXT,
        equipment TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        serial_number TEXT,
        problem_description TEXT NOT NULL,
        service_description TEXT,
        technician TEXT,
        parts_used TEXT,
        labor_cost REAL DEFAULT 0,
        parts_cost REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        status TEXT DEFAULT 'ABERTA' CHECK(status IN ('ABERTA','EM_ANDAMENTO','AGUARDANDO_PECA','CONCLUIDA','ENTREGUE','CANCELADA')),
        estimated_date DATE,
        delivery_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Quotes
    await run(`CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        client_name TEXT,
        items TEXT, 
        total REAL NOT NULL,
        status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CONVERTED', 'CANCELLED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

module.exports = db;
