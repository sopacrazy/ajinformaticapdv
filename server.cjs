const express = require('express');
const cors = require('cors');
const db = require('./db.cjs');
const { supabase } = db;

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const getLocalDate = () => {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    // Retorna data/hora local no formato ISO para suportar .split('T') e evitar bugs de fuso horário (UTC)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const addDays = (dateStr, days) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const pad = (n) => n.toString().padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
};

const createFinanceRecordForOS = async (osId, initialStatus = 'PAID') => {
    try {
        // Check if already has a record (ignore deleted)
        // Check for both PAID and PENDING to avoid duplicate finance entries for the same OS
        const { data: existing, error: errExist } = await supabase
            .from('finance_records')
            .select('id, status, amount')
            .eq('os_id', osId)
            .eq('is_deleted', 0);
        
        if (errExist) throw errExist;

        const { data: osRows, error: errOS } = await supabase
            .from('service_orders')
            .select('*')
            .eq('id', osId)
            .eq('is_deleted', 0);
        
        if (errOS) throw errOS;
        if (!osRows || osRows.length === 0) return;
        
        const os = osRows[0];
        
        if (existing && existing.length > 0) {
            if (existing.length === 1) {
                // Atualiza de forma segura o registro já existente (Status e Valor)
                await supabase.from('finance_records').update({ 
                    status: initialStatus, 
                    amount: Number(os.total_cost || 0) 
                }).eq('id', existing[0].id);
                console.log(`[Finance] Updated record ${existing[0].id} to ${initialStatus} for OS ${osId}`);
            } else {
                // Múltiplos registros significam recebimentos parciais envolvidos. 
                // Apenas quitamos qualquer pendência financeira caso a OS esteja paga.
                if (initialStatus === 'PAID') {
                    for (const p of existing.filter(r => r.status === 'PENDENTE')) {
                        await supabase.from('finance_records').update({ status: 'PAID' }).eq('id', p.id);
                    }
                }
            }
            return;
        }

        const uniqueFinanceId = 'FIN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        const { error: errInsert } = await supabase
            .from('finance_records')
            .insert({
                id: uniqueFinanceId,
                type: 'RECEIVABLE',
                description: `OS #${os.number} - ${os.client_name} - ${os.equipment}`,
                amount: Number(os.total_cost || 0),
                status: initialStatus, // Use the status passed (PAID or PENDENTE)
                due_date: getLocalDate().split('T')[0],
                os_id: osId,
                created_at: getLocalDate(),
                is_deleted: 0
            });

        if (errInsert) throw errInsert;
        console.log(`[Finance] Created record ${uniqueFinanceId} (Status: ${initialStatus}) for OS ${os.number}`);
    } catch (err) {
        console.error("Error creating finance record for OS:", err);
    }
};

