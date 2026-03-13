
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  SALE = 'SALE'
}

export enum PaymentMethod {
  CASH = 'DINHEIRO',
  PIX = 'PIX',
  CARD = 'CARTÃO'
}

export enum FinanceType {
  PAYABLE = 'PAYABLE',
  RECEIVABLE = 'RECEIVABLE'
}

export enum FinanceStatus {
  PENDING = 'PENDENTE', // DB schema says 'PENDENTE' matches
  PAID = 'PAID'
}

export interface StoreSettings {
  companyName: string;
  logoUrl: string;
  pixKey?: string;
  pixFavorecido?: string;
  signatureName?: string;
  cnpj?: string;
  inscEst?: string;
  phone?: string;
  email?: string;
  address?: string;
  lastBackupAt?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  category: string;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod?: PaymentMethod;
  clientName?: string;
  createdAt: string;
}

export interface FinanceRecord {
  id: string;
  type: FinanceType;
  description: string;
  amount: number;
  status: FinanceStatus;
  dueDate: string;
  createdAt: string;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
}

export interface DashboardStats {
  todaySales: number;
  totalCash: number;
  lowStockItems: number;
  pendingPayables: number;
}

export interface Permissions {
  dashboard: boolean;
  pdv: boolean;
  sales: boolean;
  inventory: boolean;
  clients: boolean;
  suppliers: boolean;
  materialShipment: boolean;
  finance: boolean;
  serviceOrders: boolean;
  reports: boolean;
  settings: boolean;
  manageUsers: boolean;
}

export interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'OPERATOR';
  permissions: Permissions;
  password?: string; // Optional for creation/edit
}
