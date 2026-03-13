const express = require('express');
const router = express.Router();
const db = require('./db'); // Assuming a database connection module

// A) Relatório de Vendas
// GET /reports/sales?start=2024-01-01&end=2024-01-31
router.get('/reports/sales', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    // Using parameterized query for security
    const query = `
      SELECT 
        id, 
        created_at, 
        product_name, 
        total, 
        payment_method,
        quantity 
      FROM transactions 
      WHERE type = 'SALE' 
      AND created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
    `;
    
    const [rows] = await db.query(query, [`${start} 00:00:00`, `${end} 23:59:59`]);
    
    // Aggregation logic can be done in SQL too for better performance on large datasets:
    /*
      SELECT 
        COUNT(*) as total_sales, 
        SUM(total) as revenue 
      FROM transactions ...
    */

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// B) Relatório Financeiro
// GET /reports/financial?start=2024-01-01&end=2024-01-31
router.get('/reports/financial', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    const query = `
      SELECT 
        id, 
        due_date, 
        description, 
        amount, 
        type, 
        status 
      FROM finance_records 
      WHERE status = 'PAID'
      AND due_date BETWEEN ? AND ?
      ORDER BY due_date ASC
    `;
    
    const [rows] = await db.query(query, [start, end]);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// C) Relatório de Estoque (Snapshot)
// GET /reports/inventory
router.get('/reports/inventory', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        name, 
        category, 
        cost_price, 
        sale_price, 
        stock 
      FROM products 
      ORDER BY name ASC
    `;
    
    const [rows] = await db.query(query);
    
    // Optional: Metadata for totals
    const totalCost = rows.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
    const totalSale = rows.reduce((sum, p) => sum + (p.salePrice * p.stock), 0);

    res.json({
      products: rows,
      meta: {
        totalCost,
        totalSale
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
