
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Plus, Minus, CheckCircle2, FileText, X, Wrench, ChevronRight, User as UserIcon, Wallet, ArrowRight, Activity } from 'lucide-react';
import { api } from '../services/api';
import { Product, PaymentMethod, TransactionType } from '../types';

interface CartItem extends Product {
  quantity: number;
  discountPerItem: number;
  osId?: number;
}

interface POSProps {
  showValues: boolean;
}

const PaymentBtn: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${
      active 
      ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg scale-105 active:scale-95' 
      : 'border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-400 hover:border-indigo-400 dark:hover:border-slate-600 hover:text-indigo-500'
    }`}
  >
    {active && <div className="absolute inset-0 shimmer opacity-20" />}
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-indigo-100' : 'text-slate-400'}`}>{label}</span>
  </button>
);

const POS: React.FC<POSProps> = ({ showValues }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [showSuccess, setShowSuccess] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'VALUE' | 'PERCENT'>('VALUE');
  const [posTab, setPosTab] = useState<'VENDAS' | 'ORÇAMENTOS' | 'OS'>('VENDAS');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showQuoteSuccess, setShowQuoteSuccess] = useState(false);
  const [osNumberInProgress, setOsNumberInProgress] = useState<string | null>(null);
  const [boletoInstallments, setBoletoInstallments] = useState('1');
  const [boletoInterval, setBoletoInterval] = useState('30');

  useEffect(() => {
    api.getProducts().then(setProducts);
    api.getClients().then(setClients);
    loadQuotes();
    loadServiceOrders();
  }, []);

  const loadServiceOrders = async () => {
    const data = await api.getServiceOrders();
    setServiceOrders(data.filter(os => os.status === 'ABERTA'));
  };

  const loadQuotes = async () => {
    const data = await api.getQuotes();
    setQuotes(data);
  };

  const total = cart.reduce((sum, item) => sum + ((Number(item.salePrice || 0) - Number(item.discountPerItem || 0)) * item.quantity), 0);
  
  const finalTotal = useMemo(() => {
    const discVal = Number(discount) || 0;
    if (isNaN(discVal) || discVal < 0) return total;
    if (discountType === 'VALUE') return Math.max(0, total - discVal);
    return Math.max(0, total * (1 - discVal / 100));
  }, [total, discount, discountType]);

  const paidVal = Number(amountPaid) || 0;
  const change = useMemo(() => {
    if (paidVal < finalTotal) return 0;
    return paidVal - finalTotal;
  }, [paidVal, finalTotal]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm)
    );
  }, [searchTerm, products]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, discountPerItem: 0 }];
    });
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateItemDiscount = (id: string, discount: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, discountPerItem: discount };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const formatCurrency = (val: number) => {
    return `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleFinishSale = async () => {
    if (cart.length === 0) return;
    const { nextNumber: saleNumber } = await api.getNextSaleNumber();
    
    const discVal = Number(discount) || 0;
    let discountRatio = 1;
    if (total > 0) {
      if (discountType === 'VALUE') {
        discountRatio = Math.max(0, total - discVal) / total;
      } else {
        discountRatio = Math.max(0, 1 - discVal / 100);
      }
    }

    const transactions = cart.map(item => {
        const itemSubtotal = (item.salePrice - (item.discountPerItem || 0)) * item.quantity;
        const itemDiscountedTotal = itemSubtotal * discountRatio;
        const itemDiscountedUnitPrice = itemDiscountedTotal / item.quantity;

        return {
            id: saleNumber,
            productId: item.id,
            productName: item.name,
            type: TransactionType.SALE,
            quantity: item.quantity,
            unitPrice: itemDiscountedUnitPrice,
            total: itemDiscountedTotal,
            discount: (item.salePrice * item.quantity) - itemDiscountedTotal,
            paymentMethod,
            clientName: clientName || 'Consumidor Final',
            osNumber: osNumberInProgress,
            createdAt: new Date().toISOString(),
            installments: paymentMethod === PaymentMethod.BOLETO ? parseInt(boletoInstallments) : 1,
            interval: paymentMethod === PaymentMethod.BOLETO ? parseInt(boletoInterval) : 0,
        };
    });
    await api.addTransaction(transactions);
    for (const item of cart) {
        if (item.osId) await api.updateOSStatus(item.osId, 'CONCLUIDA');
    }
    setCart([]);
    setAmountPaid(0);
    setDiscount(0);
    setOsNumberInProgress(null);
    setShowSuccess(true);
    api.getProducts().then(setProducts);
    loadServiceOrders();
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleLoadOS = (os: any) => {
    const osItem: CartItem = {
      id: `OS-${os.number}`,
      name: `Serviço OS #${os.number} - ${os.equipment}${os.service_description ? ` (${os.service_description})` : ''}`,
      barcode: os.number,
      salePrice: os.total_cost,
      quantity: 1,
      discountPerItem: 0,
      stock: 1,
      minStock: 0,
      costPrice: os.parts_cost || 0,
      category: 'Serviços',
      osId: os.id
    };
    setCart([osItem]);
    setClientName(os.client_name);
    setOsNumberInProgress(os.number);
    setPosTab('VENDAS');
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-7rem)] max-w-[1780px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        <div className="flex gap-1.5 p-1 glass rounded-xl w-fit border border-white/10 shadow-sm">
          {[
            { id: 'VENDAS', label: 'Caixa Vendas' },
            { id: 'OS', label: 'Serviços OS' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setPosTab(tab.id as any)}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${posTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white/40 dark:bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700/30">
          <Activity size={12} className="text-indigo-600 animate-pulse" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">&bull; <span className="text-indigo-600 font-black">Online</span></p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {posTab === 'VENDAS' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
            {/* Main Area: Search & Cart */}
            <div className="lg:col-span-8 flex flex-col gap-3 min-h-0">
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-all" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escaneie ou busque produtos..."
                  className="w-full pl-14 pr-6 py-4 bg-white/80 dark:bg-slate-900/80 border border-transparent rounded-2xl shadow-lg focus:border-indigo-500/50 outline-none transition-all text-base font-black text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 backdrop-blur-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                {/* Dropdown Results */}
                {filteredProducts.length > 0 && (
                  <div className="absolute top-[calc(100%+6px)] left-0 w-full premium-glass rounded-2xl border border-white/10 shadow-2xl z-[100] max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full flex items-center justify-between p-4 hover:bg-indigo-600/5 dark:hover:bg-slate-800/60 text-left border-b last:border-0 border-indigo-50/5 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Plus size={16} />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-sm text-slate-800 dark:text-white tracking-tight">{p.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">{p.barcode} • ESTOQUE: {p.stock}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xl text-indigo-600">{formatCurrency(p.salePrice)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Container */}
              <div className="flex-1 premium-glass rounded-3xl overflow-hidden flex flex-col relative border border-white/10 shadow-md min-h-0">
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-indigo-600/5">
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={18} className="text-indigo-600" />
                    <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tighter uppercase">Itens no Carrinho</h3>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-black text-indigo-600">{cart.length} UNIDADES</span>
                     <button onClick={() => setCart([])} className="p-2 text-slate-400 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-500/10">
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2.5 min-h-0">
                  {cart.length > 0 ? (
                    <div className="space-y-2.5 animate-in fade-in duration-300">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white/20 dark:bg-slate-900/30 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all group relative">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shadow-sm transition-transform group-hover:scale-105">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingCart size={24} className="text-slate-300" />
                                )}
                              </div>
                              <div className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-lg border-2 border-white dark:border-slate-900">
                                {item.quantity}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-sm text-slate-800 dark:text-gray-100 truncate tracking-tight">{item.name}</p>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md uppercase">{item.barcode}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">U: {formatCurrency(item.salePrice)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8 shrink-0">
                            <div className="flex items-center bg-white/40 dark:bg-slate-950/40 p-1 rounded-xl border border-white/5">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all">
                                <Minus size={12} />
                              </button>
                              <span className="w-10 text-center font-black text-base text-slate-800 dark:text-white">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all">
                                <Plus size={12} />
                              </button>
                            </div>
                            
                           <div className="text-right min-w-[150px] flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2 bg-rose-500/5 px-2 py-1 rounded-lg border border-rose-500/10">
                                <span className="text-[9px] font-black text-rose-500 uppercase">Desc/Un:</span>
                                <input 
                                  type="number"
                                  className="w-16 bg-transparent text-right font-black text-xs text-rose-500 outline-none"
                                  value={item.discountPerItem || ''}
                                  placeholder="0,00"
                                  onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <p className="text-lg font-black text-indigo-600 tracking-tighter">{formatCurrency((item.salePrice - (item.discountPerItem || 0)) * item.quantity)}</p>
                            </div>

                            <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-500/10">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                      <div className="p-10 bg-slate-50 dark:bg-white/5 rounded-full">
                        <ShoppingCart size={48} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Seu Carrinho está Vazio</p>
                    </div>
                  )}
                </div>

                {/* Subtotal bar */}
                <div className="px-6 py-4 border-t border-white/5 bg-indigo-600/5 flex justify-between items-center shrink-0">
                   <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Subtotal dos Itens</p>
                   <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Payment & Checkout */}
            <div className="lg:col-span-4 flex flex-col min-h-0 bg-white/10 dark:bg-slate-900/20 rounded-3xl border border-white/5 p-5 shadow-2xl relative overflow-hidden h-full">
              <div className="flex flex-col gap-4 h-full">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Check-out</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Finalização</p>
                  </div>
                  <Wallet size={18} className="text-indigo-600" />
                </div>

                {/* Client Select - Compact */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <UserIcon size={12} className="text-indigo-500" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificar Cliente</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Consumidor Final"
                      className="w-full px-4 py-3.5 bg-white/40 dark:bg-slate-950/40 border border-white/10 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-300"
                      value={clientName}
                      onChange={e => {
                        setClientName(e.target.value);
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                    />
                    {showClientDropdown && clientSearch.length > 1 && (
                      <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mt-1 shadow-2xl z-50 max-h-48 overflow-y-auto">
                        {clients
                          .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                          .map(c => (
                            <button
                              key={c.id}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-600/5 text-sm font-bold border-b border-slate-100 dark:border-slate-800 last:border-0"
                              onClick={() => {
                                setClientName(c.name);
                                setShowClientDropdown(false);
                                setClientSearch('');
                              }}
                            >
                              {c.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Methods Grid */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <CreditCard size={12} className="text-indigo-500" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meio de Pagamento</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: PaymentMethod.CASH, icon: <Banknote size={20} />, label: 'Dinheiro' },
                      { id: PaymentMethod.PIX, icon: <QrCode size={20} />, label: 'PIX' },
                      { id: PaymentMethod.CARD, icon: <CreditCard size={20} />, label: 'Cartão' },
                      { id: PaymentMethod.BOLETO, icon: <FileText size={20} />, label: 'Boleto' }
                    ].map(method => (
                      <PaymentBtn
                        key={method.id}
                        active={paymentMethod === method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        icon={method.icon}
                        label={method.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Totals & Summary Area - Reorganized for better fit */}
                <div className="flex-1 flex flex-col justify-end gap-3 min-h-0 mt-auto pt-4 border-t border-white/5 relative z-10">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Discount Box */}
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col justify-center gap-1.5 transition-all">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Desconto</span>
                      <div className="flex items-center gap-1.5 justify-between">
                         <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-white/5 shrink-0">
                            <button onClick={() => setDiscountType('VALUE')} className={`px-1.5 py-0.5 text-[8px] font-black rounded ${discountType === 'VALUE' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}>R$</button>
                            <button onClick={() => setDiscountType('PERCENT')} className={`px-1.5 py-0.5 text-[8px] font-black rounded ${discountType === 'PERCENT' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}>%</button>
                         </div>
                         <input 
                            type="text" 
                            className="w-full text-right font-black text-rose-500 bg-transparent border-b border-rose-500/20 focus:border-rose-500 outline-none text-sm p-1"
                            value={discountType === 'VALUE' ? discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : discount}
                            onChange={e => {
                              if (discountType === 'VALUE') {
                                const val = e.target.value.replace(/\D/g, "");
                                setDiscount(Number(val) / 100);
                              } else {
                                setDiscount(Number(e.target.value));
                              }
                            }}
                          />
                      </div>
                    </div>

                    {/* Amount Paid Box - Shown conditional to Cash, but keeping layout stable */}
                    <div className={`bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col justify-center gap-1.5 transition-all ${paymentMethod === PaymentMethod.CASH ? 'opacity-100' : 'opacity-30'}`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-1 ${paymentMethod === PaymentMethod.CASH ? 'text-indigo-500' : 'text-slate-400'}`}>Recebido</span>
                      {paymentMethod === PaymentMethod.CASH ? (
                        <input 
                          type="text" 
                          placeholder="0,00"
                          className="w-full text-right bg-transparent font-black text-base outline-none text-slate-800 dark:text-white border-b-2 border-indigo-500/30 p-1"
                          value={amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, "");
                            setAmountPaid(Number(val) / 100);
                          }}
                        />
                      ) : (
                        <div className="text-right font-black text-sm p-1">---</div>
                      )}
                    </div>
                  </div>

                  {/* Boleto Installments & Interval - Shown conditional to Boleto */}
                  {paymentMethod === PaymentMethod.BOLETO && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="bg-indigo-600/5 p-3 rounded-2xl border border-indigo-500/20 flex flex-col justify-center gap-1.5 transition-all">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1">Nº Parcelas</span>
                        <input 
                          type="number" 
                          min="1"
                          className="w-full text-right bg-transparent font-black text-base outline-none text-indigo-600 border-b-2 border-indigo-500/30 p-1"
                          value={boletoInstallments}
                          onChange={e => setBoletoInstallments(e.target.value)}
                        />
                      </div>
                      <div className="bg-indigo-600/5 p-3 rounded-2xl border border-indigo-500/20 flex flex-col justify-center gap-1.5 transition-all">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1">Prazo (Dias)</span>
                        <input 
                          type="number" 
                          min="0"
                          step="1"
                          placeholder="30"
                          className="w-full text-right bg-transparent font-black text-base outline-none text-indigo-600 border-b-2 border-indigo-500/30 p-1"
                          value={boletoInterval}
                          onChange={e => setBoletoInterval(e.target.value)}
                        />
                      </div>
                      {parseInt(boletoInstallments) > 1 && (
                        <div className="col-span-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                          <p className="text-[9px] font-bold text-indigo-600 uppercase">
                            {boletoInstallments}x de {formatCurrency(finalTotal / parseInt(boletoInstallments || '1'))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Troco a devolver - Inline message */}
                  {paymentMethod === PaymentMethod.CASH && change > 0 && (
                    <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 animate-in fade-in slide-in-from-top-1">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Troco</span>
                      <span className="font-black text-xl text-emerald-600">{formatCurrency(change)}</span>
                    </div>
                  )}

                  <div className="text-center py-1">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">Total Líquido</p>
                    <p className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{formatCurrency(finalTotal)}</p>
                  </div>

                  <button 
                    disabled={cart.length === 0 || !clientName.trim()}
                    onClick={handleFinishSale}
                    className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group/finish ${
                      (cart.length > 0 && clientName.trim())
                      ? 'bg-indigo-600 text-white hover:bg-slate-900 active:scale-95' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Finalizar Venda</span> 
                    <ArrowRight size={18} className="group-hover/finish:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full glass-card rounded-3xl overflow-hidden flex flex-col border border-white/5 animate-in fade-in duration-300">
             <div className="px-6 py-4 border-b border-white/5 bg-indigo-600/5 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tighter">Ordens de Serviço</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gerenciamento em tempo real</p>
                </div>
                <div className="bg-indigo-600/10 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black">
                  {serviceOrders.length} EM ABERTO
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                {serviceOrders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {serviceOrders.map(os => (
                       <div key={os.id} className="relative group overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 transition-all hover:border-indigo-500 hover:shadow-md">
                          <div className="space-y-4">
                             <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                   <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg mb-2 inline-block shadow-md">OS #{os.number}</span>
                                   <h4 className="text-base font-black text-slate-800 dark:text-white truncate">{os.client_name}</h4>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase truncate mt-0.5">{os.equipment}</p>
                                </div>
                                <Wrench size={18} className="text-slate-200 group-hover:text-indigo-500 transition-colors" />
                             </div>

                             <div className="py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100/50 dark:border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Serviço + Peças</p>
                                <p className="text-xl font-black text-indigo-600">{formatCurrency(os.total_cost)}</p>
                             </div>

                             <button 
                               onClick={() => handleLoadOS(os)}
                               className="w-full py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                             > 
                               Baixar no Caixa <ChevronRight size={14} />
                             </button>
                          </div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
                      <Wrench size={64} className="text-slate-300" />
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-4">Sem ordens pendentes</p>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {(showSuccess || showQuoteSuccess) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-8 animate-in zoom-in-75 duration-500 max-w-md w-full mx-4 border border-white/10 text-center">
            <div className={`w-20 h-20 ${showQuoteSuccess ? 'bg-indigo-600' : 'bg-emerald-500'} text-white rounded-[1.5rem] flex items-center justify-center shadow-lg relative z-10 animate-bounce`}>
              <CheckCircle2 size={40} />
            </div>
            
            <div className="space-y-3">
              <h2 className={`text-3xl font-black ${showQuoteSuccess ? 'text-indigo-600' : 'text-emerald-500'} uppercase tracking-tighter`}>
                {showQuoteSuccess ? 'Orçamento Salvo' : 'Venda Concluída'}
              </h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Operação Finalizada com Sucesso</p>
            </div>

            {change > 0 && !showQuoteSuccess && (
              <div className="w-full bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 opacity-60">Troco a Devolver</p>
                <div className="text-4xl font-black text-emerald-600 tracking-tighter">{formatCurrency(change)}</div>
              </div>
            )}
            
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Retornando ao Caixa</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default POS;
