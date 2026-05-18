const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

const pool = mysql.createPool(config);

/**
 * Minimal Supabase-like shim for MySQL
 */
class SupabaseShim {
    constructor(table) {
        this.table = table;
        this.conditions = [];
        this.params = [];
        this.orderCol = null;
        this.orderOptions = { ascending: true };
        this.limitVal = null;
        this.singleMode = false;
        this.operation = 'SELECT';
        this.payload = null;
    }

    from(table) {
        return new SupabaseShim(table);
    }

    select(cols = '*') {
        if (this.operation === 'SELECT') {
            this.selectCols = cols;
        } else {
            // If we are doing INSERT/UPDATE/DELETE, select() just means we want the result
            // which our shim already does by default. We just store the cols for reference.
            this.selectCols = cols;
        }
        return this;
    }

    insert(data) {
        this.operation = 'INSERT';
        this.payload = data;
        return this;
    }

    update(data) {
        this.operation = 'UPDATE';
        this.payload = data;
        return this;
    }

    delete() {
        this.operation = 'DELETE';
        return this;
    }

    eq(col, val) {
        if (col === 'is_deleted') {
            if (val === 0) {
                // Active records: null, '0', or empty string
                // We use '0' as string to avoid MySQL converting '*' to 0
                this.conditions.push(`(${col} IS NULL OR ${col} = '0' OR ${col} = '')`);
            } else if (val === 1) {
                // Deleted records: '1' or '*'
                this.conditions.push(`(${col} = '1' OR ${col} = '*')`);
            } else {
                this.conditions.push(`${col} = ?`);
                this.params.push(val);
            }
        } else {
            this.conditions.push(`${col} = ?`);
            this.params.push(val);
        }
        return this;
    }

    neq(col, val) {
        this.conditions.push(`${col} != ?`);
        this.params.push(val);
        return this;
    }

    lt(col, val) {
        this.conditions.push(`${col} < ?`);
        this.params.push(val);
        return this;
    }

    lte(col, val) {
        this.conditions.push(`${col} <= ?`);
        this.params.push(val);
        return this;
    }

    gt(col, val) {
        this.conditions.push(`${col} > ?`);
        this.params.push(val);
        return this;
    }

    gte(col, val) {
        this.conditions.push(`${col} >= ?`);
        this.params.push(val);
        return this;
    }

    ilike(col, pattern) {
        // MySQL uses LIKE (usually case-insensitive by default with utf8_general_ci)
        this.conditions.push(`${col} LIKE ?`);
        this.params.push(pattern.replace(/\*/g, '%').replace(/%/g, '%'));
        return this;
    }

    not(col, op, val) {
        if (op.toLowerCase() === 'is' && val === null) {
            this.conditions.push(`${col} IS NOT NULL`);
        } else {
            this.conditions.push(`${col} != ?`);
            this.params.push(val);
        }
        return this;
    }

    order(col, { ascending = true } = {}) {
        this.orderCol = col;
        this.orderOptions.ascending = ascending;
        return this;
    }

    limit(n) {
        this.limitVal = n;
        return this;
    }

    single() {
        this.singleMode = true;
        this.limitVal = 1;
        return this;
    }

    maybeSingle() {
        this.singleMode = true;
        this.limitVal = 1;
        return this;
    }

