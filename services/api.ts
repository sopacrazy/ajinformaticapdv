import { Product, Transaction, FinanceRecord, StoreSettings, User } from '../types';

const API_URL = `http://${window.location.hostname}:3001`;

export const api = {
    // ... (rest of the api methods remain the same)
    // Products
    getProducts: async (): Promise<Product[]> => {
        const res = await fetch(`${API_URL}/products`);
        return res.json();
    },
    saveProduct: async (product: Partial<Product>) => {
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
        });
        return res.json();
    },
    updateProduct: async (id: string, product: Partial<Product>) => {
        const res = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
        });
        return res.json();
    },
    deleteProduct: async (id: string) => {
        await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    },

    // Transactions (Sales)
    getTransactions: async (today?: boolean, startDate?: string, endDate?: string): Promise<Transaction[]> => {
        let url = `${API_URL}/transactions`;
        const params = new URLSearchParams();
        if (today) params.append('today', 'true');
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        if (params.toString()) url += `?${params.toString()}`;
        
        const res = await fetch(url);
        return res.json();
    },
    getTodaySales: async (): Promise<Transaction[]> => {
        return api.getTransactions(true);
    },
    getSalesByPeriod: async (startDate: string, endDate: string): Promise<Transaction[]> => {
        return api.getTransactions(false, startDate, endDate);
    },
    addTransaction: async (tx: Transaction | Transaction[]) => {
        await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx),
        });
    },
    getTransactionsBySale: async (saleId: string): Promise<Transaction[]> => {
        const res = await fetch(`${API_URL}/transactions/sale/${saleId}`);
        return res.json();
    },
    getNextSaleNumber: async (): Promise<{nextNumber: string}> => {
        const res = await fetch(`${API_URL}/transactions/next-number`);
        return res.json();
    },
    updateSale: async (id: string, data: { clientName: string, paymentMethod: string, createdAt: string, items: Transaction[], installments?: number, interval?: number }) => {
        const res = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    // Finance
    getFinance: async (): Promise<FinanceRecord[]> => {
        const res = await fetch(`${API_URL}/finance`);
        return res.json();
    },
    addFinance: async (record: FinanceRecord) => {
        await fetch(`${API_URL}/finance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
        });
    },
    updateFinanceStatus: async (id: string, status: string) => {
        await fetch(`${API_URL}/finance/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
    },
    updateFinanceCategory: async (id: string, category: string) => {
        const res = await fetch(`${API_URL}/finance/${id}/category`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category }),
        });
        if (!res.ok) throw new Error('Falha ao atualizar categoria financeira');
    },
    deleteFinance: async (id: string) => {
        await fetch(`${API_URL}/finance/${id}`, {
            method: 'DELETE',
        });
    },

    // Settings
    getSettings: async (): Promise<StoreSettings> => {
        const res = await fetch(`${API_URL}/settings`);
        return res.json();
    },
    saveSettings: async (settings: StoreSettings) => {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        if (!res.ok) throw new Error('Falha ao salvar configurações');
        window.dispatchEvent(new Event('settings-updated'));
    },

    // Auth
    login: async (username, password): Promise<{ success: boolean, user: User }> => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) throw new Error('Falha no login');
        return res.json();
    },
    updatePassword: async (oldPassword, newPassword, username?: string) => {
        const res = await fetch(`${API_URL}/users/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword, username }),
        });
        if (!res.ok) throw new Error('Falha ao atualizar senha');
        return res.json();
    },

    // User Management
    getUsers: async (): Promise<User[]> => {
        const res = await fetch(`${API_URL}/users`);
        return res.json();
    },
    saveUser: async (user: Partial<User>) => {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        return res.json();
    },
    updateUser: async (id: number, user: Partial<User>) => {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        return res.json();
    },
    deleteUser: async (id: number) => {
        const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // Maintenance
    fixOrphans: async () => {
        const res = await fetch(`${API_URL}/maintenance/fix-orphans`, {
            method: 'POST'
        });
        if (!res.ok) throw new Error('Falha na manutenção');
        return res.json();
    },

    // Categories
    getCategories: async (): Promise<{id: number, name: string}[]> => {
        const res = await fetch(`${API_URL}/categories`);
        return res.json();
    },
    addCategory: async (name: string) => {
        const res = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        return res.json();
    },
    deleteCategory: async (id: number) => {
        await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
    },

    // Orçamentos (Quotes)
    getQuotes: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/quotes`);
        return res.json();
    },
    addQuote: async (quote: any) => {
        await fetch(`${API_URL}/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quote),
        });
    },
    updateQuoteStatus: async (id: string, status: string) => {
        await fetch(`${API_URL}/quotes/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
    },
    deleteQuote: async (id: string) => {
        await fetch(`${API_URL}/quotes/${id}`, { method: 'DELETE' });
    },
    getServiceOrders: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/service-orders`);
        return res.json();
    },
    getNextOSNumber: async (): Promise<{nextNumber: string}> => {
        const res = await fetch(`${API_URL}/service-orders/next-number`);
        return res.json();
    },
    updateOSStatus: async (id: number | string, status: string) => {
        const res = await fetch(`${API_URL}/service-orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        return res.json();
    },

    // Clients
    getClients: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/clients`);
        return res.json();
    },
    saveClient: async (client: any) => {
        const res = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client),
        });
        return res.json();
    },
    updateClient: async (id: number, client: any) => {
        const res = await fetch(`${API_URL}/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client),
        });
        return res.json();
    },
    deleteClient: async (id: number) => {
        await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
    },

    // Suppliers
    getSuppliers: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/suppliers`);
        return res.json();
    },
    saveSupplier: async (supplier: any) => {
        const res = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplier),
        });
        return res.json();
    },
    updateSupplier: async (id: number, supplier: any) => {
        const res = await fetch(`${API_URL}/suppliers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplier),
        });
        return res.json();
    },
    deleteSupplier: async (id: number) => {
        await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE' });
    },

    // Shipments (Saídas)
    getShipments: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/shipments`);
        return res.json();
    },
    addShipment: async (shipment: any) => {
        const res = await fetch(`${API_URL}/shipments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shipment),
        });
        return res.json();
    },
    deleteShipment: async (id: string) => {
        const res = await fetch(`${API_URL}/shipments/${id}`, { method: 'DELETE' });
        return res.json();
    },
    returnShipment: async (id: string) => {
        const res = await fetch(`${API_URL}/shipments/${id}/return`, { method: 'PUT' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Falha ao devolver empréstimo');
        }
        return res.json();
    },

    // Backup
    getBackupStatus: async (): Promise<{isBackupEnabled: boolean}> => {
        const res = await fetch(`${API_URL}/backup/status`);
        return res.json();
    },
    toggleBackup: async (enabled: boolean) => {
        const res = await fetch(`${API_URL}/backup/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
        });
        return res.json();
    },
    runBackup: async () => {
        const res = await fetch(`${API_URL}/backup/run`, {
            method: 'POST'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Falha ao executar backup');
        }
        return res.json();
    }
};
