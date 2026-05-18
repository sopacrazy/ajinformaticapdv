
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Calendar, Filter, Printer, FileText, Download, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

import { TransactionType, FinanceType, Product, Transaction, FinanceRecord, FinanceStatus } from '../types';

import { api } from '../services/api';
import { formatLocalDate, formatLocalTime, getTodayStr } from '../services/dateUtils';

const API_URL = `http://${window.location.hostname}:3001`;

const DetailRow: React.FC<{ label: string, value: string, isLong?: boolean, isHighlight?: boolean }> = ({ label, value, isLong, isHighlight }) => (
  <div className={`flex ${isLong ? 'flex-col gap-1 items-start' : 'justify-between items-center'} pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0`}>
     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
     <span className={`text-sm ${isHighlight ? 'font-black text-indigo-600 text-lg' : 'font-bold text-slate-800 dark:text-slate-200'} ${isLong ? 'text-xs whitespace-pre-wrap' : 'text-right'}`}>{value}</span>
  </div>
);

const SummaryBox: React.FC<{ title: string, value: string, color?: string, bg?: string }> = ({ title, value, color, bg }) => (
  <div className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-700 print:border-black ${bg || 'bg-white dark:bg-slate-800'}`}>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-gray-500">{title}</p>
    <p className={`text-2xl font-black ${color || 'text-slate-900 dark:text-white'} print:text-black`}>{value}</p>
  </div>
);


const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<'SALES' | 'FINANCE' | 'INVENTORY' | 'CLIENT' | 'EXPENSE_CATEGORY'>('SALES');
  const [selectedClient, setSelectedClient] = useState('');
  const [clientMovement, setClientMovement] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'info' } | null>(null);
  const [detailsModal, setDetailsModal] = useState<{show: boolean, data: any} | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [inventoryFilter, setInventoryFilter] = useState<'ALL' | 'LOW'>('ALL');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('ALL');
  const [showCost, setShowCost] = useState(true);
  const [showCostInClientReport, setShowCostInClientReport] = useState(false);


  const showToast = (msg: string, type: 'ok' | 'err' | 'info' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  // Helper para pegar a data local correta
  // getLocalDateStr removed, using getTodayStr

  // Default start date to the first day of the current month
  const [startDate, setStartDate] = useState(() => {
    const today = getTodayStr();
    const [year, month] = today.split('-').map(Number);
    return `${year}-${month.toString().padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(getTodayStr());

  const handlePrint = () => {
    window.print();
  };
  
  // Real data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Load data when report type changes (or on mount/dates change)
  useEffect(() => {
    if (reportType === 'SALES') {
      api.getTransactions(false, startDate, endDate).then(setTransactions);
    } else if (reportType === 'FINANCE' || reportType === 'EXPENSE_CATEGORY') {
      api.getFinance().then(setFinanceRecords);
    } else if (reportType === 'INVENTORY') {
      api.getTransactions(false, startDate, endDate).then(setTransactions);
      api.getProducts().then(setProducts);
    }
    
    if (clients.length === 0) {
      api.getClients().then(setClients);
    }
    fetch(`${API_URL}/settings`).then(r => r.json()).then(setSettings).catch(console.error);
  }, [reportType, startDate, endDate]);


  useEffect(() => {
    if (reportType === 'CLIENT' && selectedClient) {
        fetch(`${API_URL}/reports/client-movement?clientName=${encodeURIComponent(selectedClient)}&startDate=${startDate}&endDate=${endDate}`)
            .then(r => r.json())
            .then(setClientMovement)
            .catch(err => {
              console.error(err);
              showToast('Erro ao carregar movimentação', 'err');
            });
    } else {
        setClientMovement([]);
    }
  }, [reportType, selectedClient, startDate, endDate]);

  const salesData = useMemo(() => {
    if (reportType !== 'SALES') return null;
    const txs = transactions.filter(t => {
      const date = t.createdAt.split('T')[0];
      return t.type === TransactionType.SALE && date >= startDate && date <= endDate;
    });

    const totalSales = txs.length;
    const totalRevenue = txs.reduce((sum, t) => sum + Number(t.total || 0), 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    const byMethod = txs.reduce((acc, t) => {
      const method = t.paymentMethod || 'OUTROS';
      acc[method] = (acc[method] || 0) + Number(t.total || 0);
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(byMethod).map(([name, value]) => ({ name, value }));

    return { txs, totalSales, totalRevenue, avgTicket, chartData };
  }, [transactions, reportType, startDate, endDate]);

  const financeData = useMemo(() => {
    if (reportType !== 'FINANCE') return null;
    const records = financeRecords.filter(r => {
      const date = r.dueDate.split('T')[0];
      return date >= startDate && date <= endDate && r.status === FinanceStatus.PAID;
    });

    const income = records.filter(r => r.type === FinanceType.RECEIVABLE).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const expense = records.filter(r => r.type === FinanceType.PAYABLE).reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return { records, income, expense, balance: income - expense };
  }, [financeRecords, reportType, startDate, endDate]);

  const expenseCategoryData = useMemo(() => {
    if (reportType !== 'EXPENSE_CATEGORY') return null;
    const allRecords = financeRecords.filter(r => {
      const date = r.dueDate.split('T')[0];
      return date >= startDate && date <= endDate && r.type === FinanceType.PAYABLE && r.status === FinanceStatus.PAID;
    });

    const uniqueCategories = Array.from(new Set(financeRecords.filter(r => r.type === FinanceType.PAYABLE).map(r => (r.category || 'Não categorizado').toUpperCase()))).sort();

    const records = expenseCategoryFilter === 'ALL'
        ? allRecords
        : allRecords.filter(r => (r.category || 'Não categorizado').toUpperCase() === expenseCategoryFilter.toUpperCase());

    const totalExpense = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    
    // Gráfico e resumo agrupam com base nos registros filtrados
    const byCategory = records.reduce((acc, r) => {
      const cat = (r.category || 'NÃO CATEGORIZADO').toUpperCase();
      acc[cat] = (acc[cat] || 0) + Number(r.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const grouped = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const transactionCount = records.length;
    const avgTicket = transactionCount > 0 ? totalExpense / transactionCount : 0;

    return { records, totalExpense, grouped, uniqueCategories, transactionCount, avgTicket };
  }, [financeRecords, reportType, startDate, endDate, expenseCategoryFilter]);

  const handleUpdateCategory = async (id: string, newCategory: string) => {
      try {
          await api.updateFinanceCategory(id, newCategory);
          showToast('Categoria atualizada com sucesso', 'ok');
          setFinanceRecords(prev => prev.map(r => r.id === id ? { ...r, category: newCategory } : r));
      } catch (err) {
          showToast('Erro ao atualizar categoria', 'err');
      }
  };

  const inventoryData = useMemo(() => {
    if (reportType !== 'INVENTORY') return null;
    
    // Calculate total outputs (SALES + OUT) for each product
    let filteredProducts = products;
    if (inventoryFilter === 'LOW') {
      filteredProducts = products.filter(p => p.stock <= (p.minStock || 5));
    }

    const productStats = filteredProducts.map(p => {
      const soldQty = transactions
        .filter(t => t.productId === p.id && (t.type === TransactionType.SALE || t.type === TransactionType.OUT))
        .reduce((sum, t) => sum + t.quantity, 0);
      
      return { ...p, soldQty };
    });

    const totalCost = products.reduce((sum, p) => sum + (Number(p.costPrice || 0) * p.stock), 0);
    const totalSale = products.reduce((sum, p) => sum + (Number(p.salePrice || 0) * p.stock), 0);
    const totalStock = filteredProducts.reduce((sum, p) => sum + p.stock, 0);
    const lowStockCount = products.filter(p => p.stock <= (p.minStock || 5)).length;
    const productCount = filteredProducts.length;
    
    return { products: productStats, totalCost, totalSale, totalStock, lowStockCount, productCount };
  }, [products, transactions, reportType, inventoryFilter]);

  const formatCurrency = (val: number) => {
    return `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ... Header & Filters ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Relatórios</h1>
          <p className="text-slate-500 dark:text-slate-400">Gere relatórios detalhados para análise.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-400 uppercase">Tipo</label>
             <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
             >
               <option value="SALES">Vendas (Período)</option>
               <option value="FINANCE">Financeiro (DRE)</option>
               <option value="INVENTORY">Estoque Atual</option>
               <option value="CLIENT">Extrato por Cliente</option>
               <option value="EXPENSE_CATEGORY">Despesas por Categoria</option>
             </select>
           </div>
           
            {reportType === 'INVENTORY' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                  <select 
                    value={inventoryFilter}
                    onChange={(e) => setInventoryFilter(e.target.value as any)}
                    className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Todos os Itens</option>
                    <option value="LOW">Somente Reposição</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mb-1 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer select-none" onClick={() => setShowCost(!showCost)}>
                  <input 
                    type="checkbox" 
                    checked={showCost}
                    onChange={() => {}} // Handled by div click
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Exibir Custo</span>
                </div>
              </>
            )}
           
           {reportType === 'CLIENT' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-400 uppercase">Cliente</label>
                 <select 
                   value={selectedClient}
                   onChange={(e) => setSelectedClient(e.target.value)}
                   className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                   <option value="">Selecionar Cliente...</option>
                   <option value="Consumidor Final">Consumidor Final</option>
                   {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
               <div className="flex items-center gap-2 mb-0.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer select-none border border-slate-200 dark:border-slate-600 self-end" style={{ height: '38px' }} onClick={() => setShowCostInClientReport(!showCostInClientReport)}>
                  <input 
                    type="checkbox" 
                    checked={showCostInClientReport}
                    onChange={() => {}} 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Base Preço de Custo</span>
               </div>
             </>
           )}

           {reportType === 'EXPENSE_CATEGORY' && expenseCategoryData && (
               <div className="space-y-1 w-full max-w-[200px]">
                 <label className="text-xs font-bold text-slate-400 uppercase">Filtrar Categoria</label>
                 <select 
                   value={expenseCategoryFilter}
                   onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                   className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                   <option value="ALL">Todas as Categorias</option>
                   {expenseCategoryData.uniqueCategories.map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                 </select>
               </div>
           )}
           
           {reportType !== 'INVENTORY' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-400 uppercase">Início</label>
                 <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-400 uppercase">Fim</label>
                 <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
             </>
           )}

           <button 
            onClick={handlePrint}
            className="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
           >
             <Printer size={18} /> Imprimir
           </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* Print Header */}
        <div className="hidden print:flex mb-8 border-b-2 border-black pb-4 items-center gap-6">
           {settings.logoUrl && (
             <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
           )}
           <div>
             <h1 className="text-xl md:text-2xl font-black uppercase print:text-lg">
               Relatório de {
                 reportType === 'SALES' ? 'Vendas' : 
                 reportType === 'FINANCE' ? 'Financeiro' : 
                 reportType === 'INVENTORY' ? 'Estoque' :
                 reportType === 'EXPENSE_CATEGORY' ? 'Despesas por Categoria' :
                 'Extrato por Cliente'
               }
             </h1>
             <p className="text-xs text-gray-600 print:text-[10px]">
               Gerado em: {new Date().toLocaleString()} 
               {reportType === 'CLIENT' && selectedClient && ` • Cliente: ${selectedClient}`}
               {` • Período: ${formatLocalDate(startDate)} a ${formatLocalDate(endDate)}`}
             </p>
           </div>

        </div>


        {/* SALES REPORT */}
        {reportType === 'SALES' && salesData && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-6 print:grid-cols-3">
              <SummaryBox title="Qtd. Vendas" value={salesData.totalSales.toString()} />
              <SummaryBox title="Faturamento" value={formatCurrency(salesData.totalRevenue)} />
              <SummaryBox title="Ticket Médio" value={formatCurrency(salesData.avgTicket)} />
            </div>
            
            {/* Chart and Table (omitted for brevity, only changing formatting) */}
            <div className="print:hidden h-64 w-full">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Vendas por Pagamento</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight print:text-black">Detalhamento</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2 print:px-2 print:py-1">Data</th>
                      <th className="px-4 py-2 print:px-2 print:py-1">Cliente</th>
                      <th className="px-4 py-2 print:px-2 print:py-1">Pagamento</th>
                      <th className="px-4 py-2 print:px-2 print:py-1 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black text-[11px] print:text-[10px]">
                    {salesData.txs.map(tx => (
                      <tr key={tx.id} className="text-slate-700 dark:text-slate-300 print:text-black">
                        <td className="px-4 py-2 print:px-2 print:py-1">{formatLocalDate(tx.createdAt)} {formatLocalTime(tx.createdAt)}</td>
                        <td className="px-4 py-2 print:px-2 print:py-1">Consumidor Final</td>
                        <td className="px-4 py-2 print:px-2 print:py-1">{tx.paymentMethod || 'N/A'}</td>
                        <td className="px-4 py-2 print:px-2 print:py-1 text-right font-bold">{formatCurrency(tx.total)}</td>
                      </tr>
                    ))}
                  </tbody>


                </table>
              </div>
            </div>
          </div>
        )}

        {/* FINANCE REPORT */}
        {reportType === 'FINANCE' && financeData && (
           <div className="space-y-8">
             <div className="grid grid-cols-3 gap-6 print:grid-cols-3">
               <SummaryBox title="Total Receitas" value={formatCurrency(financeData.income)} color="text-emerald-600" />
               <SummaryBox title="Total Despesas" value={formatCurrency(financeData.expense)} color="text-rose-600" />
               <SummaryBox 
                 title="Saldo Líquido" 
                 value={formatCurrency(financeData.balance)} 
                 color={financeData.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'} 
                 bg={financeData.balance >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
               />
             </div>

             <div>
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight print:text-black">Extrato do Período (DRE Simplificado)</h3>
               <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-xs">
                     <tr>
                       <th className="px-4 py-2 print:px-2 print:py-1">Data</th>
                       <th className="px-4 py-2 print:px-2 print:py-1">Descrição</th>
                       <th className="px-4 py-2 print:px-2 print:py-1">Tipo</th>
                       <th className="px-4 py-2 print:px-2 print:py-1 text-right">Valor</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black text-[11px] print:text-[10px]">
                     {financeData.records.map(rec => (
                       <tr key={rec.id} className="text-slate-700 dark:text-slate-300 print:text-black">
                          <td className="px-4 py-2 print:px-2 print:py-1">{formatLocalDate(rec.dueDate)}</td>
                         <td className="px-4 py-2 print:px-2 print:py-1">{rec.description}</td>
                         <td className="px-4 py-2 print:px-2 print:py-1">
                           <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                             rec.type === FinanceType.RECEIVABLE 
                             ? 'bg-emerald-100 text-emerald-700 print:border print:border-black print:text-black print:bg-transparent' 
                             : 'bg-rose-100 text-rose-700 print:border print:border-black print:text-black print:bg-transparent'
                           }`}>
                             {rec.type === FinanceType.RECEIVABLE ? 'Receita' : 'Despesa'}
                           </span>
                         </td>
                         <td className={`px-4 py-2 print:px-2 print:py-1 text-right font-bold ${
                           rec.type === FinanceType.RECEIVABLE ? 'text-emerald-600' : 'text-rose-600'
                         } print:text-black`}>
                           {rec.type === FinanceType.PAYABLE ? '-' : '+'} {formatCurrency(rec.amount)}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
        )}

        {/* EXPENSE CATEGORY REPORT */}
        {reportType === 'EXPENSE_CATEGORY' && expenseCategoryData && (
          <div className="space-y-8 print:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
              <SummaryBox title="Total Gasto no Período" value={formatCurrency(expenseCategoryData.totalExpense)} color="text-rose-600" bg="bg-rose-50 dark:bg-rose-900/20" />
              <SummaryBox title="Total de Lançamentos" value={expenseCategoryData.transactionCount.toString()} />
              <SummaryBox title="Ticket Médio" value={formatCurrency(expenseCategoryData.avgTicket)} />
            </div>

            <div className="print:hidden h-72 w-full">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Gastos por Categoria</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseCategoryData.grouped} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#e11d48" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 print:mb-2 uppercase tracking-tight print:text-black">Resumo por Categoria</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black mb-8 print:mb-4">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2 print:px-2 print:py-1">Categoria</th>
                      <th className="px-4 py-2 print:px-2 print:py-1 text-right">Valor Gasto</th>
                      <th className="px-4 py-2 print:px-2 print:py-1 text-right">% do Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black text-[12px] print:text-[10px]">
                    {expenseCategoryData.grouped.map((cat: any) => (
                      <tr key={cat.name} className="text-slate-700 dark:text-slate-300 print:text-black font-medium">
                        <td className="px-4 py-2 print:px-2 print:py-1 uppercase">{cat.name}</td>
                        <td className="px-4 py-2 print:px-2 print:py-1 text-right font-bold text-rose-600 print:text-black">{formatCurrency(cat.value)}</td>
                        <td className="px-4 py-2 print:px-2 print:py-1 text-right">
                          {expenseCategoryData.totalExpense > 0 ? ((cat.value / expenseCategoryData.totalExpense) * 100).toFixed(1) + '%' : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 print:mb-2 uppercase tracking-tight print:text-black">Detalhamento dos Gastos</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-xs print:text-[10px]">
                    <tr>
                      <th className="px-4 py-2 print:px-2 print:py-1">Data</th>
                      <th className="px-4 py-2 print:px-2 print:py-1">Categoria</th>
                      <th className="px-4 py-2 print:px-2 print:py-1">Descrição</th>
                      <th className="px-4 py-2 print:px-2 print:py-1 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black text-[11px] print:text-[10px]">
                    {expenseCategoryData.records.sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map((rec: any) => (
                      <tr key={rec.id} className="text-slate-700 dark:text-slate-300 print:text-black">
                        <td className="px-4 py-2 print:px-2 print:py-1 whitespace-nowrap">{formatLocalDate(rec.dueDate)}</td>
                        <td className="px-4 py-2 print:px-2 print:py-1">
                          <span className="hidden print:inline-block font-bold uppercase text-[9px] text-slate-500 print:text-black">{rec.category || 'Não categorizado'}</span>
                          <select
                             value={(rec.category || 'Não categorizado').toUpperCase()}
                             onChange={(e) => handleUpdateCategory(rec.id, e.target.value)}
                             className="print:hidden bg-transparent font-bold text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 -ml-1 rounded cursor-pointer outline-none w-full max-w-[150px]"
                          >
                             <option value="NÃO CATEGORIZADO">NÃO CATEGORIZADO</option>
                             <option value="MAT. LIMPEZA">MAT. LIMPEZA</option>
                             <option value="GRATIFICAÇÃO">GRATIFICAÇÃO</option>
                             <option value="COMBUSTÍVEL MOTO">COMBUSTÍVEL MOTO</option>
                             <option value="COMBUSTÍVEL PULSE">COMBUSTÍVEL PULSE</option>
                             <option value="COMBUSTÍVEL TITANO">COMBUSTÍVEL TITANO</option>
                             <option value="MAT. EXPEDIENTE">MAT. EXPEDIENTE</option>
                             {expenseCategoryData.uniqueCategories
                                .filter((uc: string) => !["NÃO CATEGORIZADO", "MAT. LIMPEZA", "GRATIFICAÇÃO", "COMBUSTÍVEL MOTO", "COMBUSTÍVEL PULSE", "COMBUSTÍVEL TITANO", "MAT. EXPEDIENTE"].includes(uc))
                                .map((uc: string) => <option key={uc} value={uc}>{uc}</option>)
                             }
                          </select>
                        </td>
                        <td className="px-4 py-2 print:px-2 print:py-1">{rec.description}</td>
                        <td className="px-4 py-2 print:px-2 print:py-1 text-right font-bold text-rose-600 print:text-black whitespace-nowrap">{formatCurrency(rec.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY REPORT */}
        {reportType === 'INVENTORY' && inventoryData && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
              <SummaryBox 
                title="Produtos Cadastrados" 
                value={inventoryData.productCount.toString()} 
              />
              <SummaryBox 
                title="Total de Itens (Un)" 
                value={inventoryData.totalStock.toString()} 
              />
              <SummaryBox 
                title="Reposição Necessária" 
                value={inventoryData.lowStockCount.toString()} 
                color={inventoryData.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'} 
                bg={inventoryData.lowStockCount > 0 ? 'bg-rose-50' : 'bg-white'} 
              />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight print:text-black">Posição de Estoque</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-5 print:px-2 print:py-1">Produto</th>
                      {showCost && <th className="px-6 py-5 print:px-2 print:py-1 text-center">Custo</th>}
                      <th className="px-6 py-5 print:px-2 print:py-1 text-center">Mínimo</th>
                      <th className="px-6 py-5 print:px-2 print:py-1 text-center">Disponível</th>
                      <th className="px-6 py-5 print:px-2 print:py-1 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black text-sm print:text-[10px]">
                    {inventoryData.products.sort((a,b) => (a.stock <= (a.minStock||5) ? -1 : 1)).map(prod => (
                      <tr key={prod.id} className={`text-slate-700 dark:text-slate-300 print:text-black hover:bg-slate-50 dark:hover:bg-slate-700/50 ${(prod.stock <= (prod.minStock || 5)) ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-6 py-5 print:px-2 print:py-1">
                          <div className="font-bold text-base">{prod.name}</div>
                          <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">{prod.category}</div>
                        </td>
                        {showCost && (
                          <td className="px-6 py-5 print:px-2 print:py-1 text-center font-black text-slate-500">
                            {formatCurrency(prod.costPrice)}
                          </td>
                        )}
                        <td className="px-6 py-5 print:px-2 print:py-1 text-center font-bold text-slate-400">
                          {prod.minStock || 5}
                        </td>
                        <td className="px-6 py-5 print:px-2 print:py-1 text-center">
                          <span className={`${prod.stock <= (prod.minStock || 5) ? 'text-rose-600 font-black text-xl' : 'text-slate-900 dark:text-white font-black text-lg'} print:text-black`}>
                             {prod.stock}
                          </span>
                        </td>
                        <td className="px-6 py-5 print:px-2 print:py-1 text-center">
                           {prod.stock <= (prod.minStock || 5) ? (
                             <span className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-rose-200 dark:shadow-none">
                               <AlertCircle size={14} /> Reposição
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-none">
                               <CheckCircle size={14} /> OK
                             </span>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>


                </table>
              </div>
            </div>
          </div>
        )}
        {/* CLIENT MOVEMENT REPORT */}
        {reportType === 'CLIENT' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
               <div>
                 <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Extrato do Cliente</p>
                 <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{selectedClient || 'Nenhum cliente selecionado'}</h2>
               </div>
               <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Movimentado</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(clientMovement.reduce((sum, m) => {
                      if (m.source === 'EXPEDIÇÃO' && m.details?.items) {
                        const shipmentTotal = m.details.items.reduce((s: number, item: any) => 
                          s + (item.quantity * Number(showCostInClientReport ? (item.cost_price || item.costPrice || 0) : (item.sale_price || item.salePrice || item.unit_price || 0))), 0);
                        return sum + shipmentTotal;
                      }
                      return sum + Number(m.total || 0);
                    }, 0))}
                  </p>
               </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight print:text-black print:text-sm">Movimentação Detalhada</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black">
                <table className="w-full text-left text-sm print:text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-[10px] print:text-[9px]">
                    <tr>
                      <th className="px-4 py-2 print:px-2 print:py-1">Data</th>
                      <th className="px-4 py-2 print:px-2 print:py-1">Origem</th>
                      <th className="px-4 py-2 print:px-2 print:py-1">Descrição / Item</th>
                      <th className="px-4 py-2 print:px-2 print:py-1 text-center">Referência</th>
                      <th className="px-4 py-2 print:px-2 print:py-1 text-right">Valor</th>
                      <th className="px-4 py-2 print:px-2 print:py-1 text-center print:hidden">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black text-[11px] print:text-[10px]">
                    {clientMovement.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Nenhum registro encontrado para este cliente.</td>
                      </tr>
                    ) : (
                      clientMovement.map((m, idx) => (
                        <tr key={idx} className="text-slate-700 dark:text-slate-300 print:text-black hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-2 print:px-2 print:py-1 whitespace-nowrap">
                            {formatLocalDate(m.created_at)} {formatLocalTime(m.created_at)}
                          </td>
                          <td className="px-4 py-2 print:px-2 print:py-1">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${
                              m.source === 'VENDA' ? 'bg-emerald-100 text-emerald-700' :
                              m.source === 'OS' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {m.source}
                            </span>
                          </td>
                          <td className="px-4 py-2 print:px-2 print:py-1 font-medium leading-tight">{m.product_name}</td>
                          <td className="px-4 py-2 print:px-2 print:py-1 text-center text-[9px] font-bold text-slate-400">{m.id}</td>
                          <td className="px-4 py-2 print:px-2 print:py-1 text-right font-black text-slate-900 dark:text-white print:text-black">
                            {(() => {
                              if (m.source === 'EXPEDIÇÃO' && m.details?.items) {
                                const shipmentTotal = m.details.items.reduce((s: number, item: any) => 
                                  s + (item.quantity * (showCostInClientReport ? (item.cost_price || item.costPrice || 0) : (item.sale_price || item.salePrice || item.unit_price || 0))), 0);
                                return formatCurrency(shipmentTotal);
                              }
                              return formatCurrency(m.total);
                            })()}
                          </td>
                          <td className="px-4 py-2 print:px-2 print:py-1 text-center print:hidden">
                            <button 
                              onClick={() => setDetailsModal({show: true, data: m})} 
                              className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-all"
                              title="Ver Detalhes"
                            >
                               <Info size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


      </div>
      {/* Premium Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`
            flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md
            ${toast.type === 'ok' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
            ${toast.type === 'err' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
            ${toast.type === 'info' ? 'bg-indigo-500/90 border-indigo-400 text-white' : ''}
          `}>
            {toast.type === 'ok' && <CheckCircle size={20} className="animate-bounce" />}
            {toast.type === 'err' && <AlertCircle size={20} className="animate-pulse" />}
            {toast.type === 'info' && <Info size={20} />}
            <span className="font-black text-sm uppercase tracking-widest">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal?.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Detalhes do Registro</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: {detailsModal.data.id}</p>
                </div>
                <button onClick={() => setDetailsModal(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl">
                   <X size={20} />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Sale Details */}
                {detailsModal.data.source === 'VENDA' && (
                  <div className="space-y-4">
                     <DetailRow label="Produto/Serviço" value={detailsModal.data.product_name} />
                     <DetailRow label="Quantidade" value={`${detailsModal.data.quantity} un`} />
                     <DetailRow label="Valor Unitário" value={formatCurrency(detailsModal.data.details?.unit_price || 0)} />
                     <DetailRow label="Valor Total" value={formatCurrency(detailsModal.data.total)} isHighlight />
                     <DetailRow label="Método de Pagamento" value={detailsModal.data.details?.payment_method || 'N/A'} />
                     <DetailRow label="Data" value={new Date(detailsModal.data.created_at).toLocaleString('pt-BR')} />
                  </div>
                )}
                
                {/* Shipment Details */}
                {detailsModal.data.source === 'EXPEDIÇÃO' && (
                  <div className="space-y-4">
                     <DetailRow label="Tipo de Registro" value="Expedição / Empréstimo de Material" />
                     <DetailRow label="Responsável / Observações" value={detailsModal.data.details?.notes || 'N/A'} isLong />
                     <DetailRow label="Valor Total Expedido" value={formatCurrency(detailsModal.data.total)} isHighlight />
                     <DetailRow label="Data" value={new Date(detailsModal.data.created_at).toLocaleString('pt-BR')} />
                     
                     <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Itens da Expedição</h4>
                        <div className="space-y-3">
                           {detailsModal.data.details?.items?.map((item: any, i: number) => (
                             <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{item.name}</span>
                                <div className="text-right">
                                   <span className="text-[10px] font-bold text-slate-400 block">{item.quantity} un x {formatCurrency(item.costPrice || item.unit_price || item.salePrice || 0)}</span>
                                   <span className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency((item.quantity || 1) * (item.costPrice || item.unit_price || item.salePrice || 0))}</span>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                )}
                
                {/* OS Details */}
                {detailsModal.data.source === 'OS' && (
                  <div className="space-y-4">
                     <div className="flex gap-2 mb-4">
                       <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${detailsModal.data.details?.status === 'CONCLUIDA' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                         STATUS: {detailsModal.data.details?.status || 'ABERTA'}
                       </span>
                     </div>
                     <DetailRow label="Equipamento" value={detailsModal.data.details?.equipment || 'N/A'} />
                     <DetailRow label="Defeito Relatado" value={detailsModal.data.details?.problem_description || 'N/A'} isLong />
                     <DetailRow label="Serviço Realizado" value={detailsModal.data.details?.service_description || 'N/A'} isLong />
                     <DetailRow label="Peças Utilizadas" value={detailsModal.data.details?.parts_used || 'Nenhum material registrado.'} isLong />
                     <DetailRow label="Técnico" value={detailsModal.data.details?.technician || 'N/A'} />
                     
                     <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mão de Obra</span>
                           <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatCurrency(detailsModal.data.details?.labor_cost || 0)}</span>
                        </div>
                        <div>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Peças / Materiais</span>
                           <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatCurrency(detailsModal.data.details?.parts_cost || 0)}</span>
                        </div>
                     </div>
                     <DetailRow label="Valor Total da OS" value={formatCurrency(detailsModal.data.total)} isHighlight />
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Reports;