    then(resolve, reject) {
        const execute = async (retries = 2) => {
            try {
                let sql = '';
                let finalParams = [];

                const formatForMySQL = (val, colName) => {
                    // List of columns that should never be auto-formatted as dates even if they look like one
                    const nonDateCols = ['name', 'product_name', 'client_name', 'description', 'category', 'barcode', 'id', 'internal_id', 'payment_method'];
                    if (colName && nonDateCols.includes(colName.toLowerCase())) {
                        return val;
                    }

                    // Only treat as date if it's an actual Date object or an ISO string that looks like a date
                    const isIsoDate = typeof val === 'string' && 
                        (val.includes('T') || val.includes('Z')) && 
                        /^\d{4}-\d{2}-\d{2}/.test(val);

                    if (val instanceof Date || isIsoDate) {
                        const date = new Date(val);
                        if (!isNaN(date.getTime())) {
                            if (colName && (colName.includes('due_date') || colName.includes('delivery_date') || colName.includes('estimated_date'))) {
                                return date.toISOString().split('T')[0];
                            }
                            const pad = (n) => n.toString().padStart(2, '0');
                            return date.getFullYear() + '-' +
                                pad(date.getMonth() + 1) + '-' +
                                pad(date.getDate()) + ' ' +
                                pad(date.getHours()) + ':' +
                                pad(date.getMinutes()) + ':' +
                                pad(date.getSeconds());
                        }
                    }
                    return val;
                };

                const castNumeric = (obj) => {
                    if (!obj || typeof obj !== 'object') return obj;
                    if (Array.isArray(obj)) return obj.map(o => castNumeric(o));
                    const numericPatterns = ['price', 'cost', 'total', 'amount', 'quantity', 'stock', 'discount'];
                    const newObj = { ...obj };
                    for (const key in newObj) {
                        const lowerKey = key.toLowerCase();
                        if (numericPatterns.some(p => lowerKey.includes(p))) {
                            if (newObj[key] !== null && typeof newObj[key] === 'string' && !isNaN(newObj[key]) && newObj[key] !== '') {
                                newObj[key] = Number(newObj[key]);
                            }
                        }
                    }
                    return newObj;
                };

                if (this.operation === 'SELECT') {
                    const cols = this.selectCols === '*' ? '*' : this.selectCols;
                    sql = `SELECT ${cols} FROM ${this.table}`;
                    if (this.conditions.length > 0) sql += ` WHERE ${this.conditions.join(' AND ')}`;
                    if (this.orderCol) sql += ` ORDER BY ${this.orderCol} ${this.orderOptions.ascending ? 'ASC' : 'DESC'}`;
                    if (this.limitVal) sql += ` LIMIT ${this.limitVal}`;
                    finalParams = this.params;
                } else if (this.operation === 'INSERT') {
                    const cols = Object.keys(this.payload);
                    const vals = Object.values(this.payload).map((v, i) => formatForMySQL(v, cols[i]));
                    sql = `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
                    finalParams = vals;
                } else if (this.operation === 'UPDATE') {
                    const cols = Object.keys(this.payload);
                    const vals = Object.values(this.payload).map((v, i) => formatForMySQL(v, cols[i]));
                    sql = `UPDATE ${this.table} SET ${cols.map(c => `${c} = ?`).join(', ')}`;
                    if (this.conditions.length > 0) sql += ` WHERE ${this.conditions.join(' AND ')}`;
                    finalParams = [...vals, ...this.params];
                } else if (this.operation === 'DELETE') {
                    sql = `DELETE FROM ${this.table}`;
                    if (this.conditions.length > 0) sql += ` WHERE ${this.conditions.join(' AND ')}`;
                    finalParams = this.params;
                }

                const [rows] = await pool.query(sql, finalParams);
                let data = rows;
                if (this.operation === 'INSERT') {
                    data = { id: rows.insertId, ...this.payload };
                } else if (this.operation === 'UPDATE') {
                    data = { ...this.payload };
                } else if (this.singleMode) {
                    data = (rows && rows.length > 0) ? rows[0] : null;
                }

                resolve({ data: castNumeric(data), error: null });
            } catch (error) {
                if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST')) {
                    console.warn(`[MySQL Shim] Retrying query after ${error.code}... (${retries} left)`);
                    return execute(retries - 1);
                }
                console.error('[MySQL Shim Error]', error.message, '| Table:', this.table);
                resolve({ data: null, error });
            }
        };
        execute();
    }
}

const db = {
    supabase: new SupabaseShim(),
    pool,
    query: async (sql, params) => {
        const [results] = await pool.query(sql, params);
        return [results, null];
    }
};

module.exports = db;