// --- PRODUCTS ---
app.get('/products', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_deleted', 0)
            .order('name');
        
        if (error) throw error;

        const products = rows.map(p => ({
            id: p.id.toString(),
            name: p.name,
            barcode: p.barcode,
            costPrice: p.cost_price,
            salePrice: p.sale_price,
            stock: p.stock_quantity,
            minStock: p.min_stock,
            category: p.category,
            imageUrl: p.image_url
        }));
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/products', async (req, res) => {
    const { name, barcode, costPrice, salePrice, stock, minStock, category, imageUrl } = req.body;
    try {
        const { data: result, error } = await supabase
            .from('products')
            .insert({
                name, barcode, cost_price: Number(costPrice)||0, sale_price: Number(salePrice)||0, 
                stock_quantity: Number(stock)||0, min_stock: Number(minStock)||5, 
                category, image_url: imageUrl, is_deleted: 0
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ id: result.id.toString(), ...req.body });
    } catch (err) {
        console.error("Error creating product:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/products/:id', async (req, res) => {
    const { name, barcode, costPrice, salePrice, stock, minStock, category, imageUrl } = req.body;
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('products')
            .update({
                name, barcode, cost_price: Number(costPrice)||0, sale_price: Number(salePrice)||0, 
                stock_quantity: Number(stock)||0, min_stock: Number(minStock)||5, 
                category, image_url: imageUrl
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, id, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/products/:id', async (req, res) => {
    try {
        // Soft Delete
        const { error } = await supabase
            .from('products')
            .update({ is_deleted: 1 })
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting product:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- CATEGORIES ---
app.get('/categories', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');
        if (error) throw error;
        res.json(rows);
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/categories', async (req, res) => {
    const { name } = req.body;
    try {
        const { data: result, error } = await supabase
            .from('categories')
            .insert({ name })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(result);
    } catch (err) {
        console.error("Error creating category:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/categories/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('categories').update({ is_deleted: 1 }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting category:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- TRANSACTIONS (SALES/STOCK) ---
app.post('/transactions', async (req, res) => {
    const tx = req.body; // Array or Single Object
    const transactions = Array.isArray(tx) ? tx : [tx];
    
    try {
        for (const t of transactions) {
            // 1. Insert Transaction
            const { error: errTX } = await supabase
                .from('transactions')
                .insert({
                    id: t.id,
                    product_id: t.productId,
                    product_name: t.productName,
                    type: t.type,
                    quantity: t.quantity,
                    unit_price: t.unitPrice,
                    total: t.total,
                    payment_method: t.paymentMethod,
                    client_name: t.clientName || 'Consumidor Final',
                    os_number: t.osNumber || null,
                    created_at: t.createdAt || getLocalDate(),
                    discount: t.discount || 0,
                    is_deleted: 0
                });
            if (errTX) throw errTX;

            // 2. Update Stock (Requires a fetch and update or RPC)
            // Para simplicidade vamos fazer fetch + update
            const { data: prodData, error: errProd } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', t.productId)
                .single();
            
            if (!errProd && prodData) {
                let stockChange = (t.type === 'SALE' || t.type === 'OUT') ? -t.quantity : t.quantity;
                await supabase
                    .from('products')
                    .update({ stock_quantity: prodData.stock_quantity + stockChange })
                    .eq('id', t.productId);
            }

            // 3. Create Finance Record if SALE (Skip if BOLETO, will handle it grouped)
            const pm = (t.paymentMethod || t.payment_method || '').toUpperCase();
            if (t.type === 'SALE' && pm !== 'BOLETO') {
                const uniqueFinanceId = Math.random().toString(36).substr(2, 9);
                await supabase
                    .from('finance_records')
                    .insert({
                        id: uniqueFinanceId,
                        type: 'RECEIVABLE',
                        description: `Venda #${t.id} - ${t.clientName || 'Consumidor Final'} - ${t.productName}`,
                        amount: Number(t.total || 0),
                        status: 'PAID',
                        due_date: getLocalDate().split('T')[0],
                        transaction_id: t.id,
                        payment_method: pm,
                        created_at: t.createdAt || getLocalDate(),
                        discount: t.discount || 0,
                        is_deleted: 0
                    });
            }
        }

        // Special handling for BOLETO (grouped installments)
        const first = transactions[0];
        const firstPM = (first?.paymentMethod || first?.payment_method || '').toUpperCase();
        
        console.log(`[Transaction] Processing ${transactions.length} items. First PM: ${firstPM}`);

        if (first && firstPM === 'BOLETO' && transactions.length > 0) {
            const totalVal = transactions.reduce((sum, t) => sum + t.total, 0);
            const instalments = first.installments || first.instalments || 1;
            const interval = first.interval || first.prazo || 0;
            const eachVal = totalVal / instalments;
            const clientName = first.clientName || first.client_name || 'Consumidor Final';

            console.log(`[Transaction] Creating BOLETO installments: ${instalments}x of ${eachVal}, total: ${totalVal}`);

            for (let i = 0; i < instalments; i++) {
                const dueDate = addDays(getLocalDate(), (i + 1) * interval);
                const uniqueFinanceId = Math.random().toString(36).substr(2, 9);
                await supabase
                    .from('finance_records')
                    .insert({
                        id: uniqueFinanceId,
                        type: 'RECEIVABLE',
                        description: `Venda #${first.id} (P ${i+1}/${instalments}) - ${clientName}`,
                        amount: eachVal,
                        status: 'PENDENTE',
                        due_date: dueDate,
                        transaction_id: first.id,
                        payment_method: 'BOLETO',
                        created_at: getLocalDate(),
                        discount: 0, // Discount is applied to the total, but for installments we'll track it in the transaction
                        is_deleted: 0
                    });
            }
        }
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/transactions', async (req, res) => {
    const { today, startDate, endDate } = req.query;
    try {
        let q = supabase.from('transactions').select('*').eq('is_deleted', 0);
        
        if (today === 'true') {
            const dateStr = getLocalDate().split('T')[0];
            q = q.gte('created_at', `${dateStr} 00:00:00`).lte('created_at', `${dateStr} 23:59:59`);
        } else if (startDate && endDate) {
            q = q.gte('created_at', `${startDate.replace('T', ' ')} 00:00:00`).lte('created_at', `${endDate.replace('T', ' ')} 23:59:59`);
        } else if (startDate) {
            q = q.gte('created_at', `${startDate.replace('T', ' ')} 00:00:00`);
        } else if (endDate) {
            q = q.lte('created_at', `${endDate.replace('T', ' ')} 23:59:59`);
        }

        const { data: rows, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;

        res.json(rows.map(t => ({
            ...t,
            productId: t.product_id,
            productName: t.product_name,
            unitPrice: t.unit_price,
            paymentMethod: t.payment_method,
            clientName: t.client_name,
            osNumber: t.os_number,
            createdAt: t.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/transactions/sale/:saleId', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', req.params.saleId)
            .eq('is_deleted', 0);
        
        if (error) throw error;

        res.json(rows.map(t => ({
            ...t,
            productId: t.product_id,
            productName: t.product_name,
            unitPrice: t.unit_price,
            paymentMethod: t.payment_method,
            clientName: t.client_name,
            osNumber: t.os_number,
            createdAt: t.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/transactions/next-number', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('transactions')
            .select('id')
            .ilike('id', 'V%')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;

        let nextId = 1;
        if (rows && rows.length > 0) {
            const lastId = rows[0].id;
            const numPart = lastId.replace('V', '');
            const numeric = parseInt(numPart);
            if (!isNaN(numeric)) nextId = numeric + 1;
        }
        const formatted = 'V' + nextId.toString().padStart(5, '0');
        res.json({ nextNumber: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { clientName, paymentMethod, createdAt, items, installments, interval } = req.body;
    try {
        // 1. Fetch old items for restoration
        const { data: oldItems } = await supabase.from('transactions')
            .select('product_id, quantity')
            .eq('id', id)
            .eq('is_deleted', 0);

        if (oldItems && oldItems.length > 0) {
            for (const old of oldItems) {
                // Return stock
                const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', old.product_id).single();
                if (p) {
                    await supabase.from('products').update({ stock_quantity: p.stock_quantity + old.quantity }).eq('id', old.product_id);
                }
            }
        }

        // 2. Hard delete (or soft delete logic)
        // Since we are replacing, hard delete is better for transaction rows to avoid ghost items
        await supabase.from('transactions').delete().eq('id', id);
        await supabase.from('finance_records').delete().eq('transaction_id', id);

        // 3. Insert NEW items
        let totalVal = 0;
        for (const t of items) {
            await supabase.from('transactions').insert({
                id: id,
                product_id: t.productId,
                product_name: t.productName,
                type: 'SALE',
                quantity: t.quantity,
                unit_price: t.unitPrice,
                total: t.total,
                payment_method: paymentMethod,
                client_name: clientName,
                created_at: createdAt,
                discount: t.discount || 0,
                is_deleted: 0
            });

            // Update Stock
            const { data: prodData } = await supabase.from('products').select('stock_quantity').eq('id', t.productId).single();
            if (prodData) {
                await supabase.from('products').update({ stock_quantity: prodData.stock_quantity - t.quantity }).eq('id', t.productId);
            }
            totalVal += t.total;
        }

        const pm = (paymentMethod || '').trim().toUpperCase();
        if (pm === 'BOLETO') {
            const instalments = Number(req.body.installments) || 1;
            const intervalDays = Number(req.body.interval) || 0;
            const eachVal = totalVal / instalments;

            for (let i = 0; i < instalments; i++) {
                const dueDate = addDays(getLocalDate(), (i + 1) * intervalDays);
                const uniqueFinanceId = Math.random().toString(36).substr(2, 9);
                await supabase
                    .from('finance_records')
                    .insert({
                        id: uniqueFinanceId,
                        type: 'RECEIVABLE',
                        description: `Venda #${id} (P ${i+1}/${instalments}) - ${clientName}`,
                        amount: eachVal,
                        status: 'PENDENTE',
                        due_date: dueDate,
                        transaction_id: id,
                        payment_method: 'BOLETO',
                        created_at: getLocalDate(),
                        is_deleted: 0
                    });
            }
        } else {
            // Non-boleto: Create a single PAID record for the total
            const uniqueFinanceId = Math.random().toString(36).substr(2, 9);
            await supabase.from('finance_records').insert({
                id: uniqueFinanceId,
                type: 'RECEIVABLE',
                description: `Venda #${id} - ${clientName || 'Consumidor Final'}`,
                amount: totalVal,
                status: 'PAID',
                due_date: createdAt.split('T')[0],
                transaction_id: id,
                payment_method: paymentMethod,
                created_at: createdAt,
                discount: items.reduce((sum, i) => sum + (i.discount || 0), 0),
                is_deleted: 0
            });
        }
            
        res.json({ success: true });
    } catch (err) {
        console.error("Error updating sale:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- FINANCE ---
app.get('/finance', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('finance_records')
            .select('*')
            .eq('is_deleted', 0)
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        res.json(rows.map(f => ({
            id: f.id,
            type: f.type,
            description: f.description,
            amount: f.amount,
            status: f.status,
            dueDate: f.due_date,
            createdAt: f.created_at,
            paymentMethod: f.payment_method,
            transactionId: f.transaction_id,
            osId: f.os_id,
            category: f.category,
            discount: f.discount
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/finance', async (req, res) => {
    const { id, type, description, amount, status, dueDate, createdAt, payment_method, paymentMethod, osId, category } = req.body;
    try {
        const { error } = await supabase
            .from('finance_records')
            .insert({
                id, type, description, amount, status, 
                due_date: dueDate || null, 
                payment_method: payment_method || paymentMethod || null,
                os_id: osId || null,
                category: category || null,
                created_at: createdAt || getLocalDate(),
                discount: req.body.discount || 0,
                is_deleted: 0
            });
        
        if (error) throw error;
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Error creating finance record:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/finance/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const { error } = await supabase
            .from('finance_records')
            .update({ status })
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/finance/:id/category', async (req, res) => {
    const { category } = req.body;
    try {
        const { error } = await supabase
            .from('finance_records')
            .update({ category })
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/finance/:id', async (req, res) => {
    try {
        // 1. Get the finance record (ignore deleted)
        const { data: rows, error: errGet } = await supabase
            .from('finance_records')
            .select('*')
            .eq('id', req.params.id)
            .eq('is_deleted', 0);
        
        if (errGet) throw errGet;
        
        if (rows && rows.length > 0) {
            const record = rows[0];
            
            // If it is a sale (has transaction_id), we need to reverse the stock and "delete" the transaction
            if (record.transaction_id) {
                 const { data: txItems, error: errTX } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('id', record.transaction_id);
                 
                 if (!errTX && txItems) {
                    for (const item of txItems) {
                        if (item.type === 'SALE' || item.type === 'OUT') {
                            // Fetch current stock to update
                            const { data: pData } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
                            if (pData) {
                                await supabase.from('products').update({ stock_quantity: pData.stock_quantity + item.quantity }).eq('id', item.product_id);
                            }
                        }
                    }
                    // Soft Delete the transaction
                    await supabase.from('transactions').update({ is_deleted: 1 }).eq('id', record.transaction_id);
                 }
            }
            // If it is linked to a Service Order (OS)
            if (record.os_id) {
                await supabase.from('service_orders').update({ status: 'ABERTA' }).eq('id', record.os_id);
            }
        }

        // 4. Finally, soft delete the finance record
        const { error: errDel } = await supabase.from('finance_records').update({ is_deleted: 1 }).eq('id', req.params.id);
        if (errDel) throw errDel;

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETTINGS ---
app.get('/settings', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('settings')
            .select('*')
            .eq('is_deleted', 0)
            .limit(1);
        
        if (error) throw error;

        if (rows && rows.length > 0) {
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
                lastBackupAt: s.last_backup_at,
                isBackupEnabled: s.is_sync_enabled === '1'
            });
        } else {
            // Defaults
            res.json({ 
                companyName: 'Aj Informatica', 
                logoUrl: '/logo.png',
                pixKey: '08.859.294/0001-13',
                pixFavorecido: 'Aj Informatica',
                signatureName: 'Aj Informatica',
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
        const { data: rows } = await supabase.from('settings').select('id').eq('is_deleted', 0).limit(1);

        if (rows && rows.length > 0) {
            await supabase.from('settings').update({ 
                company_name: companyName, logo_url: logoUrl, pix_key: pixKey, 
                pix_favorecido: pixFavorecido, signature_name: signatureName, 
                cnpj, insc_est: inscEst, phone, email, address 
            }).eq('id', rows[0].id);
        } else {
            await supabase.from('settings').insert({ 
                company_name: companyName, logo_url: logoUrl, pix_key: pixKey, 
                pix_favorecido: pixFavorecido, signature_name: signatureName, 
                cnpj, insc_est: inscEst, phone, email, address, is_deleted: 0
            });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data: rows, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .eq('is_deleted', 0);
        
        if (error) throw error;

        if (rows && rows.length > 0) {
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
        const { data: rows } = await supabase
            .from('users')
            .select('*')
            .eq('username', targetUser)
            .eq('password', oldPassword)
            .eq('is_deleted', 0);

        if (rows && rows.length > 0) {
            await supabase.from('users').update({ password: newPassword }).eq('username', targetUser);
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
        const { data: rows, error } = await supabase
            .from('users')
            .select(`
                id, username, role, 
                can_view_dashboard, can_view_pdv, can_view_sales, can_view_inventory, 
                can_view_clients, can_view_suppliers, can_view_material_shipment,
                can_view_finance, can_view_service_orders, can_view_reports, 
                can_view_settings, can_manage_users 
            `)
            .eq('is_deleted', 0);
        
        if (error) throw error;

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
        const { data: result, error } = await supabase
            .from('users')
            .insert({
                username, password, role: role || 'OPERATOR', 
                can_view_dashboard: permissions?.dashboard ? 1 : 0,
                can_view_pdv: permissions?.pdv ? 1 : 0,
                can_view_sales: permissions?.sales ? 1 : 0,
                can_view_inventory: permissions?.inventory ? 1 : 0,
                can_view_clients: permissions?.clients ? 1 : 0,
                can_view_suppliers: permissions?.suppliers ? 1 : 0,
                can_view_material_shipment: permissions?.materialShipment ? 1 : 0,
                can_view_finance: permissions?.finance ? 1 : 0,
                can_view_reports: permissions?.reports ? 1 : 0,
                can_view_service_orders: permissions?.serviceOrders ? 1 : 0,
                can_view_settings: permissions?.settings ? 1 : 0,
                can_manage_users: permissions?.manageUsers ? 1 : 0,
                is_deleted: 0
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ id: result.id, username, role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/users/:id', async (req, res) => {
    const { username, password, role, permissions } = req.body;
    const { id } = req.params;
    try {
        const updateData = {
            username, role: role || 'OPERATOR', 
            can_view_dashboard: permissions?.dashboard ? 1 : 0,
            can_view_pdv: permissions?.pdv ? 1 : 0,
            can_view_sales: permissions?.sales ? 1 : 0,
            can_view_inventory: permissions?.inventory ? 1 : 0,
            can_view_clients: permissions?.clients ? 1 : 0,
            can_view_suppliers: permissions?.suppliers ? 1 : 0,
            can_view_material_shipment: permissions?.materialShipment ? 1 : 0,
            can_view_finance: permissions?.finance ? 1 : 0,
            can_view_reports: permissions?.reports ? 1 : 0,
            can_view_service_orders: permissions?.serviceOrders ? 1 : 0,
            can_view_settings: permissions?.settings ? 1 : 0,
            can_manage_users: permissions?.manageUsers ? 1 : 0
        };

        if (password) {
            updateData.password = password;
        }

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        const { data: rows } = await supabase.from('users').select('username').eq('id', req.params.id).single();
        if (rows && rows.username === 'admin') {
            return res.status(403).json({ error: 'Não é possível excluir o usuário administrador principal' });
        }
        // Soft Delete
        await supabase.from('users').update({ is_deleted: 1 }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- MAINTENANCE ---
app.post('/maintenance/fix-orphans', async (req, res) => {
    try {
        // Simple fix for orphans: get all sales, get all finance trans_ids, compare.
        const { data: txs } = await supabase.from('transactions').select('id').eq('type', 'SALE').eq('is_deleted', 0);
        const { data: fins } = await supabase.from('finance_records').select('transaction_id').not('transaction_id', 'is', null).eq('is_deleted', 0);
        
        const finIds = new Set((fins || []).map(f => f.transaction_id));
        const orphans = (txs || []).filter(t => !finIds.has(t.id));

        if (orphans.length > 0) {
            for (const orphan of orphans) {
                await supabase.from('transactions').update({ is_deleted: 1 }).eq('id', orphan.id);
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
        const { data: rows, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_deleted', 0)
            .order('name');
        if (error) throw error;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/categories', async (req, res) => {
    const { name } = req.body;
    try {
        const { data: result, error } = await supabase
            .from('categories')
            .insert({ name, is_deleted: 0 })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json({ id: result.id, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/categories/:id', async (req, res) => {
    try {
        await supabase.from('categories').update({ is_deleted: 1 }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- SERVICE ORDERS (ORDENS DE SERVIÇO) ---
app.get('/service-orders/next-number', async (req, res) => {
    try {
        // Fetch last 50 entries to find the highest numeric number
        const { data: rows, error } = await supabase
            .from('service_orders')
            .select('number')
            .order('id', { ascending: false })
            .limit(50);

        if (error) throw error;

        let maxId = 0;
        if (rows && rows.length > 0) {
            rows.forEach(r => {
                const num = parseInt(r.number, 10);
                if (!isNaN(num) && /^\d+$/.test(r.number)) {
                    if (num > maxId) maxId = num;
                }
            });
        }
        
        const nextId = maxId + 1;
        const formatted = nextId.toString().padStart(6, '0');
        res.json({ nextNumber: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/service-orders', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('service_orders')
            .select('*')
            .eq('is_deleted', 0)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/service-orders/:id', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('service_orders')
            .select('*')
            .eq('id', req.params.id)
            .eq('is_deleted', 0)
            .maybeSingle();
        if (error) throw error;
        if (rows) res.json(rows);
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
        labor_cost, parts_cost, discount, total_cost, status,
        estimated_date, delivery_date, notes, consume_parts
    } = req.body;
    if ((status === 'CONCLUIDA' || status === 'CONCLUIDA_PENDENTE') && (total_cost || 0) <= 0) {
        return res.status(400).json({ error: 'Para concluir, a OS deve ter um valor (Mão de obra ou Peças)' });
    }
    try {
        const { data: result, error } = await supabase
            .from('service_orders')
            .insert({
                number, client_name, client_phone, client_cpf, client_address,
                equipment, brand, model, serial_number, problem_description,
                service_description, technician, parts_used,
                labor_cost: labor_cost||0, parts_cost: parts_cost||0, 
                discount: discount||0, total_cost: total_cost||0, 
                status: status||'ABERTA', estimated_date: estimated_date || null, delivery_date: delivery_date || null, notes, 
                created_at: getLocalDate(), is_deleted: 0
            })
            .select()
            .single();

        if (error) throw error;
        
        if (consume_parts && consume_parts.length > 0) {
            for (const p of consume_parts) {
                const { data: prod } = await supabase.from('products').select('*').eq('id', p.product_id).single();
                if (prod) {
                    await supabase.from('products').update({ stock_quantity: Math.max(0, prod.stock_quantity - p.quantity) }).eq('id', p.product_id);
                    await supabase.from('inventory_movements').insert({
                        product_id: p.product_id,
                        type: 'SAIDA',
                        quantity: p.quantity,
                        unit_price: p.price,
                        total_price: p.quantity * p.price,
                        payment_method: null,
                        created_at: getLocalDate()
                    });
                }
            }
        }
        
        if (status === 'CONCLUIDA') {
            await createFinanceRecordForOS(result.id, 'PAID');
        } else if (status === 'CONCLUIDA_PENDENTE') {
            await createFinanceRecordForOS(result.id, 'PENDENTE');
        }

        res.status(201).json(result);
    } catch (err) {
        console.error("Error creating OS:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/service-orders/:id', async (req, res) => {
    const {
        client_name, client_phone, client_cpf, client_address,
        equipment, brand, model, serial_number, problem_description,
        service_description, technician, parts_used,
        labor_cost, parts_cost, discount, total_cost, status,
        estimated_date, delivery_date, notes, consume_parts
    } = req.body;
    if ((status === 'CONCLUIDA' || status === 'CONCLUIDA_PENDENTE') && (total_cost || 0) <= 0) {
        return res.status(400).json({ error: 'Para concluir, a OS deve ter um valor (Mão de obra ou Peças)' });
    }
    try {
        const { error } = await supabase
            .from('service_orders')
            .update({
                client_name, client_phone, client_cpf, client_address,
                equipment, brand, model, serial_number, problem_description,
                service_description, technician, parts_used,
                labor_cost: labor_cost||0, parts_cost: parts_cost||0, 
                discount: discount||0, total_cost: total_cost||0, 
                status, estimated_date: estimated_date || null, delivery_date: delivery_date || null, notes, 
                updated_at: getLocalDate()
            })
            .eq('id', req.params.id);

        if (error) throw error;

        if (consume_parts && consume_parts.length > 0) {
            for (const p of consume_parts) {
                const { data: prod } = await supabase.from('products').select('*').eq('id', p.product_id).single();
                if (prod) {
                    await supabase.from('products').update({ stock_quantity: Math.max(0, prod.stock_quantity - p.quantity) }).eq('id', p.product_id);
                    await supabase.from('inventory_movements').insert({
                        product_id: p.product_id,
                        type: 'SAIDA',
                        quantity: p.quantity,
                        unit_price: p.price,
                        total_price: p.quantity * p.price,
                        payment_method: null,
                        created_at: getLocalDate()
                    });
                }
            }
        }

        if (status === 'CONCLUIDA') {
            await createFinanceRecordForOS(req.params.id, 'PAID');
        } else if (status === 'CONCLUIDA_PENDENTE') {
            await createFinanceRecordForOS(req.params.id, 'PENDENTE');
        }

        const { data: rows } = await supabase.from('service_orders').select('*').eq('id', req.params.id).single();
        res.json(rows);
    } catch (err) {
        console.error("Error updating OS:", err);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/service-orders/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        if (status === 'CONCLUIDA' || status === 'CONCLUIDA_PENDENTE') {
            const { data: rows } = await supabase.from('service_orders').select('total_cost').eq('id', req.params.id).maybeSingle();
            if (rows && rows.total_cost <= 0) {
                return res.status(400).json({ error: 'Para concluir, a OS deve ter um valor (Mão de obra ou Peças)' });
            }
        }
        await supabase.from('service_orders').update({ status, updated_at: getLocalDate() }).eq('id', req.params.id);

        if (status === 'CONCLUIDA') {
            await createFinanceRecordForOS(req.params.id, 'PAID');
        } else if (status === 'CONCLUIDA_PENDENTE') {
            await createFinanceRecordForOS(req.params.id, 'PENDENTE');
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Error patching OS status:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/service-orders/:id', async (req, res) => {
    try {
        await supabase.from('service_orders').update({ is_deleted: 1 }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- QUOTES (ORÇAMENTOS) ---
app.get('/quotes', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('quotes')
            .select('*')
            .eq('is_deleted', 0)
            .order('created_at', { ascending: false });
        if (error) throw error;

        res.json(rows.map(q => ({
            ...q,
            clientName: q.client_name,
            items: typeof q.items === 'string' ? JSON.parse(q.items) : q.items,
            createdAt: q.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/quotes', async (req, res) => {
    const { id, clientName, items, total, status, createdAt } = req.body;
    try {
         const { error } = await supabase
            .from('quotes')
            .insert({
                id, client_name: clientName, items: JSON.stringify(items), 
                total, status: status || 'OPEN', 
                created_at: createdAt || getLocalDate(),
                is_deleted: 0
            });
        if (error) throw error;
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/quotes/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await supabase.from('quotes').update({ status }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/quotes/:id', async (req, res) => {
    try {
        await supabase.from('quotes').update({ is_deleted: 1 }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CLIENTS ---
app.get('/clients', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('clients')
            .select('*')
            .eq('is_deleted', 0)
            .order('name');
        if (error) throw error;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/clients', async (req, res) => {
    const { name, cpf_cnpj, email, phone, address } = req.body;
    try {
        const { data: result, error } = await supabase
            .from('clients')
            .insert({ name, cpf_cnpj, email, phone, address, is_deleted: 0 })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/clients/:id', async (req, res) => {
    const { name, cpf_cnpj, email, phone, address } = req.body;
    try {
        await supabase.from('clients').update({ name, cpf_cnpj, email, phone, address }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/clients/:id', async (req, res) => {
    try {
        await supabase.from('clients').update({ is_deleted: 1 }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SUPPLIERS ---
app.get('/suppliers', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('is_deleted', 0)
            .order('name');
        if (error) throw error;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/suppliers', async (req, res) => {
    const { name, cnpj, email, phone, address } = req.body;
    try {
        const { data: result, error } = await supabase
            .from('suppliers')
            .insert({ name, cnpj, email, phone, address, is_deleted: 0 })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/suppliers/:id', async (req, res) => {
    const { name, cnpj, email, phone, address } = req.body;
    try {
        await supabase.from('suppliers').update({ name, cnpj, email, phone, address }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/suppliers/:id', async (req, res) => {
    try {
        await supabase.from('suppliers').update({ is_deleted: 1 }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MATERIAL SHIPMENTS ---
app.get('/shipments', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('material_shipments')
            .select('*')
            .eq('is_deleted', 0)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(rows.map(r => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/shipments', async (req, res) => {
    const { id, client_id, client_name, items, total, notes, isLoan } = req.body;
    try {
        const finalNotes = isLoan ? `[EMPRÉSTIMO PENDENTE] ${notes || ''}`.trim() : notes;
        const { error: errShip } = await supabase
            .from('material_shipments')
            .insert({
                id, client_id, client_name, notes: finalNotes, total,
                items: JSON.stringify(items), 
                created_at: getLocalDate(),
                is_deleted: 0
            });
        if (errShip) throw errShip;

        for (const item of items) {
             const { data: pData } = await supabase.from('products').select('stock_quantity').eq('id', item.productId || item.id).single();
             if (pData) {
                await supabase.from('products').update({ stock_quantity: pData.stock_quantity - item.quantity }).eq('id', item.productId || item.id);
             }

             await supabase.from('transactions').insert({
                id: `${id}-${item.productId || item.id}`,
                product_id: item.productId || item.id,
                product_name: item.name,
                type: 'OUT',
                quantity: item.quantity,
                unit_price: item.costPrice || item.salePrice || 0,
                total: (item.quantity * (item.costPrice || item.salePrice || 0)),
                payment_method: 'EXPEDIÇÃO',
                client_name: client_name,
                created_at: getLocalDate(),
                is_deleted: 0
             });
        }
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/shipments/:id/return', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: rows } = await supabase.from('material_shipments').select('*').eq('id', id).single();
        
        if (rows) {
            if (rows.notes && rows.notes.includes('[DEVOLVIDO]')) {
                return res.status(400).json({ error: 'Este empréstimo já foi devolvido.' });
            }

            const items = typeof rows.items === 'string' ? JSON.parse(rows.items) : rows.items;
            for (const item of items) {
                const { data: pData } = await supabase.from('products').select('stock_quantity').eq('id', item.productId || item.id).single();
                if (pData) {
                    await supabase.from('products').update({ stock_quantity: pData.stock_quantity + item.quantity }).eq('id', item.productId || item.id);
                }
                const txId = `${id}-${item.productId || item.id}`;
                await supabase.from('transactions').update({ is_deleted: 1 }).eq('id', txId);
            }

            const newNotes = rows.notes ? rows.notes.replace('[EMPRÉSTIMO PENDENTE]', '[DEVOLVIDO]') : '[DEVOLVIDO]';
            await supabase.from('material_shipments').update({ notes: newNotes }).eq('id', id);
            
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Registro não encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/shipments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: rows } = await supabase.from('material_shipments').select('*').eq('id', id).single();
        
        if (rows) {
            const items = typeof rows.items === 'string' ? JSON.parse(rows.items) : rows.items;
            for (const item of items) {
                const { data: pData } = await supabase.from('products').select('stock_quantity').eq('id', item.productId || item.id).single();
                if (pData) {
                    await supabase.from('products').update({ stock_quantity: pData.stock_quantity + item.quantity }).eq('id', item.productId || item.id);
                }
                await supabase.from('transactions').update({ is_deleted: 1 }).eq('id', `${id}-${item.productId || item.id}`);
            }
        }
        await supabase.from('material_shipments').update({ is_deleted: 1 }).eq('id', id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CLIENT MOVEMENT REPORT ---
app.get('/reports/client-movement', async (req, res) => {
    const { clientName, startDate, endDate } = req.query;
    if (!clientName) return res.status(400).json({ error: 'Client name required' });

    try {
        let qSales = supabase.from('transactions').select('id, product_name, quantity, total, created_at, type, payment_method, unit_price').ilike('client_name', clientName.trim()).eq('type', 'SALE').eq('is_deleted', 0);
        let qShipments = supabase.from('material_shipments').select('id, notes, total, created_at, items').ilike('client_name', clientName.trim()).eq('is_deleted', 0);
        let qOS = supabase.from('service_orders').select('number, equipment, problem_description, service_description, technician, parts_used, labor_cost, parts_cost, total_cost, status, created_at').ilike('client_name', clientName.trim()).eq('is_deleted', 0);

        if (startDate && endDate) {
            const start = `${startDate}T00:00:00`;
            const end = `${endDate}T23:59:59`;
            qSales = qSales.gte('created_at', start).lte('created_at', end);
            qShipments = qShipments.gte('created_at', start).lte('created_at', end);
            qOS = qOS.gte('created_at', start).lte('created_at', end);
        }

        const [{ data: transactions }, { data: shipments }, { data: os }] = await Promise.all([
            qSales.order('created_at', { ascending: false }),
            qShipments.order('created_at', { ascending: false }),
            qOS.order('created_at', { ascending: false })
        ]);

        // Filtrar e mapear os resultados
        const salesMapped = (transactions || []).map(s => ({
            ...s,
            source: 'VENDA',
            details: { ...s }
        }));

        const shipmentsMapped = (shipments || []).map(s => ({
            ...s,
            source: 'EXPEDIÇÃO',
            product_name: `Saída Material: ${s.notes ? s.notes.substring(0, 30) + '...' : 'N/A'}`,
            quantity: 1,
            details: {
                items: typeof s.items === 'string' ? JSON.parse(s.items) : s.items,
                notes: s.notes
            }
        }));

        const osMapped = (os || []).map(o => ({
            ...o,
            source: 'OS',
            id: `OS-${o.number}`,
            product_name: `${o.equipment} - ${o.service_description || o.problem_description || 'N/A'}`,
            quantity: 1,
            total: o.total_cost,
            details: { ...o }
        }));

        const merged = [...salesMapped, ...shipmentsMapped, ...osMapped].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        res.json(merged);
    } catch (err) {
        console.error("Error generating client report:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});


