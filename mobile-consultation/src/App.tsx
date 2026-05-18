import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Search, 
  ShoppingBag, 
  History, 
  Menu, 
  X, 
  ChevronRight, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCcw, 
  Info, 
  Wallet, 
  LayoutDashboard,
  Box,
  TrendingDown,
  User
} from 'lucide-react';

// Supabase config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

type Product = {
  id: number;
  name: string;
  barcode: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  category?: string | null;
  created_at: string;
};

type Movement = {
  id: string;
  product_name: string;
  type: 'SALE' | 'ENTRY' | 'OUT';
  quantity: number;
  total: number;
  created_at: string;
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SEARCH' | 'HISTORY'>('DASHBOARD');
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: pData } = await supabase.from('products').select('*').eq('delete', '').order('name');
            const { data: mData } = await supabase.from('transactions').select('*').eq('delete', '').order('created_at', { ascending: false }).limit(20);
            if (pData) setProducts(pData);
            if (mData) setMovements(mData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const dashboardStats = {
        totalStock: products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0),
        lowStockItems: products.filter(p => p.stock_quantity <= (p.min_stock || 5)).length,
    };

    const filteredAndSearch = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.barcode && p.barcode.includes(searchTerm))
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 antialiased">
            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200 py-6 px-6">
                <div className="flex items-center justify-between max-w-lg mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                            <ShoppingBag className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">Sopacrazy <span className="text-brand-600">Pro</span></h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Mobile Consultation</p>
                        </div>
                    </div>
                    <button className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors">
                        <User size={20} />
                    </button>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 pt-6 pb-28 px-6 max-w-lg mx-auto w-full overflow-x-hidden">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        {/* --- RESUMO CARDS --- */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-brand-600/30 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                    <Box size={100} />
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100 shadow-sm">
                                    <Package size={20} />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Itens em Loja</p>
                                <p className="text-3xl font-black text-slate-900">{dashboardStats.totalStock}</p>
                            </div>

                            <div className="p-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-rose-600/30 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                    <TrendingDown size={100} />
                                </div>
                                <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 border border-rose-100 shadow-sm">
                                    <TrendingDown size={20} />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estoque Baixo</p>
                                <p className="text-3xl font-black text-rose-600">{dashboardStats.lowStockItems}</p>
                            </div>
                        </div>

                        {/* --- LISTA DE TRANSAÇÕES --- */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Últimas Atividades</h2>
                                <button onClick={fetchData} className={`text-brand-600 hover:rotate-180 transition-all active:scale-90 ${loading ? 'animate-spin' : ''}`}>
                                    <RefreshCcw size={16} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {movements.length === 0 ? (
                                    <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl opacity-60">
                                        <History size={48} className="mx-auto mb-4 text-slate-400" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aguardando dados...</p>
                                    </div>
                                ) : (
                                    movements.map(m => (
                                        <div key={m.id} className="p-5 bg-white border border-slate-200 rounded-[2rem] flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.99]">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                                                m.type === 'ENTRY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                m.type === 'SALE' ? 'bg-brand-50 text-brand-600 border-brand-100' : 
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {m.type === 'ENTRY' ? <ArrowDownRight size={22} /> : <ArrowUpRight size={22} />}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-2">
                                                <h3 className="text-xs font-black uppercase truncate text-slate-900 leading-tight mb-0.5">{m.product_name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                                        m.type === 'ENTRY' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'
                                                    }`}>
                                                        {m.type === 'SALE' ? 'VENDA' : m.type === 'ENTRY' ? 'ENTRADA' : 'SAÍDA'}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.quantity} un</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900">R$ {m.total.toFixed(2).replace('.', ',')}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                                                    {new Date(m.created_at).getHours().toString().padStart(2, '0')}:{new Date(m.created_at).getMinutes().toString().padStart(2, '0')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* --- CONSULTA CTA --- */}
                        <div 
                            className="p-8 bg-brand-600 rounded-[3rem] shadow-xl shadow-brand-600/30 flex items-center justify-between active:scale-95 transition-all text-white group cursor-pointer"
                            onClick={() => setActiveTab('SEARCH')}
                        >
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1 shadow-sm">Pesquisar Estoque</h3>
                                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Consultar preços agora</p>
                            </div>
                            <div className="w-14 h-14 bg-white/10 rounded-3xl flex items-center justify-center group-hover:bg-white/20 transition-all border border-white/20">
                                <Search size={28} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'SEARCH' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Consultar nome ou código..."
                                className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] outline-none shadow-sm focus:border-brand-600/40 focus:ring-4 focus:ring-brand-500/5 transition-all font-bold text-sm text-slate-900 placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            {filteredAndSearch.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => setSelectedProduct(p)}
                                    className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex items-center justify-between hover:border-brand-600/20 active:scale-[0.98] transition-all group"
                                >
                                    <div className="min-w-0 pr-4">
                                        <h3 className="text-xs font-black uppercase text-slate-800 break-words group-active:text-brand-600 transition-colors mb-2 leading-tight">{p.name}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                                                p.stock_quantity <= (p.min_stock || 5) ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                                {p.stock_quantity} un
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase">EAN: {p.barcode || '---'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 mb-0.5">R$ {p.sale_price.toFixed(2)}</p>
                                        <ChevronRight size={18} className="text-slate-200 group-hover:text-brand-600 group-hover:translate-x-1 transition-all ml-auto" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* --- NAV BAR --- */}
            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-lg mx-auto bg-white/80 backdrop-blur-2xl border border-slate-200 rounded-[2.5rem] p-2 flex items-center justify-between shadow-2xl shadow-slate-300/50 z-[100] h-20">
                <NavButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard size={20}/>} label="Home" />
                <NavButton active={activeTab === 'SEARCH'} onClick={() => setActiveTab('SEARCH')} icon={<Search size={20}/>} label="Buscar" />
                <NavButton active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<History size={20}/>} label="Ativ." />
                <NavButton active={false} onClick={() => {}} icon={<Menu size={20}/>} label="Menu" />
            </nav>

            {/* --- DETALHES MODAL --- */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-xl flex flex-col pt-12 animate-in fade-in duration-300">
                    <div className="mt-auto bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-500 border-t border-slate-200">
                        <button onClick={() => setSelectedProduct(null)} className="absolute -top-16 left-1/2 -translate-x-1/2 p-4 bg-white/50 backdrop-blur-md rounded-full border border-whiteShadow-sm active:scale-90 transition-all">
                            <X size={24} className="text-white" />
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Package size={32} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900 leading-tight mb-2">
                                {selectedProduct.name}
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes do Item</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Venda</p>
                                <p className="text-2xl font-black text-brand-600">R$ {selectedProduct.sale_price.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock</p>
                                <p className="text-2xl font-black text-slate-900">{selectedProduct.stock_quantity} un</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-10">
                            <DetailRow label="Código Universal" value={selectedProduct.barcode || 'Não disponível'} icon={<Info size={18}/>} />
                            <DetailRow label="Preço Unitário Custo" value={`R$ ${selectedProduct.cost_price.toFixed(2).replace('.', ',')}`} icon={<Wallet size={18}/>} />
                        </div>

                        <button 
                            onClick={() => setSelectedProduct(null)} 
                            className="w-full py-6 bg-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg shadow-slate-900/30"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center h-full transition-all rounded-[1.8rem] ${active ? 'bg-brand-600 text-white shadow-xl shadow-brand-600/30' : 'text-slate-400 active:bg-slate-50'}`}
    >
        {icon}
        <span className="text-[8px] font-black uppercase tracking-tighter mt-1">{label}</span>
    </button>
);

const DetailRow = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="text-slate-400">{icon}</div>
        <div className="flex-1">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

export default App;
