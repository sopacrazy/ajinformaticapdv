
import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, ArrowUpCircle, ArrowDownCircle, Plus, Calendar, Filter, 
  X, Banknote, QrCode, CreditCard, ChevronRight, Hash, Clock, User, Package, AlertCircle, CheckCircle, Trash2 
} from 'lucide-react';

import { FinanceType, FinanceStatus, FinanceRecord, PaymentMethod, Transaction } from '../types';

interface FinanceProps {
  showValues: boolean;
}

import { api } from '../services/api';
// ... other imports

const Finance: React.FC<FinanceProps> = ({ showValues }) => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [filter, setFilter] = useState<FinanceType | 'ALL'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    description: '',
    amount: '',
    type: FinanceType.PAYABLE,
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadFinance();
  }, []);

  const loadFinance = async () => {
    const data = await api.getFinance();
    setRecords(data);
  };

  const totals = useMemo(() => {
    const receivable = records
      .filter(r => r.type === FinanceType.RECEIVABLE && r.status === FinanceStatus.PAID)
      .reduce((sum, r) => sum + r.amount, 0);
    
    const payable = records
      .filter(r => r.type === FinanceType.PAYABLE && r.status === FinanceStatus.PAID)
      .reduce((sum, r) => sum + r.amount, 0);

    return { receivable, payable, balance: receivable - payable };
  }, [records]);

  const [itemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  const filteredRecords = records.filter(r => {
    const typeMatch = filter === 'ALL' || r.type === filter;
    const statusMatch = statusFilter === 'ALL' || r.status === (statusFilter === 'PAID' ? FinanceStatus.PAID : FinanceStatus.PENDING);
    
    let dateMatch = true;
    if (dateFilter === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      const recordDate = r.dueDate.split('T')[0];
      dateMatch = recordDate === today;
    }

    return typeMatch && statusMatch && dateMatch;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val: number) => {
    // If we're calling this for display in a sensitive area and showValues is false, we should return masked value
    // But formatCurrency is a utility. Let's handle masking at render time or inside here if we change signature.
    // For simplicity given the existing code structure, I will return the string and mask in JSX or here.
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };
  
  // Helper for masking
  const displayValue = (val: number) => {
      if (!showValues) return 'R$ ****';
      return formatCurrency(val);
  };
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, statusFilter, dateFilter]);

  const handleAddEntry = async () => {
    if (!newEntry.description || !newEntry.amount) return;
    const record: FinanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type: newEntry.type,
      description: newEntry.description,
      amount: Number(newEntry.amount),
      status: FinanceStatus.PENDING,
      dueDate: newEntry.dueDate,
      createdAt: new Date().toISOString(),
    };
    
    await api.addFinance(record);
    loadFinance();
    setShowAddModal(false);
    setNewEntry({ description: '', amount: '', type: FinanceType.PAYABLE, dueDate: new Date().toISOString().split('T')[0] });
  };

  const handleSettle = async (id: string) => {
    await api.updateFinanceStatus(id, FinanceStatus.PAID);
    loadFinance();
    setSelectedRecord(null);
  };
  
  const handleDelete = async (id: string) => {
    setDeletingRecordId(id);
  };

  const confirmDelete = async () => {
    if (!deletingRecordId) return;
    try {
        await api.deleteFinance(deletingRecordId);
        await loadFinance();
        setSelectedRecord(null);
    } catch (error) {
        console.error(error);
        alert('Erro ao excluir lançamento. Atualize a página e tente novamente.');
    } finally {
        setDeletingRecordId(null);
    }
  };

  const getMethodIcon = (method?: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return <Banknote size={16} />;
      case PaymentMethod.PIX: return <QrCode size={16} />;
      case PaymentMethod.CARD: return <CreditCard size={16} />;
      default: return null;
    }
  };

  const [linkedItems, setLinkedItems] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!selectedRecord?.transactionId) {
      setLinkedItems([]);
      return;
    }
    api.getTransactions().then(txs => {
      setLinkedItems(txs.filter(t => t.id === selectedRecord.transactionId));
    });
  }, [selectedRecord]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Modal de Confirmação de Exclusão */}
      {deletingRecordId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Excluir Registro?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Deseja realmente excluir este lançamento financeiro? <br/>
                <span className="text-rose-500 font-bold uppercase text-[10px] tracking-widest mt-2 block">Esta ação é irreversível</span>
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-700/50 flex gap-3">
              <button 
                onClick={() => setDeletingRecordId(null)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-rose-200 dark:shadow-none uppercase text-xs tracking-widest"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Fluxo Financeiro</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie contas e visualize seu caixa.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <Plus size={20} /> Novo Lançamento
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          title="Total Recebido (Pago)" 
          value={showValues ? formatCurrency(totals.receivable) : 'R$ ****'} 
          type="receivable" 
          showValues={showValues} 
        />
        <SummaryCard 
          title="Total Pago" 
          value={showValues ? formatCurrency(totals.payable) : 'R$ ****'} 
          type="payable" 
          showValues={showValues} 
        />
        <SummaryCard 
          title="Saldo Líquido (Realizado)" 
          value={showValues ? formatCurrency(totals.balance) : 'R$ ****'} 
          type="balance" 
          showValues={showValues} 
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
              <FilterBtn active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="Tudo" />
              <FilterBtn active={filter === FinanceType.RECEIVABLE} onClick={() => setFilter(FinanceType.RECEIVABLE)} label="Receitas" />
              <FilterBtn active={filter === FinanceType.PAYABLE} onClick={() => setFilter(FinanceType.PAYABLE)} label="Despesas" />
            </div>
            
            <div className="h-auto w-px bg-gray-200 dark:bg-gray-700 hidden md:block" />
            
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
              <FilterBtn active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Todos Status" />
              <FilterBtn active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Pendentes" />
              <FilterBtn active={statusFilter === 'PAID'} onClick={() => setStatusFilter('PAID')} label="Pagos" />
            </div>

            <div className="h-auto w-px bg-gray-200 dark:bg-gray-700 hidden md:block" />

            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
               <FilterBtn active={dateFilter === 'TODAY'} onClick={() => setDateFilter('TODAY')} label="Hoje" />
               <FilterBtn active={dateFilter === 'ALL'} onClick={() => setDateFilter('ALL')} label="Todo Período" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-4 py-2 rounded-lg ml-auto xl:ml-0">
            <Calendar size={18} className="text-indigo-500" />
            <span>{dateFilter === 'TODAY' ? 'Movimento do Dia' : 'Todos os Registros'}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.1em]">
                <th className="px-8 py-4">Descrição / Categoria</th>
                <th className="px-8 py-4">Vencimento</th>
                <th className="px-8 py-4">Valor</th>
                <th className="px-8 py-4 text-center">Status</th>
                <th className="px-8 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedRecords.map((r) => (
                <tr 
                  key={r.id} 
                  onClick={() => setSelectedRecord(r)}
                  className="hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${r.type === FinanceType.RECEIVABLE ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 transition-colors">{r.description}</p>
                        <p className="text-xs text-gray-400 font-medium">{r.type === FinanceType.RECEIVABLE ? 'Entrada' : 'Saída'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className={`px-8 py-5 font-black ${r.type === FinanceType.RECEIVABLE ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {displayValue(r.amount)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      r.status === FinanceStatus.PAID 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {r.status === FinanceStatus.PAID ? 'PAGO' : 'PENDENTE'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <ChevronRight size={18} className="ml-auto text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginatedRecords.length > 0 && (
             <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
               <span className="text-xs font-bold text-gray-400">Página {currentPage} de {totalPages}</span>
               <div className="flex gap-2">
                 <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                 >Anterior</button>
                 <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                 >Próxima</button>
               </div>
             </div>
          )}

          {paginatedRecords.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-300">
                <AlertCircle size={40} />
              </div>
              <p className="text-gray-400 font-medium">Nenhum lançamento encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Novo Lançamento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Novo Lançamento</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tipo de Transação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setNewEntry({...newEntry, type: FinanceType.RECEIVABLE})}
                    className={`p-3 rounded-xl border-2 font-bold transition-all ${newEntry.type === FinanceType.RECEIVABLE ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}
                  >Entrada</button>
                  <button 
                    onClick={() => setNewEntry({...newEntry, type: FinanceType.PAYABLE})}
                    className={`p-3 rounded-xl border-2 font-bold transition-all ${newEntry.type === FinanceType.PAYABLE ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}
                  >Saída</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Descrição</label>
                <input 
                  type="text" 
                  placeholder="Ex: Pagamento de Energia"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newEntry.description}
                  onChange={e => setNewEntry({...newEntry, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Valor (R$)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newEntry.amount}
                    onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vencimento</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newEntry.dueDate}
                    onChange={e => setNewEntry({...newEntry, dueDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 flex flex-col gap-3">
              <button 
                onClick={handleAddEntry}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none transition-all"
              >SALVAR REGISTRO</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Detalhes da Transação */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${selectedRecord.type === FinanceType.RECEIVABLE ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {selectedRecord.type === FinanceType.RECEIVABLE ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Detalhes da Operação</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lançamento ID: #{selectedRecord.id.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(selectedRecord.id)} className="p-2 hover:bg-rose-100 hover:text-rose-500 rounded-full transition-colors text-gray-400">
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"><X /></button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <InfoItem icon={<Clock size={16} />} label="Data/Hora" value={new Date(selectedRecord.createdAt).toLocaleString('pt-BR')} />
                <InfoItem icon={<Hash size={16} />} label="Venda Ref." value={selectedRecord.transactionId ? `#${selectedRecord.transactionId.substr(0, 8)}` : 'Manual'} />
                <InfoItem 
                  icon={getMethodIcon(selectedRecord.paymentMethod) || <DollarSign size={16} />} 
                  label="Pagamento" 
                  value={selectedRecord.paymentMethod || 'N/A'} 
                />
                <InfoItem icon={<User size={16} />} label="Cliente" value="Consumidor Final" />
              </div>

              {linkedItems.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} /> Itens Comprados
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    {linkedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-indigo-500 border border-gray-100 dark:border-gray-700">{item.quantity}x</span>
                          <span className="font-bold text-gray-800 dark:text-gray-100">{item.productName}</span>
                        </div>
                        <span className="font-black text-gray-600 dark:text-gray-400">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Status Atual</p>
                  <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                    selectedRecord.status === FinanceStatus.PAID ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}>{selectedRecord.status === FinanceStatus.PAID ? 'PAGO' : 'PENDENTE'}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Valor Total</p>
                  <p className={`text-4xl font-black ${selectedRecord.type === FinanceType.RECEIVABLE ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(selectedRecord.amount)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-col md:flex-row gap-4">
               {selectedRecord.status === FinanceStatus.PENDING && (
                 <button 
                   onClick={() => handleSettle(selectedRecord.id)}
                   className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                 >
                   <CheckCircle size={20} />
                   {selectedRecord.type === FinanceType.RECEIVABLE ? 'CONFIRMAR RECEBIMENTO' : 'CONFIRMAR PAGAMENTO'}
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string, value: string, type: 'receivable' | 'payable' | 'balance', showValues: boolean }> = ({ title, value, type, showValues }) => {
  const styles = {
    receivable: 'text-emerald-600 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700',
    payable: 'text-rose-600 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700',
    balance: 'text-white bg-indigo-600 border-transparent shadow-indigo-100 dark:shadow-indigo-900/20 shadow-xl'
  };

  const icons = {
    receivable: <ArrowUpCircle className="text-emerald-500" size={24} />,
    payable: <ArrowDownCircle className="text-rose-500" size={24} />,
    balance: <DollarSign className="text-white/80" size={24} />
  };

  return (
    <div className={`p-8 rounded-3xl border ${styles[type]} transition-all duration-500 group overflow-hidden relative`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl ${type === 'balance' ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-900'} group-hover:scale-110 transition-transform`}>
          {icons[type]}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${type === 'balance' ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>{title}</span>
      </div>
      <p className={`text-3xl font-black tracking-tight`}>{value}</p>
    </div>
  );
};

const FilterBtn: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all ${
      active 
      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
      {icon} {label}
    </p>
    <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{value}</p>
  </div>
);

export default Finance;
