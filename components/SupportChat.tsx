import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Headset, CheckCircle, Sparkles, ChevronDown } from 'lucide-react';

const SupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState('DASHBOARD');
  const chatRef = useRef<HTMLDivElement>(null);

  const ROUTINES = [
    { id: 'DASHBOARD', label: 'Dashboard / Início' },
    { id: 'PDV', label: 'PDV Vendas' },
    { id: 'VENDAS', label: 'Vendas' },
    { id: 'ESTOQUE', label: 'Estoque' },
    { id: 'CLIENTES', label: 'Clientes' },
    { id: 'FORNECEDORES', label: 'Fornecedores' },
    { id: 'MATERIAL_SHIPMENT', label: 'Saída de Material' },
    { id: 'FINANCEIRO', label: 'Financeiro' },
    { id: 'OS', label: 'Ordens de Serviço' },
    { id: 'RELATORIOS', label: 'Relatórios' },
    { id: 'OUTROS', label: 'Outros / Geral' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = () => {
    if (!message.trim()) return;
    setLoading(true);
    
    // Simulating API call for "frontend first"
    setTimeout(() => {
      console.log('Demanda enviada:', { routine, message });
      setLoading(false);
      setSent(true);
      setMessage('');
      
      // Reset success state after 3 seconds
      setTimeout(() => setSent(false), 3000);
    }, 1000);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] no-print" ref={chatRef}>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group overflow-hidden ${
          isOpen 
            ? 'bg-rose-500 rotate-90 text-white' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X size={28} /> : <MessageSquare size={28} className="group-hover:animate-bounce" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[410px] h-[550px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500 flex flex-col">
          {/* Header */}
          <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 text-white relative h-32 flex flex-col justify-end">
            <div className="absolute top-6 right-8 opacity-20">
              <Sparkles size={60} />
            </div>
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Headset size={20} /> Suporte de Demandas
            </h3>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">
              Como podemos melhorar o sistema?
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {!sent ? (
              <div className="space-y-6 h-full flex flex-col">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Olá! Use este canal para sugerir ajustes, novas funções ou relatar bugs diretamente para o desenvolvimento.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Para qual rotina?</label>
                  <div className="relative">
                    <select
                      value={routine}
                      onChange={(e) => setRoutine(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-white text-sm font-bold appearance-none cursor-pointer"
                    >
                      {ROUTINES.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descreva sua demanda</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ex: Gostaria que a tela de vendas tivesse um campo para..."
                    className="flex-1 w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-white text-sm resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={40} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Recebido com Sucesso!</h4>
                  <p className="text-sm text-slate-500 font-medium">Sua sugestão foi enviada para nossa equipe de desenvolvimento.</p>
                </div>
                <button 
                  onClick={() => setSent(false)}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                >
                  Enviar Outra
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {!sent && (
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                Enviar Demanda
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportChat;
