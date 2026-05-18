import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Package, AlertCircle, DollarSign, ArrowUpRight, ArrowDownRight, Eye, EyeOff, Activity, Users, FileText, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TransactionType, FinanceType, FinanceStatus } from '../types';
import { api } from '../services/api';
import { Product, Transaction, FinanceRecord } from '../types';
import { getTodayStr, formatLocalDate } from '../services/dateUtils';
import SupportChat from './SupportChat';

interface DashboardProps {
  showValues: boolean;
  togglePrivacy: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ showValues, togglePrivacy }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [txs, prods, fin, qts, sos] = await Promise.all([
        api.getTransactions(),
        api.getProducts(),
        api.getFinance(),
        api.getQuotes(),
        api.getServiceOrders()
      ]);
      setTransactions(txs);
      setProducts(prods);
      setFinance(fin);
      setQuotes(qts);
      setServiceOrders(sos);
    };
    loadData();
  }, []);

  const stats = useMemo(() => {
    const today = getTodayStr();
    const todaySales = transactions
      .filter(tx => tx.createdAt.startsWith(today) && tx.type === TransactionType.SALE)
      .reduce((sum, tx) => sum + Number(tx.total || 0), 0);

    const totalCash = finance
      .filter(f => f.status === FinanceStatus.PAID)
      .reduce((sum, f) => f.type === FinanceType.RECEIVABLE ? sum + Number(f.amount || 0) : sum - Number(f.amount || 0), 0);

    const lowStockItems = products.filter(p => p.stock <= (p.minStock || 5)).length;
    const pendingPayables = finance
      .filter(f => f.type === FinanceType.PAYABLE && f.status === FinanceStatus.PENDING)
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);

    const pendingQuotes = quotes.filter(q => q.status === 'OPEN').length;
    const pendingOS = serviceOrders.filter(os => os.status === 'ABERTA').length;

    return { todaySales, totalCash, lowStockItems, pendingPayables, pendingQuotes, pendingOS };
  }, [transactions, products, finance, quotes, serviceOrders]);

  const chartData = useMemo(() => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          const offset = 180 * 60000; // Forçar Brasília (UTC-3)
          const localNow = new Date(d.getTime() - offset);
          localNow.setDate(localNow.getDate() - (6 - i));
          return localNow.toISOString().split('T')[0];
      });

      return last7Days.map(date => {
          const sales = transactions
            .filter(t => t.createdAt.startsWith(date) && t.type === TransactionType.SALE)
            .reduce((sum, t) => sum + Number(t.total || 0), 0);
          
          return {
              name: date.split('-').slice(2).join(''), // DD
              fullDate: date.split('-').reverse().join('/'),
              sales: sales
          };
      });
  }, [transactions]);

  const formatCurrency = (val: number) => {
    if (!showValues) return "R$ ••••";
    return `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1700px] mx-auto pb-12">
      {/* Privacy Toggle Floating */}
      <div className="flex justify-end mb-[-40px] relative z-20 no-print">
        <button 
          onClick={togglePrivacy}
          className="glass flex items-center gap-3 px-5 py-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/20 dark:shadow-none group"
        >
          {showValues ? <Eye size={18} className="group-hover:scale-110 transition-transform" /> : <EyeOff size={18} className="group-hover:scale-110 transition-transform" />}
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{showValues ? "Modo Público" : "Modo Privado"}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento Hoje" 
          value={formatCurrency(stats.todaySales)}
          icon={<TrendingUp size={20} />}
          color="bg-emerald-500"
          trend="+12.5%"
          trendUp={true}
          showValues={showValues}
        />
        <StatCard 
          title="Saldo Disponível" 
          value={formatCurrency(stats.totalCash)}
          icon={<DollarSign size={20} />}
          color="bg-indigo-500"
          trend="+4.2%"
          trendUp={true}
          showValues={showValues}
        />
        <StatCard 
          title="Estoque Crítico" 
          value={stats.lowStockItems.toString()}
          icon={<Package size={20} />}
          color="bg-amber-500"
          trend={stats.lowStockItems === 0 ? "Normal" : "Atenção"}
          trendUp={false}
          isWarning={stats.lowStockItems > 0}
          showValues={true}
        />
        <StatCard 
          title="Pendências" 
          value={`${stats.pendingQuotes + stats.pendingOS}`}
          icon={<Activity size={20} />}
          color="bg-rose-500"
          trend={`${stats.pendingQuotes} Orç / ${stats.pendingOS} OS`}
          trendUp={false}
          showValues={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Chart Card */}
        <div className="lg:col-span-8 glass-card p-10 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
            <div>
              <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1">Performance Comercial</h3>
              <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Vendas nos últimos 7 dias</p>
            </div>
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl">
               <button className="px-4 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-[10px] font-black uppercase rounded-lg shadow-sm">Diário</button>
               <button className="px-4 py-1.5 text-slate-400 text-[10px] font-black uppercase rounded-lg hover:text-slate-600">Mensal</button>
            </div>
          </div>

          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                  dy={20} 
                />
                <YAxis 
                  hide={!showValues} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                />
                <Tooltip 
                  cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-card p-4 rounded-2xl shadow-2xl border-indigo-500/20">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.fullDate}</p>
                          <p className="text-lg font-black text-indigo-600">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panels */}
        <div className="lg:col-span-4 space-y-8">
          {/* Recent Activity */}
          <div className="glass-card p-8 rounded-[2.5rem] flex flex-col h-[420px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Fluxo Recente</h3>
              <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Ver Todos</button>
            </div>
            
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {transactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${
                      tx.type === TransactionType.SALE 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : tx.type === TransactionType.OUT
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {tx.type === TransactionType.SALE ? <ArrowUpRight size={16} /> : 
                       tx.type === TransactionType.OUT ? <Package size={16} /> : 
                       <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-700 dark:text-slate-200 line-clamp-1">{tx.productName}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                        {new Date(tx.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} &bull; {tx.type === TransactionType.OUT ? 'EXPEDIÇÃO' : tx.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <p className={`font-black text-xs ${
                    tx.type === TransactionType.SALE ? 'text-emerald-600' : 
                    tx.type === TransactionType.OUT ? 'text-blue-600' : 
                    'text-rose-600'
                  }`}>
                    {tx.type === TransactionType.OUT ? `${tx.quantity} UN` : (showValues ? formatCurrency(tx.total) : 'R$ ••••')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Stock Items */}
          <div className="glass-card p-8 rounded-[2.5rem] flex flex-col h-[350px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={16} /> Estoque Crítico
              </h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.lowStockItems} itens</span>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {products
                .filter(p => p.stock <= (p.minStock || 5))
                .sort((a, b) => a.stock - b.stock)
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-rose-50/50 dark:bg-rose-500/5 rounded-2xl border border-rose-100/50 dark:border-rose-500/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-rose-500 shadow-sm">
                        <Package size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-white line-clamp-1">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{p.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xs text-rose-600">{p.stock} un</p>
                      <p className="text-[8px] text-rose-300 font-bold uppercase tracking-tighter">Mín: {p.minStock}</p>
                    </div>
                  </div>
                ))}
              {stats.lowStockItems === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <Package size={40} className="text-slate-200 mb-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tudo em dia!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <SupportChat />
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  color: string,
  trend: string, 
  trendUp: boolean, 
  isWarning?: boolean, 
  showValues: boolean 
}> = ({ title, value, icon, color, trend, trendUp, isWarning, showValues }) => (
  <div className={`glass-card p-8 rounded-[2.5rem] relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 ${
    isWarning ? 'ring-2 ring-amber-500/20' : ''
  }`}>
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 ${color} text-white rounded-[1.25rem] shadow-lg shadow-${color.split('-')[1]}-500/30 group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${
        trendUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'
      }`}>
        {trendUp && <TrendingUp size={12} />}
        {trend}
      </div>
    </div>
    
    <div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-[0.2em] mb-1.5">{title}</p>
      <p className={`text-3xl font-black tracking-tighter text-slate-800 dark:text-white ${!showValues && title !== 'Estoque Crítico' && title !== 'Pendências' ? 'blur-md select-none' : ''}`}>
        {value}
      </p>
    </div>
    
    <div className="absolute bottom-0 left-0 w-full h-[3px] opacity-20 bg-gradient-to-r from-transparent via-current to-transparent" style={{color: color.replace('bg-', '')}} />
  </div>
);

export default Dashboard;
