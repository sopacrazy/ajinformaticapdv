
import { Product, Transaction, FinanceRecord, TransactionType, PaymentMethod, FinanceType, FinanceStatus, StoreSettings } from '../types';

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Coca-Cola 2L', barcode: '7891234567890', costPrice: 6.50, salePrice: 9.90, stock: 24, category: 'Bebidas' },
  { id: '2', name: 'Arroz 5kg', barcode: '7891234567891', costPrice: 18.00, salePrice: 24.90, stock: 15, category: 'Mantimentos' },
  { id: '3', name: 'Sabão em Pó 1kg', barcode: '7891234567892', costPrice: 12.00, salePrice: 16.50, stock: 5, category: 'Limpeza' },
];

const STORAGE_KEYS = {
  PRODUCTS: 'erp_products',
  TRANSACTIONS: 'erp_transactions',
  FINANCE: 'erp_finance',
  SETTINGS: 'erp_settings',
};

export const mockDb = {
  getProducts: (): Product[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
  },
  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },
  getTransactions: (): Transaction[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
  },
  addTransaction: (tx: Transaction) => {
    const txs = mockDb.getTransactions();
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([tx, ...txs]));
    
    const products = mockDb.getProducts();
    const productIdx = products.findIndex(p => p.id === tx.productId);
    if (productIdx !== -1) {
      if (tx.type === TransactionType.SALE || tx.type === TransactionType.OUT) {
        products[productIdx].stock -= tx.quantity;
      } else {
        products[productIdx].stock += tx.quantity;
      }
      mockDb.saveProducts(products);
    }

    if (tx.type === TransactionType.SALE) {
      mockDb.addFinance({
        id: Math.random().toString(36).substr(2, 9),
        type: FinanceType.RECEIVABLE,
        description: `Venda #${tx.id.substr(0, 5)} - ${tx.productName}`,
        amount: tx.total,
        status: FinanceStatus.PAID,
        dueDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        paymentMethod: tx.paymentMethod,
        transactionId: tx.id,
      });
    }
  },
  getFinance: (): FinanceRecord[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.FINANCE);
    return stored ? JSON.parse(stored) : [];
  },
  addFinance: (record: FinanceRecord) => {
    const records = mockDb.getFinance();
    localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify([record, ...records]));
  },
  updateFinanceStatus: (id: string, status: FinanceStatus) => {
    const records = mockDb.getFinance();
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx].status = status;
      localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(records));
    }
  },
  deleteProduct: (id: string) => {
    const products = mockDb.getProducts().filter(p => p.id !== id);
    mockDb.saveProducts(products);
  },
  getSettings: (): StoreSettings => {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : { companyName: 'MicroERP Varejo', logoUrl: '' };
  },
  saveSettings: (settings: StoreSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new Event('settings-updated'));
  }
};
