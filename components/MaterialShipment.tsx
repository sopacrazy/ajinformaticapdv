import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Plus, Minus, CheckCircle2, FileText, X, Wrench, ChevronRight, User as UserIcon, Wallet, ArrowRight, Activity, Package, Printer, List, History, CheckCircle, AlertCircle, Info, ChevronDown, User, ShoppingBag, RefreshCw, Calendar, Filter } from 'lucide-react';
import { api } from '../services/api';
import { Product } from '../types';
import ConfirmModal from './ConfirmModal';

const MaterialShipment: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [shipmentId, setShipmentId] = useState('');
  const [tab, setTab] = useState<'NOVA' | 'HISTORICO'>('NOVA');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'info' } | null>(null);
  const [showValuesInPrint, setShowValuesInPrint] = useState(true);
  const [useSalePrice, setUseSalePrice] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' | 'info' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({ companyName: '', logoUrl: '' });
  
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ show: boolean, id: string | null }>({ show: false, id: null });
  const [confirmReturnModal, setConfirmReturnModal] = useState<{ show: boolean, id: string | null }>({ show: false, id: null });
  const [shipmentType, setShipmentType] = useState<'DEFINITIVA' | 'EMPRESTIMO'>('DEFINITIVA');
  const [filterDate, setFilterDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'SAIDA' | 'EMPRESTIMO'>('TODOS');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cData, pData, sData, hData] = await Promise.all([
      api.getClients(),
      api.getProducts(),
      api.getSettings(),
      api.getShipments()
    ]);
    setClients(cData);
    setProducts(pData);
    setSettings(sData);
    setShipments(hData);
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, qty: number) => {
    if (qty <= 0) return;
    setCart(cart.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + (item.quantity * (useSalePrice ? (item.salePrice || 0) : (item.costPrice || 0))), 0);
  };

  const handleFinish = async () => {
    if (!selectedClient) {
      showToast('Selecione um cliente!', 'info');
      return;
    }
    if (cart.length === 0) {
      showToast('Adicione produtos à saída!', 'info');
      return;
    }

    setLoading(true);
    const id = shipmentType === 'EMPRESTIMO' ? `EMP-${Date.now()}` : `EXP-${Date.now()}`;
    setShipmentId(id);

    try {
      await api.addShipment({
        id,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        items: cart.map(item => ({
          ...item,
          unit_price: useSalePrice ? (item.salePrice || 0) : (item.costPrice || 0),
          cost_price: item.costPrice || 0,
          sale_price: item.salePrice || 0
        })),
        notes,
        created_at: new Date().toISOString(),
        total: calculateTotal(),
        isLoan: shipmentType === 'EMPRESTIMO'
      });
      showToast(shipmentType === 'EMPRESTIMO' ? 'Empréstimo registrado com sucesso!' : 'Saída de material registrada!');
      resetShipment();
    } catch (err) {
      showToast('Erro ao processar saída', 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteModal({ show: true, id });
  };

  const confirmDelete = async () => {
    if (!confirmDeleteModal.id) return;

    setLoading(true);
    try {
      await api.deleteShipment(confirmDeleteModal.id);
      showToast('Expedição excluída e estoque restaurado!');
      loadData();
    } catch (err) {
      showToast('Erro ao excluir registro', 'err');
    } finally {
      setLoading(false);
      setConfirmDeleteModal({ show: false, id: null });
    }
  };

  const resetShipment = () => {
    setCart([]);
    setSelectedClient(null);
    setSelectedShipment(null);
    setNotes('');
    setShipmentId('');
    setShowPrintModal(false);
    setShipmentType('DEFINITIVA');
    loadData();
  };

  const confirmReturn = async () => {
    if (!confirmReturnModal.id) return;

    setLoading(true);
    try {
      await api.returnShipment(confirmReturnModal.id);
      showToast('Material devolvido com sucesso e estoque atualizado!');
      loadData();
    } catch (err) {
      showToast('Erro ao registrar devolução', 'err');
    } finally {
      setLoading(false);
      setConfirmReturnModal({ show: false, id: null });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
            Saída de <span className="text-gradient">Material</span>
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Expedição técnica para clientes</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-gray-200 dark:border-gray-700 shadow-inner">
           <button 
             onClick={() => setTab('NOVA')}
             className={`px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${tab === 'NOVA' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xl' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <Plus size={16} /> NOVA EXPEDIÇÃO
           </button>
           <button 
             onClick={() => setTab('HISTORICO')}
             className={`px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${tab === 'HISTORICO' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xl' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <FileText size={16} /> VER HISTÓRICO
           </button>
        </div>
      </header>

      {tab === 'NOVA' ? (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
          {/* Left Side: Product Selection */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Shipment Type Selection & Price Toggle Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner h-[52px]">
                 <button
                   onClick={() => setShipmentType('DEFINITIVA')}
                   className={`flex-1 px-4 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${shipmentType === 'DEFINITIVA' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
                 >
                   <CheckCircle2 size={16} /> Saída Definitiva
                 </button>
                 <button
                   onClick={() => setShipmentType('EMPRESTIMO')}
                   className={`flex-1 px-4 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${shipmentType === 'EMPRESTIMO' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:text-amber-500'}`}
                 >
                   <RefreshCw size={16} /> Empréstimo
                 </button>
              </div>

              <div className="flex-1 flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner h-[52px]">
                 <button 
                   onClick={() => setUseSalePrice(false)}
                   className={`flex-1 px-4 rounded-xl font-bold text-[11px] tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${!useSalePrice ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <Banknote size={16} /> Preço de Custo
                 </button>
                 <button 
                   onClick={() => setUseSalePrice(true)}
                   className={`flex-1 px-4 rounded-xl font-bold text-[11px] tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${useSalePrice ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <ShoppingCart size={16} /> Preço de Venda
                 </button>
              </div>
            </div>

            {/* Client Selection */}
            <div className="glass-card rounded-[2.5rem] p-6 border-white/20 shadow-2xl relative z-50">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Destinatário (Cliente)</label>
              <div className="relative">
                <button
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent hover:border-indigo-200 rounded-2xl text-left flex justify-between items-center font-bold text-slate-800 dark:text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <User size={20} className={selectedClient ? "text-indigo-600" : "text-slate-300"} />
                    <span>{selectedClient ? selectedClient.name : 'Selecionar cliente cadastrado...'}</span>
                  </div>
                  <ChevronDown size={20} className={`text-slate-300 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isClientDropdownOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full glass rounded-[2rem] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] z-[100] p-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Pesquisar cliente..."
                        className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 rounded-xl outline-none border border-slate-100 dark:border-slate-800 text-sm font-bold dark:text-white"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                      {clients
                        .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                        .map(client => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setIsClientDropdownOpen(false);
                            }}
                            className={`w-full text-left p-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              selectedClient?.id === client.id 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-indigo-600'
                            }`}
                          >
                            {client.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Search */}
            <div className="glass-card rounded-[2.5rem] p-6 border-white/20 flex flex-col gap-6 shadow-2xl">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Buscar produtos (Toners, Impressoras, Peças)..."
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-indigo-600 transition-all text-sm font-bold placeholder:text-slate-300 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {products
                  .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
                  .map(product => (
                    <div key={product.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-indigo-500 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors">
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white tracking-tight uppercase">{product.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">Estoque: {product.stock} un</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all disabled:opacity-30"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Side: Cart Summary */}
          <div className="w-full lg:w-[450px] flex flex-col gap-6">
            <div className="flex-1 glass-card rounded-[2.5rem] border-white/20 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 border-b border-indigo-50/10 bg-indigo-600/5 flex items-center gap-3">
                 <FileText className="text-indigo-500" size={24} />
                 <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Itens da Saída</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-10">
                    <Package size={64} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Carrinho Vazio</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl flex items-center gap-4 animate-in slide-in-from-right-4">
                      <div className="flex-1">
                        <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight truncate w-[180px]">{item.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                          {useSalePrice ? 'Venda' : 'Custo'} Unit: R$ {(useSalePrice ? item.salePrice : item.costPrice)?.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:text-rose-500"><X size={14} /></button>
                        <input 
                          type="number" 
                          className="w-10 text-center bg-transparent font-black text-xs outline-none"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        />
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:text-indigo-500"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-950/50 border-t border-indigo-50/10 space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Observações do Resumo</label>
                  <textarea 
                    className="w-full h-24 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500"
                    placeholder="Ex: Entrega realizada via motoboy..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Valor Estimado ({useSalePrice ? 'Venda' : 'Custo'})</span>
                  <span className="text-3xl font-black text-indigo-600 tracking-tighter">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <button
                  onClick={handleFinish}
                  disabled={loading || cart.length === 0}
                  className={`w-full py-5 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${shipmentType === 'EMPRESTIMO' ? 'bg-amber-500 hover:bg-slate-900 shadow-amber-500/30' : 'bg-indigo-600 hover:bg-slate-900 shadow-indigo-600/30'}`}
                >
                  {loading ? 'Processando...' : <>{shipmentType === 'EMPRESTIMO' ? 'Registrar Empréstimo' : 'Concluir Expedição'} <ArrowRight size={18} /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-200 dark:border-slate-800/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <ShoppingBag className="text-indigo-600" size={32} /> Histórico de Saídas
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Todas as expedições realizadas</p>
                </div>
                <button onClick={loadData} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                  <RefreshCw size={18} />
                </button>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar por cliente..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                  />
                </div>
                <div className="md:col-span-1 flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      title="Data Inicial"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-bold outline-none focus:border-indigo-500 transition-all"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  </div>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      title="Data Final"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-bold outline-none focus:border-indigo-500 transition-all"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="relative">
                   <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <select
                     className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                     value={filterType}
                     onChange={(e) => setFilterType(e.target.value as any)}
                   >
                     <option value="TODOS">Todos os tipos</option>
                     <option value="SAIDA">Saída Definitiva</option>
                     <option value="EMPRESTIMO">Empréstimos</option>
                   </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/30">
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID Expedição</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Destinatário</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data e Hora</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Volume</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Custo Total</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shipments
                    .filter(s => {
                      const matchClient = !filterClient || s.client_name.toLowerCase().includes(filterClient.toLowerCase());
                      const sDate = s.created_at.split('T')[0];
                      const matchStart = !filterDate || sDate >= filterDate;
                      const matchEnd = !filterEndDate || sDate <= filterEndDate;
                      const matchDate = matchStart && matchEnd;
                      const matchType = filterType === 'TODOS' || 
                                       (filterType === 'EMPRESTIMO' && (s.isLoan || s.id.startsWith('EMP-'))) ||
                                       (filterType === 'SAIDA' && !(s.isLoan || s.id.startsWith('EMP-')));
                      return matchClient && matchDate && matchType;
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-10 py-32 text-center text-slate-300 dark:text-slate-600 font-bold italic">Nenhum registro encontrado com os filtros atuais.</td>
                    </tr>
                  ) : (
                    shipments
                      .filter(s => {
                        const matchClient = !filterClient || s.client_name.toLowerCase().includes(filterClient.toLowerCase());
                        const sDate = s.created_at.split('T')[0];
                        const matchStart = !filterDate || sDate >= filterDate;
                        const matchEnd = !filterEndDate || sDate <= filterEndDate;
                        const matchDate = matchStart && matchEnd;
                        const matchType = filterType === 'TODOS' || 
                                         (filterType === 'EMPRESTIMO' && (s.isLoan || s.id.startsWith('EMP-'))) ||
                                         (filterType === 'SAIDA' && !(s.isLoan || s.id.startsWith('EMP-')));
                        return matchClient && matchDate && matchType;
                      })
                      .map((s) => {
                        const isLoan = s.isLoan || s.id.startsWith('EMP-');
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-indigo-500/5 transition-all group">
                            <td className="px-10 py-6">
                              <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-tighter ${isLoan ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'}`}>
                                {s.id}
                              </span>
                            </td>
                            <td className="px-10 py-6">
                              <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{s.client_name}</p>
                              {isLoan && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">[EMPRÉSTIMO]</span>}
                            </td>
                            <td className="px-10 py-6">
                                <div className="text-xs font-bold text-slate-500">
                                    <p>{new Date(s.created_at).toLocaleDateString('pt-BR')}</p>
                                    <p className="opacity-50 tracking-widest">{new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </td>
                            <td className="px-10 py-6 text-center">
                               <span className="text-xs font-black text-slate-600 dark:text-slate-400">{s.items?.length || 0} Itens</span>
                            </td>
                            <td className="px-10 py-6 text-right">
                              <p className="text-base font-black text-slate-900 dark:text-white tracking-tighter">R$ {parseFloat(s.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {isLoan && s.notes && s.notes.includes('[EMPRÉSTIMO PENDENTE]') && (
                                    <button 
                                      onClick={() => setConfirmReturnModal({ show: true, id: s.id })}
                                      className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-amber-500 rounded-2xl hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-xl group/btn"
                                      title="Registrar Devolução"
                                    >
                                      <Package size={20} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setSelectedShipment(s);
                                    setShowPrintModal(true);
                                  }}
                                  className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-xl group/btn"
                                  title="Visualizar Comprovante"
                                >
                                  <Search size={20} className="group-hover/btn:scale-110 transition-transform" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(s.id)}
                                  className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-xl group/btn"
                                  title="Excluir Saída"
                                >
                                  <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* Print Modal / Receipt */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
             <div className="p-8 border-b flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                     {selectedShipment?.id?.startsWith('EMP-') ? 'Comprovante de Empréstimo' : 'Expedição Concluída'}
                  </h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">ID: {selectedShipment?.id || shipmentId}</p>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={showValuesInPrint}
                        onChange={e => setShowValuesInPrint(e.target.checked)}
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600 transition-colors">Exibir Valores</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={handlePrint} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl flex items-center gap-2 font-black text-xs tracking-widest uppercase"><Printer size={18} /> Imprimir (2 Vias)</button>
                    <button onClick={resetShipment} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl"><X size={24} /></button>
                  </div>
                </div>
             </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 print:space-y-0 print-section overflow-x-hidden">
               {/* Copy 1 */}
                <div className="space-y-4 relative print:space-y-2 print-via">
                  <div className="absolute top-0 right-0 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] no-print">Via do Cliente</div>
                  
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-6">
                       {settings.logoUrl && !settings.logoUrl.startsWith('icon:') ? (
                         <img src={settings.logoUrl} alt="Logo" style={{ width: '180px', height: 'auto', maxHeight: '50px', objectFit: 'contain' }} />
                       ) : (
                         <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-indigo-600">
                           <Package size={32} />
                         </div>
                       )}
                       {(!settings.logoUrl || settings.logoUrl.startsWith('icon:')) && (
                         <div>
                           <h4 className="text-lg font-black uppercase text-indigo-600 print:text-base">{settings.companyName || 'Nossa Empresa'}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-[8px]">Resumo de Expedição</p>
                         </div>
                       )}
                     </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Saída</p>
                      <p className="text-sm font-black">{new Date(selectedShipment?.created_at || Date.now()).toLocaleDateString('pt-BR')} {new Date(selectedShipment?.created_at || Date.now()).toLocaleTimeString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mt-4 print:mt-2 print:p-3">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 print:text-[10px]">{selectedShipment?.client_name || selectedClient?.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide print:text-[8px]">{selectedShipment?.notes ? 'Contém Observações' : (selectedClient?.address || 'Endereço não informado')}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase print:text-[8px]">Protocolo: {selectedShipment?.id || shipmentId}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest print:text-[8px]">Data/Hora</p>
                       <p className="text-xs font-black print:text-[10px]">{new Date(selectedShipment?.created_at || Date.now()).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <table className="w-full border-t border-b border-slate-100 mt-2">
                    <thead>
                       <tr className="text-[9px] font-black uppercase text-slate-400 print:text-[8px]">
                         <th className="py-2 text-left">Produto</th>
                         <th className="py-2 text-center">Quant.</th>
                         {showValuesInPrint && <th className="py-2 text-right">Valor un.</th>}
                         {showValuesInPrint && <th className="py-2 text-right">Total</th>}
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(selectedShipment?.items || cart).map((item: any) => (
                         <tr key={item.id} className="text-[10px] font-bold text-slate-700 print:text-[9px]">
                           <td className="py-2 uppercase">{item.name}</td>
                           <td className="py-2 text-center">{item.quantity}</td>
                           {showValuesInPrint && <td className="py-2 text-right">R$ {(item.unit_price || item.costPrice || 0).toFixed(2)}</td>}
                           {showValuesInPrint && <td className="py-2 text-right font-black">R$ {(item.quantity * (item.unit_price || item.costPrice || 0)).toFixed(2)}</td>}
                         </tr>
                      ))}
                    </tbody>
                  </table>

                   <div className="grid grid-cols-2 gap-4 items-end mt-2">
                     <div className="p-3 bg-slate-50 rounded-xl min-h-[40px] print:p-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                        <p className="text-[9px] font-bold text-slate-600 italic whitespace-pre-wrap print:text-[8px] leading-tight">{selectedShipment?.notes || notes || 'Sem observações adicionais.'}</p>
                     </div>
                     {showValuesInPrint && (
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Geral</p>
                          <p className="text-2xl font-black text-slate-900 tracking-tighter print:text-xl">R$ {(selectedShipment?.total || calculateTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                     )}
                   </div>

                  <div className="pt-6 grid grid-cols-2 gap-8 print:pt-4">
                    <div className="border-t border-slate-300 pt-2 text-center">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] print:scale-90">RECEBIMENTO / EMPRESA</p>
                       <div className="flex justify-center mt-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">DATA: ___/___/___</p>
                       </div>
                    </div>
                    <div className="border-t border-slate-300 pt-2 text-center">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] print:scale-90">Aj Informatica</p>
                       <div className="h-4" />
                    </div>
                  </div>
                  <div className="print-separator" />
                </div>

               {/* Copy 2 */}
                <div className="space-y-4 relative print:space-y-2 print-via">
                  <div className="absolute top-0 right-0 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] no-print">Via da Empresa</div>
                  
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-4">
                       {settings.logoUrl && !settings.logoUrl.startsWith('icon:') ? (
                         <img src={settings.logoUrl} alt="Logo" style={{ width: '180px', height: 'auto', maxHeight: '50px', objectFit: 'contain' }} />
                       ) : (
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-indigo-600">
                           <Package size={20} />
                         </div>
                       )}
                       {(!settings.logoUrl || settings.logoUrl.startsWith('icon:')) && (
                         <div>
                           <h4 className="text-lg font-black uppercase text-slate-800 print:text-base">{settings.companyName || 'Nossa Empresa'}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-[8px]">Via do Almoxarifado</p>
                         </div>
                       )}
                     </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo de Saída</p>
                      <p className="text-sm font-black">{selectedShipment?.id || shipmentId}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2 print:p-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-800">{selectedShipment?.client_name || selectedClient?.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Protocolo: {selectedShipment?.id || shipmentId}</p>
                  </div>

                  <table className="w-full border-t border-b border-slate-100 mt-2">
                    <thead>
                       <tr className="text-[9px] font-black uppercase text-slate-400 print:text-[8px]">
                         <th className="py-2 text-left">Produto</th>
                         <th className="py-2 text-center">Quant.</th>
                         {showValuesInPrint && <th className="py-2 text-right">Total</th>}
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(selectedShipment?.items || cart).map((item: any) => (
                         <tr key={item.id} className="text-[10px] font-bold text-slate-700 print:text-[9px]">
                           <td className="py-2 uppercase">{item.name}</td>
                           <td className="py-2 text-center">{item.quantity}</td>
                           {showValuesInPrint && <td className="py-2 text-right font-black">R$ {(item.quantity * (item.unit_price || item.costPrice || 0)).toFixed(2)}</td>}
                         </tr>
                      ))}
                    </tbody>
                  </table>

                   <div className="grid grid-cols-2 gap-4 items-end mt-2">
                     <div className="p-3 bg-slate-50 rounded-xl min-h-[40px] print:p-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações Internas</p>
                        <p className="text-[9px] font-bold text-slate-600 italic print:text-[8px]">{selectedShipment?.notes || notes || 'N/A'}</p>
                     </div>
                     {showValuesInPrint && (
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                          <p className="text-xl font-black text-slate-900 tracking-tighter print:text-lg">R$ {(selectedShipment?.total || calculateTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                     )}
                   </div>

                  <div className="pt-6 grid grid-cols-2 gap-8 print:pt-4">
                    <div className="border-t border-slate-300 pt-2 text-center">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] print:scale-90">RECEBIMENTO / EMPRESA</p>
                       <div className="flex justify-center mt-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">DATA: ___/___/___</p>
                       </div>
                    </div>
                    <div className="border-t border-slate-300 pt-2 text-center">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] print:scale-90">Aj Informatica</p>
                       <div className="h-4" />
                    </div>
                  </div>
               </div>
            </div>
            
            <style>{`
              @media print {
                @page { 
                  size: A4; 
                  margin: 0; 
                }
                
                /* Reset absoluto para evitar interferência do index.css */
                html, body, #root {
                  margin: 0 !important;
                  padding: 0 !important;
                  height: 297mm !important;
                  overflow: hidden !important;
                  visibility: hidden !important;
                  background: white !important;
                }
                
                .print-section {
                  visibility: visible !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  display: block !important;
                  overflow: hidden !important;
                  z-index: 99999 !important;
                }

                .print-section * {
                  visibility: visible !important;
                }

                .print-via {
                  height: 148.5mm !important; 
                  width: 210mm !important;
                  padding: 10mm 15mm !important;
                  box-sizing: border-box !important;
                  position: relative !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: flex-start !important;
                  background: white !important;
                  border: none !important;
                }

                .print-separator {
                  position: absolute !important;
                  top: 148.5mm !important;
                  left: 0 !important;
                  width: 100% !important;
                  border-top: 1px dashed #94a3b8 !important;
                  height: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                  z-index: 100 !important;
                }

                .no-print, button, .shrink-0, .no-print-global { 
                  display: none !important; 
                }
              }
            `}</style>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmDeleteModal.show}
        onClose={() => setConfirmDeleteModal({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão?"
        message={`Esta ação é irreversível. O estoque dos produtos será devolvido automaticamente ao armazém.\n\nProtocolo: ${confirmDeleteModal.id}`}
        confirmText={loading ? 'Processando...' : 'Sim, Excluir'}
      />

      <ConfirmModal 
        isOpen={confirmReturnModal.show}
        onClose={() => setConfirmReturnModal({ show: false, id: null })}
        onConfirm={confirmReturn}
        title="Confirmar Devolução?"
        message={`O material deste empréstimo foi devolvido?\nIsso irá retornar os itens ao estoque.\n\nProtocolo: ${confirmReturnModal.id}`}
        confirmText={loading ? 'Processando...' : 'Sim, Devolvido'}
      />

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

export default MaterialShipment;
