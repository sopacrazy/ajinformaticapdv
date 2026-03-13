
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Transaction, PaymentMethod, StoreSettings } from '../types';
import { 
  Search, 
  Calendar, 
  Eye, 
  FileText, 
  X, 
  Printer, 
  Trash2,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  User as UserIcon
} from 'lucide-react';

const SalesToday: React.FC = () => {
  const [sales, setSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Transaction[] | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ 
    companyName: '', 
    logoUrl: '',
    pixKey: '',
    pixFavorecido: '',
    signatureName: '',
    cnpj: '',
    inscEst: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchSales();
    api.getSettings().then(setStoreSettings);
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await api.getTodaySales();
      const filtered = data.filter(t => t.type === 'SALE');
      setSales(filtered);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group transactions by ID
  const groupedSales = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    sales.forEach(s => {
      if (!groups[s.id]) groups[s.id] = [];
      groups[s.id].push(s);
    });
    
    // Convert to array of representative objects
    return Object.values(groups).map(items => {
      const total = items.reduce((sum, i) => sum + i.total, 0);
      return {
        id: items[0].id,
        clientName: items[0].clientName || 'Consumidor Final',
        paymentMethod: items[0].paymentMethod || PaymentMethod.CASH,
        createdAt: items[0].createdAt,
        total: total,
        itemCount: items.length,
        items: items
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales]);

  const filteredGroups = groupedSales.filter(g => 
    g.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (items: Transaction[]) => {
    setSelectedSale(items);
    setShowDetailModal(true);
  };

  const handlePrintReceipt = (items: Transaction[]) => {
    const total = items.reduce((sum, i) => sum + i.total, 0);
    const clientName = items[0].clientName || 'Consumidor Final';
    const date = new Date(items[0].createdAt).toLocaleDateString('pt-BR');
    const time = new Date(items[0].createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const paymentMethod = items[0].paymentMethod || 'DINHEIRO';

    const toExtenso = (num: number) => {
      const centavos = Math.round((num % 1) * 100);
      const reais = Math.floor(num);
      const formatNumber = (n: number) => {
        const unidades = ['', 'UM', 'DOIS', 'TRÊS', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE'];
        const dez_a_dezenove = ['DEZ', 'ONZE', 'DOZE', 'TREZE', 'QUATORZE', 'QUINZE', 'DEZESSEIS', 'DEZESSETE', 'DEZOITO', 'DEZENOVE'];
        const dezenas = ['', '', 'VINTE', 'TRINTA', 'QUARENTA', 'CINQUENTA', 'SESSENTA', 'SETENTA', 'OITENTA', 'NOVENTA'];
        const centenas = ['', 'CENTO', 'DUZENTOS', 'TREZENTOS', 'QUATROCENTOS', 'QUINHENTOS', 'SEISCENTOS', 'SETECENTOS', 'OITOCENTOS', 'NOVECENTOS'];
        if (n === 0) return 'ZERO';
        if (n === 100) return 'CEM';
        let res = '';
        if (n >= 100) { res += centenas[Math.floor(n / 100)]; n %= 100; if (n > 0) res += ' E '; }
        if (n >= 20) { res += dezenas[Math.floor(n / 10)]; n %= 10; if (n > 0) res += ' E '; }
        else if (n >= 10) { res += dez_a_dezenove[n - 10]; n = 0; }
        if (n > 0) { res += unidades[n]; }
        return res;
      };
      let extenso = formatNumber(reais) + (reais === 1 ? ' REAL' : ' REAIS');
      if (centavos > 0) extenso += ' E ' + formatNumber(centavos) + (centavos === 1 ? ' CENTAVO' : ' CENTAVOS');
      return extenso;
    };

    const totalExtenso = toExtenso(total);

    const itemsHtml = items.map((item, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>${item.productName}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: 700;">${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const logoHtml = storeSettings.logoUrl && !storeSettings.logoUrl.startsWith('icon:') 
      ? `<img src="${storeSettings.logoUrl}" style="max-height: 80px; margin-bottom: 5px;" />` 
      : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>RECIBO - ${items[0].id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 0; 
              margin: 0; 
              color: #0f172a; 
              font-size: 11pt; 
              background: #fff;
            }
            .page { 
              padding: 1cm; 
              max-width: 210mm; 
              margin: 0 auto;
              min-height: 297mm;
              display: flex;
              flex-direction: column;
            }
            
            .header { text-align: center; margin-bottom: 15px; }
            .receipt-title { 
              font-size: 24pt; 
              font-weight: 900; 
              margin: 5px 0 15px;
              color: #334155;
            }

            .info-grid { 
              display: grid;
              grid-template-cols: 1fr 1fr;
              border-bottom: 2.5px solid #334155;
              padding-bottom: 8px;
              margin-bottom: 15px;
            }
            .info-label { font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
            .info-value { font-size: 10pt; font-weight: 700; }

            .declaracao-container {
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px 15px;
              margin-bottom: 15px;
              text-align: center;
              line-height: 1.5;
              font-size: 11pt;
              background-color: #fbfcfe;
            }
            .declaracao-container b { color: #000; font-weight: 900; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { 
              border-bottom: 2.5px solid #334155; 
              padding: 8px; 
              text-align: left; 
              font-size: 9pt; 
              font-weight: 900; 
              text-transform: uppercase;
              color: #334155;
            }
            td { padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 10pt; color: #475569; }

            .flex-bottom { display: flex; justify-content: space-between; gap: 20px; margin-top: 10px; }
            
            .pix-section {
              flex: 1;
              background: #f0f9ff;
              border: 2px dashed #0ea5e9;
              border-radius: 12px;
              padding: 10px;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .pix-section .label { color: #0369a1; font-weight: 900; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 2px; }
            .pix-section .key { font-size: 14pt; font-weight: 900; color: #082f49; }
            .pix-section .favorecido { font-size: 8.5pt; font-weight: 700; color: #0c4a6e; opacity: 0.8; }

            .totals-section { flex: 0.8; display: flex; flex-direction: column; gap: 4px; }
            .total-item { 
              display: flex; 
              justify-content: space-between; 
              padding: 4px 10px;
              border-bottom: 1px solid #f1f5f9;
            }
            .total-item .label { font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .total-item .value { font-size: 10pt; font-weight: 700; color: #334155; }
            
            .total-destaque { 
              background: #334155; 
              color: white; 
              padding: 10px; 
              border-radius: 10px;
              margin-top: 5px;
            }
            .total-destaque .label { font-size: 8.5pt; font-weight: 800; opacity: 0.8; text-transform: uppercase; }
            .total-destaque .value { font-size: 18pt; font-weight: 900; }

            .signature-section { margin-top: auto; padding-top: 30px; display: flex; justify-content: flex-end; }
            .signature-wrap { width: 250px; text-align: center; }
            .signature-line { border-top: 2px solid #334155; margin-bottom: 6px; }
            .signature-info { font-size: 10pt; font-weight: 800; color: #1e293b; }

            .footer-info {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px solid #e2e8f0;
              font-size: 8.5pt;
              color: #64748b;
              text-align: center;
              line-height: 1.4;
            }
            .footer-info b { color: #334155; font-weight: 800; }

            @media print {
              @page { margin: 0; size: A4 portrait; }
              body { padding: 0; }
              .page { border: none; padding: 1cm; height: 100vh; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              ${logoHtml}
              <div style="font-size: 16pt; font-weight: 900; color: #1e293b; margin-bottom: 5px; text-transform: uppercase;">${storeSettings.companyName || 'AJ INFORMÁTICA'}</div>
              <div class="receipt-title" style="color: #000;">RECIBO</div>
            </div>

            <div class="info-grid">
               <div>
                  <div class="info-label">Controle de Venda</div>
                  <div class="info-value">#${items[0].id.toUpperCase()}</div>
               </div>
               <div style="text-align: right;">
                  <div class="info-label">Emissão do Documento</div>
                  <div class="info-value">${date} às ${time}</div>
               </div>
            </div>

            <div class="declaracao-container">
              Recebemos de <b>${clientName.toUpperCase()}</b> a importância total de <br/>
              <b style="font-size: 16pt;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b><br/>
              <span style="font-size: 9.5pt; color: #64748b; font-weight: 600;">(${totalExtenso})</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">Item</th>
                  <th>Especificação do Produto / Serviço</th>
                  <th style="width: 80px; text-align: center;">Qtd.</th>
                  <th style="width: 120px; text-align: right;">Valor Unit.</th>
                  <th style="width: 120px; text-align: right;">Total Item</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="flex-bottom">
               <div class="pix-section">
                  <div class="label">Pagamento Via PIX (Cópia e Cola)</div>
                  <div class="key">${storeSettings.pixKey || '08.859.294/0001-13'}</div>
                  <div class="favorecido">Favorecido: ${storeSettings.pixFavorecido || 'AJ INFORMÁTICA'}</div>
               </div>
 
               <div class="totals-section">
                  <div class="total-item">
                    <span class="label">Subtotal</span>
                    <span class="value">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="total-item">
                    <span class="label">Forma de Pgto</span>
                    <span class="value" style="color: #000;">${paymentMethod}</span>
                  </div>
                  <div class="total-destaque">
                    <div class="label">Total Liquidado</div>
                    <div class="value">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
               </div>
            </div>
 
            <div class="signature-section">
               <div class="signature-wrap">
                  <div class="signature-line"></div>
                  <div class="signature-info">${storeSettings.signatureName || 'Alex Santos'}</div>
               </div>
            </div>
 
            <div class="footer-info">
               <div>
                  <b>CNPJ:</b> ${storeSettings.cnpj || '08.859.294/0001-13'} | <b>Insc. Est:</b> ${storeSettings.inscEst || '15.271.024-8'} | <b>${storeSettings.phone || '(91) 98827-1517'}</b> | ${storeSettings.email || 'alexsantos225@hotmail.com'}<br/>
                  ${storeSettings.address || 'Alameda Imperial nº 51, São José, Castanhal - PA'}
               </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-glass p-6 rounded-[2rem] border border-white/10 shadow-lg flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Vendas Hoje</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{groupedSales.length}</p>
          </div>
        </div>

        <div className="premium-glass p-6 rounded-[2rem] border border-white/10 shadow-lg flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Financeiro</p>
            <p className="text-2xl font-black text-emerald-600 tracking-tighter">
              {formatCurrency(groupedSales.reduce((sum, g) => sum + g.total, 0))}
            </p>
          </div>
        </div>

        <div className="premium-glass p-6 rounded-[2rem] border border-white/10 shadow-lg flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Operação</p>
            <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="premium-glass rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
        <div className="px-8 py-6 border-b border-white/5 bg-white/5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Últimas Vendas</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Histórico diário em tempo real</p>
            </div>
          </div>

          <div className="relative group max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-all" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por cliente ou ID..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-slate-700 dark:text-gray-200 transition-all placeholder:text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-4 md:p-8">
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando vendas...</p>
             </div>
          ) : filteredGroups.length > 0 ? (
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Venda ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((sale) => (
                  <tr key={sale.id} className="group odd:bg-white/5 even:bg-white/2 hover:bg-white/10 transition-all rounded-2xl shadow-sm border border-transparent hover:border-indigo-500/20">
                    <td className="px-6 py-5 rounded-l-2xl">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-600/5 px-3 py-1.5 rounded-lg border border-indigo-600/10 font-mono">
                        #{sale.id.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-[10px] flex items-center justify-center text-slate-400">
                          <UserIcon size={14} />
                        </div>
                        <span className="text-sm font-black text-slate-800 dark:text-gray-200 tracking-tight">{sale.clientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-400">
                      {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         {sale.paymentMethod === PaymentMethod.PIX && <QrCode size={14} className="text-sky-500" />}
                         {sale.paymentMethod === PaymentMethod.CASH && <Banknote size={14} className="text-emerald-500" />}
                         {sale.paymentMethod === PaymentMethod.CARD && <CreditCard size={14} className="text-violet-500" />}
                         <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{sale.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-500">{sale.itemCount} {sale.itemCount === 1 ? 'item' : 'itens'}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-base font-black text-slate-800 dark:text-white tracking-tighter">{formatCurrency(sale.total)}</span>
                    </td>
                    <td className="px-6 py-5 rounded-r-2xl">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                        <button 
                          onClick={() => handleViewDetails(sale.items)}
                          className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="Ver Detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handlePrintReceipt(sale.items)}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-sm"
                          title="Gerar Recibo"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
              <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                <FileText size={48} className="text-slate-300" />
              </div>
              <h4 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nenhuma venda realizada</h4>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em] mt-2">Vendas efetuadas aparecerão aqui automaticamente</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             <div className="px-8 py-6 border-b border-white/5 bg-indigo-600/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                    <Search size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Detalhes da Venda</h3>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest leading-none mt-1 font-mono">Venda #{selectedSale[0].id.toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                  <X size={20} />
                </button>
             </div>

             <div className="p-8 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações do Cliente</p>
                    <p className="text-base font-black text-slate-800 dark:text-white tracking-tight">{selectedSale[0].clientName || 'Consumidor Final'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Operacional</p>
                    <p className="text-base font-black text-slate-800 dark:text-white tracking-tight">
                      {new Date(selectedSale[0].createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 dark:border-white/5">
                    <span className="col-span-1">#</span>
                    <span className="col-span-6">Produto / Serviço</span>
                    <span className="col-span-1 text-center">Qtd</span>
                    <span className="col-span-2 text-right">Unitário</span>
                    <span className="col-span-2 text-right">Subtotal</span>
                  </div>
                  {selectedSale.map((item, index) => (
                    <div key={index} className="px-4 py-4 bg-white/5 rounded-2xl grid grid-cols-12 text-sm items-center border border-white/5">
                      <span className="col-span-1 font-bold text-slate-400">{index + 1}</span>
                      <span className="col-span-6 font-black text-slate-800 dark:text-white truncate tracking-tight">{item.productName}</span>
                      <span className="col-span-1 text-center font-bold">{item.quantity}</span>
                      <span className="col-span-2 text-right text-slate-500">{formatCurrency(item.unitPrice)}</span>
                      <span className="col-span-2 text-right font-black text-indigo-600">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
             </div>

             <div className="p-8 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Método de Pgto</span>
                    <span className="text-xs font-black text-indigo-600 uppercase bg-indigo-600/5 px-2 py-1 rounded-lg">{selectedSale[0].paymentMethod}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total da Venda</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">
                      {formatCurrency(selectedSale.reduce((sum, i) => sum + i.total, 0))}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                   <button 
                    onClick={() => handlePrintReceipt(selectedSale)}
                    className="flex items-center gap-2 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20"
                   >
                     <Printer size={18} />
                     Gerar Recibo
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesToday;
