
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Calendar, Filter, Printer, FileText, Download, CheckCircle, AlertCircle, Info } from 'lucide-react';

import { TransactionType, FinanceType, Product, Transaction, FinanceRecord, FinanceStatus } from '../types';

import { api } from '../services/api';

const API_URL = `http://${window.location.hostname}:3001`;

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<'SALES' | 'FINANCE' | 'INVENTORY' | 'CLIENT'>('SALES');
  const [selectedClient, setSelectedClient] = useState('');
  const [clientMovement, setClientMovement] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' | 'info' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  // Default start date to the first day of the current month
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
      api.getTransactions().then(setTransactions);
    } else if (reportType === 'FINANCE') {
      api.getFinance().then(setFinanceRecords);
    } else if (reportType === 'INVENTORY') {
      api.getTransactions().then(setTransactions);
    }
    
    if (clients.length === 0) {
      api.getClients().then(setClients);
    }
  }, [reportType]);

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
    const totalRevenue = txs.reduce((sum, t) => sum + t.total, 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    const byMethod = txs.reduce((acc, t) => {
      const method = t.paymentMethod || 'OUTROS';
      acc[method] = (acc[method] || 0) + t.total;
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

    const income = records.filter(r => r.type === FinanceType.RECEIVABLE).reduce((sum, r) => sum + r.amount, 0);
    const expense = records.filter(r => r.type === FinanceType.PAYABLE).reduce((sum, r) => sum + r.amount, 0);

    return { records, income, expense, balance: income - expense };
  }, [financeRecords, reportType, startDate, endDate]);

  const inventoryData = useMemo(() => {
    if (reportType !== 'INVENTORY') return null;
    
    // Calculate total outputs (SALES + OUT) for each product
    const productStats = products.map(p => {
      const soldQty = transactions
        .filter(t => t.productId === p.id && (t.type === TransactionType.SALE || t.type === TransactionType.OUT))
        .reduce((sum, t) => sum + t.quantity, 0);
      
      return { ...p, soldQty };
    });

    const totalCost = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
    const totalSale = products.reduce((sum, p) => sum + (p.salePrice * p.stock), 0);
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    
    return { products: productStats, totalCost, totalSale, totalStock };
  }, [products, transactions, reportType]);

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
             </select>
           </div>
           
           {reportType === 'CLIENT' && (
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
        <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
           <h1 className="text-2xl font-black uppercase">Relatório de {reportType === 'SALES' ? 'Vendas' : reportType === 'FINANCE' ? 'Financeiro' : 'Estoque'}</h1>
           <p className="text-sm text-gray-600">
             Gerado em: {new Date().toLocaleString()} 
             {reportType === 'CLIENT' && selectedClient && ` • Cliente: ${selectedClient}`}
             {reportType !== 'INVENTORY' && ` • Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString()} a ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`}
           </p>
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
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Cliente</th>
                      <th className="px-6 py-3">Pagamento</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black">
                    {salesData.txs.map(tx => (
                      <tr key={tx.id} className="text-slate-700 dark:text-slate-300 print:text-black">
                        <td className="px-6 py-3">{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td className="px-6 py-3">Consumidor Final</td>
                        <td className="px-6 py-3">{tx.paymentMethod || 'N/A'}</td>
                        <td className="px-6 py-3 text-right font-bold">{formatCurrency(tx.total)}</td>
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
                       <th className="px-6 py-3">Data</th>
                       <th className="px-6 py-3">Descrição</th>
                       <th className="px-6 py-3">Tipo</th>
                       <th className="px-6 py-3 text-right">Valor</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black">
                     {financeData.records.map(rec => (
                       <tr key={rec.id} className="text-slate-700 dark:text-slate-300 print:text-black">
                         <td className="px-6 py-3">{new Date(rec.dueDate).toLocaleDateString()}</td>
                         <td className="px-6 py-3">{rec.description}</td>
                         <td className="px-6 py-3">
                           <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                             rec.type === FinanceType.RECEIVABLE 
                             ? 'bg-emerald-100 text-emerald-700 print:border print:border-black print:text-black print:bg-transparent' 
                             : 'bg-rose-100 text-rose-700 print:border print:border-black print:text-black print:bg-transparent'
                           }`}>
                             {rec.type === FinanceType.RECEIVABLE ? 'Receita' : 'Despesa'}
                           </span>
                         </td>
                         <td className={`px-6 py-3 text-right font-bold ${
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

        {/* INVENTORY REPORT */}
        {reportType === 'INVENTORY' && inventoryData && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-6 print:grid-cols-3">
              <SummaryBox title="Itens em Estoque" value={inventoryData.totalStock.toString()} />
              <SummaryBox title="Total em Custo (Investimento)" value={formatCurrency(inventoryData.totalCost)} />
              <SummaryBox title="Potencial de Venda (Estimado)" value={formatCurrency(inventoryData.totalSale)} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight print:text-black">Posição de Estoque</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Produto</th>
                      <th className="px-6 py-3">Categoria</th>
                      <th className="px-6 py-3 text-right">Custo Un.</th>
                      <th className="px-6 py-3 text-right">Venda Un.</th>
                      <th className="px-6 py-3 text-center">Saída</th>
                      <th className="px-6 py-3 text-center">Estoque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black">
                    {inventoryData.products.map(prod => (
                      <tr key={prod.id} className="text-slate-700 dark:text-slate-300 print:text-black">
                        <td className="px-6 py-3 font-bold">{prod.name}</td>
                        <td className="px-6 py-3 text-xs uppercase">{prod.category}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(prod.costPrice)}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(prod.salePrice)}</td>
                        <td className="px-6 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {(prod as any).soldQty || 0}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`${prod.stock <= 5 ? 'text-rose-600 font-bold' : ''} print:text-black`}>
                             {prod.stock}
                             {prod.stock <= 5 && <span className="ml-2 text-[10px] bg-rose-100 text-rose-600 px-1 rounded print:hidden">BAIXO</span>}
                          </span>
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
                    {formatCurrency(clientMovement.reduce((sum, m) => sum + m.total, 0))}
                  </p>
               </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight print:text-black">Movimentação Detalhada</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 print:border-black">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-200 text-slate-500 dark:text-slate-300 print:text-black font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Origem</th>
                      <th className="px-6 py-3">Descrição / Item</th>
                      <th className="px-6 py-3 text-center">Referência</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black">
                    {clientMovement.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Nenhum registro encontrado para este cliente.</td>
                      </tr>
                    ) : (
                      clientMovement.map((m, idx) => (
                        <tr key={idx} className="text-slate-700 dark:text-slate-300 print:text-black hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-6 py-3">
                            {new Date(m.created_at).toLocaleDateString('pt-BR')} {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                              m.source === 'VENDA' ? 'bg-emerald-100 text-emerald-700' :
                              m.source === 'OS' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {m.source}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-medium">{m.product_name}</td>
                          <td className="px-6 py-3 text-center text-[10px] font-bold text-slate-400">{m.id}</td>
                          <td className="px-6 py-3 text-right font-black text-slate-900 dark:text-white print:text-black">
                            {formatCurrency(m.total)}
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
    </div>
  );
};

const SummaryBox: React.FC<{ title: string, value: string, color?: string, bg?: string }> = ({ title, value, color, bg }) => (
  <div className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-700 print:border-black ${bg || 'bg-white dark:bg-slate-800'}`}>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-gray-500">{title}</p>
    <p className={`text-2xl font-black ${color || 'text-slate-900 dark:text-white'} print:text-black`}>{value}</p>
  </div>
);

export default Reports;
