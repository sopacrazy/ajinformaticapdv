
import React, { useState, useEffect } from 'react';
import { FileText, Trash2, ShoppingCart, Search, Filter, CheckCircle, Clock, X, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CONVERTED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const data = await api.getQuotes();
      setQuotes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este orçamento?')) {
      await api.deleteQuote(id);
      loadQuotes();
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await api.updateQuoteStatus(id, status);
    loadQuotes();
  };

  const formatCurrency = (val: number) => `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const filteredQuotes = quotes.filter(q => {
    const matchSearch = q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_CONFIG: any = {
    OPEN: { label: 'Aberto / Pendente', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: <Clock size={14} /> },
    CONVERTED: { label: 'Convertido', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: <CheckCircle size={14} /> },
    CANCELLED: { label: 'Cancelado', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30', icon: <X size={14} /> },
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Gerenciamento de Orçamentos</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Consulte, converta ou cancele suas cotações em aberto.</p>
        </div>
      </header>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard 
            title="Total em Aberto" 
            count={quotes.filter(q => q.status === 'OPEN').length} 
            value={formatCurrency(quotes.filter(q => q.status === 'OPEN').reduce((acc, q) => acc + Number(q.total || 0), 0))}
            color="amber"
        />
        <StatusCard 
            title="Convertidos" 
            count={quotes.filter(q => q.status === 'CONVERTED').length} 
            value={formatCurrency(quotes.filter(q => q.status === 'CONVERTED').reduce((acc, q) => acc + Number(q.total || 0), 0))}
            color="emerald"
        />
        <StatusCard 
            title="Cancelados" 
            count={quotes.filter(q => q.status === 'CANCELLED').length} 
            value={formatCurrency(quotes.filter(q => q.status === 'CANCELLED').reduce((acc, q) => acc + Number(q.total || 0), 0))}
            color="rose"
        />
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 dark:shadow-none flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Volume Total</p>
            <p className="text-2xl font-black">{formatCurrency(quotes.reduce((acc, q) => acc + Number(q.total || 0), 0))}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por cliente ou ID..."
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <FilterBtn active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Tudo" />
              <FilterBtn active={statusFilter === 'OPEN'} onClick={() => setStatusFilter('OPEN')} label="Abertos" />
              <FilterBtn active={statusFilter === 'CONVERTED'} onClick={() => setStatusFilter('CONVERTED')} label="Convertidos" />
              <FilterBtn active={statusFilter === 'CANCELLED'} onClick={() => setStatusFilter('CANCELLED')} label="Cancelados" />
           </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="p-20 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
          ) : filteredQuotes.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                  <th className="px-8 py-4">ID / Data</th>
                  <th className="px-8 py-4">Cliente</th>
                  <th className="px-8 py-4">Valor Total</th>
                  <th className="px-8 py-4 text-center">Status</th>
                  <th className="px-8 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredQuotes.map(q => {
                  const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.OPEN;
                  return (
                    <tr key={q.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-black text-indigo-600 dark:text-indigo-400 text-xs mb-1">#{q.id}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(q.createdAt).toLocaleDateString('pt-BR')}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{q.clientName}</p>
                        <p className="text-[10px] font-medium text-slate-400">{q.items?.length || 0} Itens no carrinho</p>
                      </td>
                      <td className="px-8 py-5 font-black text-slate-900 dark:text-white text-lg">
                        {formatCurrency(q.total)}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           {q.status === 'OPEN' && (
                             <>
                               <button 
                                onClick={() => handleUpdateStatus(q.id, 'CONVERTED')}
                                title="Converter em Venda"
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                               >
                                 <CheckCircle size={18} />
                               </button>
                               <button 
                                onClick={() => handleUpdateStatus(q.id, 'CANCELLED')}
                                title="Cancelar Orçamento"
                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                               >
                                 <X size={18} />
                               </button>
                             </>
                           )}
                           <button 
                            onClick={() => handleDelete(q.id)}
                            title="Excluir Registro"
                            className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-600 hover:text-white rounded-lg transition-all"
                           >
                             <Trash2 size={18} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
               <FileText size={64} className="text-slate-200 dark:text-slate-700" />
               <p className="font-black text-slate-400 uppercase tracking-widest">Nenhum orçamento encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusCard = ({ title, count, value, color }: any) => {
    const colors: any = {
        amber: 'border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 text-amber-600',
        emerald: 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600',
        rose: 'border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10 text-rose-600'
    };
    return (
        <div className={`p-6 rounded-3xl border-2 ${colors[color]} flex flex-col justify-center`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black">{count}</span>
                <span className="text-xs font-bold opacity-60">| {value}</span>
            </div>
        </div>
    );
};

const FilterBtn = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {label}
  </button>
);

export default Quotes;
