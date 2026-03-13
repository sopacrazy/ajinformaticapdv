const db = require('./db.cjs');

async function testConnection() {
  console.log('--- INICIANDO TESTE DO BANCO DE DADOS (SQLite) ---');

  try {
    // 1. Inserir um Produto de Teste
    console.log('1. Tentando inserir produto...');
    const insertQuery = `
      INSERT INTO products (name, barcode, cost_price, sale_price, stock_quantity) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const productData = ['Produto Teste SQLite', '123456789', 10.50, 20.00, 100];
    
    // Using the promise wrapper we created in db.js
    const [result] = await db.query(insertQuery, productData);
    console.log('✅ Produto inserido com sucesso! ID:', result.insertId);

    // 2. Consultar o Produto Inserido
    console.log('2. Consultando produto para verificar persistência...');
    const selectQuery = `SELECT * FROM products WHERE id = ?`;
    const [rows] = await db.query(selectQuery, [result.insertId]);
    
    if (rows.length > 0) {
      console.log('✅ Dados recuperados do arquivo loja.db:');
      console.table(rows);
    } else {
      console.error('❌ ERRO: Produto não encontrado após inserção.');
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
  } finally {
    console.log('--- FIM DO TESTE ---');
  }
}

// Aguarda 1 segundo para garantir que a conexão e tabelas (initDb) foram criadas
setTimeout(testConnection, 1000);
