const express = require('express');
const cors = require('cors');
const db = require('./db.cjs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const getLocalDate = () => {
    // Returns ISO string in local time, e.g. "2024-03-12T17:00:00"
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, -1);
    return localISOTime;
};

// --- PRODUCTS ---
app.get('/products', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM products ORDER BY name");
        // Map SQLite snake_case to CamelCase for frontend compatibility
        const products = rows.map(p => ({
            id: p.id.toString(),
            name: p.name,
            barcode: p.barcode,
            costPrice: p.cost_price,
            salePrice: p.sale_price,
            stock: p.stock_quantity,
            minStock: p.min_stock,
            category: p.category
        }));
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/products', async (req, res) => {
    const { name, barcode, costPrice, salePrice, stock, minStock, category } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO products (name, barcode, cost_price, sale_price, stock_quantity, min_stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, barcode, costPrice, salePrice, stock, minStock || 5, category]
        );
        res.status(201).json({ id: result.insertId.toString(), ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/products/:id', async (req, res) => {
    const { name, barcode, costPrice, salePrice, stock, minStock, category } = req.body;
    const { id } = req.params;
    try {
        await db.query(
            `UPDATE products SET name = ?, barcode = ?, cost_price = ?, sale_price = ?, stock_quantity = ?, min_stock = ?, category = ? WHERE id = ?`,
            [name, barcode, costPrice, salePrice, stock, minStock || 5, category, id]
        );
        res.json({ success: true, id, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/products/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRANSACTIONS (SALES/STOCK) ---
app.post('/transactions', async (req, res) => {
    const tx = req.body; // Array or Single Object
    const transactions = Array.isArray(tx) ? tx : [tx];
    
    // Begin simpler logic: Insert TX and Update Stock
    try {
        for (const t of transactions) {
            // 1. Insert Transaction
            await db.query(
                `INSERT INTO transactions (id, product_id, product_name, type, quantity, unit_price, total, payment_method, client_name, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.id, t.productId, t.productName, t.type, t.quantity, t.unitPrice, t.total, t.paymentMethod, t.clientName || 'Consumidor Final', t.createdAt || getLocalDate()]
            );

            // 2. Update Stock
            let stockChange = 0;
            if (t.type === 'SALE' || t.type === 'OUT') {
                stockChange = -t.quantity;
            } else {
                stockChange = t.quantity;
            }
            
            await db.query(
                `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`,
                [stockChange, t.productId]
            );

            // 3. Create Finance Record if SALE
            if (t.type === 'SALE') {
                const uniqueFinanceId = Math.random().toString(36).substr(2, 9);
                await db.query(
                    `INSERT INTO finance_records (id, type, description, amount, status, due_date, transaction_id, payment_method, created_at)
                     VALUES (?, 'RECEIVABLE', ?, ?, 'PAID', ?, ?, ?, ?)`,
                    [
                        uniqueFinanceId, 
                        `Venda #${t.id.substr(0,5)} - ${t.productName}`, 
                        t.total, 
                        new Date().toISOString().split('T')[0], // Due today
                        t.id, 
                        t.paymentMethod,
                        t.createdAt || getLocalDate()
                    ]
                );
            }
        }
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/transactions', async (req, res) => {
    const { today } = req.query;
    try {
        let query = "SELECT * FROM transactions";
        let params = [];
        
        if (today === 'true') {
            const dateStr = new Date().toISOString().split('T')[0];
            query += " WHERE date(created_at) = date(?)";
            params.push(dateStr);
        }
        
        query += " ORDER BY created_at DESC";
        
        const [rows] = await db.query(query, params);
        res.json(rows.map(t => ({
            ...t,
            productId: t.product_id,
            productName: t.product_name,
            unitPrice: t.unit_price,
            paymentMethod: t.payment_method,
            clientName: t.client_name,
            createdAt: t.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FINANCE ---
app.get('/finance', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM finance_records ORDER BY created_at DESC");
        res.json(rows.map(f => ({
            id: f.id,
            type: f.type,
            description: f.description,
            amount: f.amount,
            status: f.status,
            dueDate: f.due_date,
            createdAt: f.created_at,
            paymentMethod: f.payment_method,
            transactionId: f.transaction_id
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/finance', async (req, res) => {
    const { id, type, description, amount, status, dueDate, createdAt } = req.body;
    try {
        await db.query(
            `INSERT INTO finance_records (id, type, description, amount, status, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, type, description, amount, status, dueDate, createdAt]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/finance/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query("UPDATE finance_records SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/finance/:id', async (req, res) => {
    try {
        // 1. Get the finance record to see if it's linked to a transaction
        const [rows] = await db.query("SELECT * FROM finance_records WHERE id = ?", [req.params.id]);
        
        if (rows.length > 0) {
            const record = rows[0];
            
            // If it is a sale (has transaction_id and is valid), we need to reverse the stock and delete the transaction
            if (record.transaction_id) {
                 // 2. Get transaction items to restore stock
                 const [txItems] = await db.query("SELECT * FROM transactions WHERE id = ?", [record.transaction_id]);
                 
                 for (const item of txItems) {
                    // Only restore stock if it was a SALE or OUT
                    if (item.type === 'SALE' || item.type === 'OUT') {
                        await db.query(
                            "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", 
                            [item.quantity, item.product_id]
                        );
                    }
                 }

                 // 3. Delete the transaction records
                 await db.query("DELETE FROM transactions WHERE id = ?", [record.transaction_id]);
            }
        }

        // 4. Finally, delete the finance record
        await db.query("DELETE FROM finance_records WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETTINGS ---
app.get('/settings', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM settings LIMIT 1");
        if (rows.length > 0) {
            const s = rows[0];
            res.json({ 
                companyName: s.company_name, 
                logoUrl: s.logo_url,
                pixKey: s.pix_key,
                pixFavorecido: s.pix_favorecido,
                signatureName: s.signature_name,
                cnpj: s.cnpj,
                inscEst: s.insc_est,
                phone: s.phone,
                email: s.email,
                address: s.address,
                lastBackupAt: s.last_backup_at
            });
        } else {
            res.json({ 
                companyName: 'MicroERP Varejo', 
                logoUrl: '',
                pixKey: '08.859.294/0001-13',
                pixFavorecido: 'AJ INFORMÁTICA',
                signatureName: 'Alex Santos',
                cnpj: '08.859.294/0001-13',
                inscEst: '15.271.024-8',
                phone: '(91) 98827-1517',
                email: 'alexsantos225@hotmail.com',
                address: 'Alameda Imperial nº 51, São José, Castanhal - PA'
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/settings', async (req, res) => {
    const { 
        companyName, logoUrl, pixKey, pixFavorecido, 
        signatureName, cnpj, inscEst, phone, email, address 
    } = req.body;
    try {
        // Upsert logic simplified: Delete all and insert one
        await db.query("DELETE FROM settings");
        await db.query(
            `INSERT INTO settings (
                company_name, logo_url, pix_key, pix_favorecido, 
                signature_name, cnpj, insc_est, phone, email, address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
                companyName, logoUrl, pixKey, pixFavorecido, 
                signatureName, cnpj, inscEst, phone, email, address
            ]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
        if (rows.length > 0) {
            const u = rows[0];
            res.json({ 
                success: true, 
                user: { 
                    id: u.id, 
                    username: u.username,
                    role: u.role,
                    permissions: {
                        dashboard: u.can_view_dashboard === 1,
                        pdv: u.can_view_pdv === 1,
                        sales: u.can_view_sales === 1,
                        inventory: u.can_view_inventory === 1,
                        clients: u.can_view_clients === 1,
                        suppliers: u.can_view_suppliers === 1,
                        materialShipment: u.can_view_material_shipment === 1,
                        finance: u.can_view_finance === 1,
                        serviceOrders: u.can_view_service_orders === 1,
                        reports: u.can_view_reports === 1,
                        settings: u.can_view_settings === 1,
                        manageUsers: u.can_manage_users === 1
                    }
                } 
            });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/users/password', async (req, res) => {
    const { oldPassword, newPassword, username } = req.body;
    const targetUser = username || 'admin';
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ? AND password = ?", [targetUser, oldPassword]);
        if (rows.length > 0) {
            await db.query("UPDATE users SET password = ? WHERE username = ?", [newPassword, targetUser]);
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Senha atual incorreta' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER MANAGEMENT ---
app.get('/users', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, username, role, 
            can_view_dashboard, can_view_pdv, can_view_sales, can_view_inventory, 
            can_view_clients, can_view_suppliers, can_view_material_shipment,
            can_view_finance, can_view_service_orders, can_view_reports, 
            can_view_settings, can_manage_users 
            FROM users
        `);
        res.json(rows.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            permissions: {
                dashboard: u.can_view_dashboard === 1,
                pdv: u.can_view_pdv === 1,
                sales: u.can_view_sales === 1,
                inventory: u.can_view_inventory === 1,
                clients: u.can_view_clients === 1,
                suppliers: u.can_view_suppliers === 1,
                materialShipment: u.can_view_material_shipment === 1,
                finance: u.can_view_finance === 1,
                serviceOrders: u.can_view_service_orders === 1,
                reports: u.can_view_reports === 1,
                settings: u.can_view_settings === 1,
                manageUsers: u.can_manage_users === 1
            }
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/users', async (req, res) => {
    const { username, password, role, permissions } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO users (
                username, password, role, 
                can_view_dashboard, can_view_pdv, can_view_sales, can_view_inventory, 
                can_view_clients, can_view_suppliers, can_view_material_shipment,
                can_view_finance, can_view_reports, can_view_service_orders, 
                can_view_settings, can_manage_users
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                username, 
                password, 
                role || 'OPERATOR', 
                permissions?.dashboard ? 1 : 0,
                permissions?.pdv ? 1 : 0,
                permissions?.sales ? 1 : 0,
                permissions?.inventory ? 1 : 0,
                permissions?.clients ? 1 : 0,
                permissions?.suppliers ? 1 : 0,
                permissions?.materialShipment ? 1 : 0,
                permissions?.finance ? 1 : 0,
                permissions?.reports ? 1 : 0,
                permissions?.serviceOrders ? 1 : 0,
                permissions?.settings ? 1 : 0,
                permissions?.manageUsers ? 1 : 0
            ]
        );
        res.status(201).json({ id: result.insertId, username, role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/users/:id', async (req, res) => {
    const { username, password, role, permissions } = req.body;
    const { id } = req.params;
    try {
        let query = `
            UPDATE users SET 
                username = ?, role = ?, 
                can_view_dashboard = ?, can_view_pdv = ?, can_view_sales = ?, 
                can_view_inventory = ?, can_view_clients = ?, can_view_suppliers = ?, 
                can_view_material_shipment = ?, can_view_finance = ?, can_view_reports = ?, 
                can_view_service_orders = ?, can_view_settings = ?, can_manage_users = ?
        `;
        let params = [
            username, 
            role, 
            permissions?.dashboard ? 1 : 0,
            permissions?.pdv ? 1 : 0,
            permissions?.sales ? 1 : 0, 
            permissions?.inventory ? 1 : 0, 
            permissions?.clients ? 1 : 0, 
            permissions?.suppliers ? 1 : 0, 
            permissions?.materialShipment ? 1 : 0, 
            permissions?.finance ? 1 : 0, 
            permissions?.reports ? 1 : 0, 
            permissions?.serviceOrders ? 1 : 0,
            permissions?.settings ? 1 : 0,
            permissions?.manageUsers ? 1 : 0
        ];

        if (password) {
            query += ", password = ?";
            params.push(password);
        }

        query += " WHERE id = ?";
        params.push(id);

        await db.query(query, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        // Prevent deleting admin from this route if needed
        const [rows] = await db.query("SELECT username FROM users WHERE id = ?", [req.params.id]);
        if (rows.length > 0 && rows[0].username === 'admin') {
            return res.status(403).json({ error: 'Não é possível excluir o usuário administrador principal' });
        }
        await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




// --- MAINTENANCE ---
app.post('/maintenance/fix-orphans', async (req, res) => {
    try {
        // Find transactions of type SALE that do NOT have a matching finance record
        const [orphans] = await db.query(`
            SELECT t.id, t.product_name, t.total 
            FROM transactions t
            LEFT JOIN finance_records f ON t.id = f.transaction_id
            WHERE t.type = 'SALE' AND f.id IS NULL
        `);

        if (orphans.length > 0) {
            console.log(`Found ${orphans.length} orphan transactions. Fixing...`);
            // Delete them
            for (const orphan of orphans) {
                await db.query("DELETE FROM transactions WHERE id = ?", [orphan.id]);
            }
        }

        res.json({ success: true, fixedCount: orphans.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// --- CATEGORIES ---
app.get('/categories', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM categories ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/categories', async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await db.query("INSERT INTO categories (name) VALUES (?)", [name]);
        res.status(201).json({ id: result.insertId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/categories/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- SERVICE ORDERS (ORDENS DE SERVIÇO) ---
app.get('/service-orders/next-number', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT MAX(id) as maxId FROM service_orders");
        const nextId = (rows[0].maxId || 0) + 1;
        const formatted = nextId.toString().padStart(6, '0');
        res.json({ nextNumber: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/service-orders', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM service_orders ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/service-orders/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM service_orders WHERE id = ?', [req.params.id]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: 'OS não encontrada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/service-orders', async (req, res) => {
    const {
        number, client_name, client_phone, client_cpf, client_address,
        equipment, brand, model, serial_number, problem_description,
        service_description, technician, parts_used,
        labor_cost, parts_cost, total_cost, status,
        estimated_date, delivery_date, notes
    } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO service_orders 
            (number, client_name, client_phone, client_cpf, client_address,
             equipment, brand, model, serial_number, problem_description,
             service_description, technician, parts_used,
             labor_cost, parts_cost, total_cost, status,
             estimated_date, delivery_date, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [number, client_name, client_phone, client_cpf, client_address,
             equipment, brand, model, serial_number, problem_description,
             service_description, technician, parts_used,
             labor_cost||0, parts_cost||0, total_cost||0, status||'ABERTA',
             estimated_date, delivery_date, notes]
        );
        const [newRows] = await db.query('SELECT * FROM service_orders WHERE id = ?', [result.insertId]);
        res.status(201).json(newRows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/service-orders/:id', async (req, res) => {
    const {
        client_name, client_phone, client_cpf, client_address,
        equipment, brand, model, serial_number, problem_description,
        service_description, technician, parts_used,
        labor_cost, parts_cost, total_cost, status,
        estimated_date, delivery_date, notes
    } = req.body;
    try {
        await db.query(
            `UPDATE service_orders SET
            client_name=?, client_phone=?, client_cpf=?, client_address=?,
            equipment=?, brand=?, model=?, serial_number=?, problem_description=?,
            service_description=?, technician=?, parts_used=?,
            labor_cost=?, parts_cost=?, total_cost=?, status=?,
            estimated_date=?, delivery_date=?, notes=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?`,
            [client_name, client_phone, client_cpf, client_address,
             equipment, brand, model, serial_number, problem_description,
             service_description, technician, parts_used,
             labor_cost||0, parts_cost||0, total_cost||0, status,
             estimated_date, delivery_date, notes, req.params.id]
        );
        const [rows] = await db.query('SELECT * FROM service_orders WHERE id = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/service-orders/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query(
            'UPDATE service_orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [status, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/service-orders/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM service_orders WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- QUOTES (ORÇAMENTOS) ---
app.get('/quotes', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM quotes ORDER BY created_at DESC");
        res.json(rows.map(q => ({
            ...q,
            clientName: q.client_name,
            items: JSON.parse(q.items),
            createdAt: q.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/quotes', async (req, res) => {
    const { id, clientName, items, total, status, createdAt } = req.body;
    try {
        await db.query(
            `INSERT INTO quotes (id, client_name, items, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, clientName, JSON.stringify(items), total, status || 'OPEN', createdAt || new Date().toISOString()]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/quotes/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query("UPDATE quotes SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/quotes/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM quotes WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CLIENTS ---
app.get('/clients', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM clients ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/clients', async (req, res) => {
    const { name, cpf_cnpj, email, phone, address } = req.body;
    try {
        const [result] = await db.query(
            "INSERT INTO clients (name, cpf_cnpj, email, phone, address) VALUES (?, ?, ?, ?, ?)",
            [name, cpf_cnpj, email, phone, address]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/clients/:id', async (req, res) => {
    const { name, cpf_cnpj, email, phone, address } = req.body;
    try {
        await db.query(
            "UPDATE clients SET name = ?, cpf_cnpj = ?, email = ?, phone = ?, address = ? WHERE id = ?",
            [name, cpf_cnpj, email, phone, address, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/clients/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM clients WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SUPPLIERS ---
app.get('/suppliers', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM suppliers ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/suppliers', async (req, res) => {
    const { name, cnpj, email, phone, address } = req.body;
    try {
        const [result] = await db.query(
            "INSERT INTO suppliers (name, cnpj, email, phone, address) VALUES (?, ?, ?, ?, ?)",
            [name, cnpj, email, phone, address]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/suppliers/:id', async (req, res) => {
    const { name, cnpj, email, phone, address } = req.body;
    try {
        await db.query(
            "UPDATE suppliers SET name = ?, cnpj = ?, email = ?, phone = ?, address = ? WHERE id = ?",
            [name, cnpj, email, phone, address, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/suppliers/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM suppliers WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MATERIAL SHIPMENTS ---
app.get('/shipments', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM material_shipments ORDER BY created_at DESC");
        res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/shipments', async (req, res) => {
    const { id, client_id, client_name, items, total, notes } = req.body;
    try {
        // 1. Save shipment
        await db.query(
            "INSERT INTO material_shipments (id, client_id, client_name, items, total, notes) VALUES (?, ?, ?, ?, ?, ?)",
            [id, client_id, client_name, JSON.stringify(items), total, notes]
        );

        // 2. Update Stock and create history transactions
        for (const item of items) {
            // Update product stock
            await db.query(
                "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
                [item.quantity, item.productId || item.id]
            );

            // Record in transactions history
            await db.query(
                `INSERT INTO transactions (id, product_id, product_name, type, quantity, unit_price, total, payment_method, client_name, created_at) 
                 VALUES (?, ?, ?, 'OUT', ?, ?, ?, 'EXPEDIÇÃO', ?, ?)`,
                [
                    `${id}-${item.productId || item.id}`, 
                    item.productId || item.id, 
                    item.name, 
                    item.quantity, 
                    item.costPrice || item.salePrice || 0, 
                    (item.quantity * (item.costPrice || item.salePrice || 0)),
                    client_name,
                    getLocalDate()
                ]
            );
        }

        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/shipments/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM material_shipments WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CLIENT MOVEMENT REPORT ---
app.get('/reports/client-movement', async (req, res) => {
    const { clientName, startDate, endDate } = req.query;
    if (!clientName) return res.status(400).json({ error: 'Client name required' });

    let dateFilter = "";
    const params = [clientName.trim()];
    
    if (startDate && endDate) {
        // SQLite: compare only the date part or use a compatible string format
        dateFilter = " AND date(created_at) BETWEEN date(?) AND date(?)";
        params.push(startDate, endDate);
    }

    try {
        const querySales = `SELECT 'VENDA' as source, id, product_name, quantity, total, created_at FROM transactions WHERE client_name = ? ${dateFilter} ORDER BY created_at DESC`;
        const queryShipments = `SELECT 'SAÍDA' as source, id, notes as product_name, 1 as quantity, total, created_at FROM material_shipments WHERE client_name = ? ${dateFilter} ORDER BY created_at DESC`;
        const queryOS = `SELECT 'OS' as source, number as id, equipment || ' - ' || problem_description as product_name, 1 as quantity, total_cost as total, created_at FROM service_orders WHERE client_name = ? ${dateFilter} ORDER BY created_at DESC`;

        const [sales] = await db.query(querySales, params);
        const [shipments] = await db.query(queryShipments, params);
        const [os] = await db.query(queryOS, params);

        const merged = [...sales, ...shipments, ...os].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});

// --- BACKUP AUTOMÁTICO SUPABASE (Sincronização de 1 em 1 hora) ---
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (SUPABASE_URL && SUPABASE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    const tablesToBackup = [
        'categories', 'products', 'transactions', 'finance_records', 
        'clients', 'suppliers', 'service_orders', 'settings', 
        'users', 'material_shipments', 'quotes'
    ];

    async function runSupabaseBackup() {
        console.log(`[${new Date().toLocaleString()}] 🔄 Iniciando backup automático para Supabase...`);
        
        for (const tableName of tablesToBackup) {
            try {
                // Usando o wrapper db.query que já existe no seu projeto
                const [rows] = await db.query(`SELECT * FROM ${tableName}`);
                
                if (!rows || rows.length === 0) continue;

                // Limpeza: transformar "" em null para o Postgres
                const cleanedRows = rows.map(row => {
                    const newRow = { ...row };
                    for (let key in newRow) {
                        if (newRow[key] === "") newRow[key] = null;
                    }
                    return newRow;
                });

                const chunkSize = 100;
                for (let i = 0; i < cleanedRows.length; i += chunkSize) {
                    const chunk = cleanedRows.slice(i, i + chunkSize);
                    const { error } = await supabase
                        .from(tableName)
                        .upsert(chunk, { onConflict: (tableName === 'transactions' ? 'id, product_id' : 'id') });

                    if (error) {
                        console.error(`[Backup Supabase] Erro em ${tableName}:`, error.message);
                        if (error.message.includes('last_backup_at')) {
                            console.log("Dica: Execute no SQL Editor do Supabase: ALTER TABLE settings ADD COLUMN last_backup_at TEXT;");
                        }
                    }
                }
            } catch (err) {
                console.error(`[Backup Supabase] Erro ao ler tabela ${tableName}:`, err.message);
            }
        }
        
        // Salva a data do último backup bem-sucedido no banco local
        const now = new Date().toLocaleString();
        await db.query("UPDATE settings SET last_backup_at = ?", [now]);
        
        console.log(`[${now}] ✅ Backup automático concluído.`);
    }

    // Agenda o backup: 1 hora = 60 * 60 * 1000 milissegundos
    const UMA_HORA = 60 * 60 * 1000;
    setInterval(runSupabaseBackup, UMA_HORA);

    // Opcional: Executa um backup 30 segundos após ligar o servidor para garantir a sincronia inicial
    setTimeout(runSupabaseBackup, 30000);

} else {
    console.warn("[Backup Supabase] Configurações de URL/Key não encontradas no .env.local");
}

