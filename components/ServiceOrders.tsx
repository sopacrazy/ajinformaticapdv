import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Printer, Edit2, Trash2, X, Save,
  ChevronDown, Wrench, User, Phone, Hash, Calendar,
  AlertCircle, CheckCircle, Clock, Package, FileText,
  ArrowLeft, Filter, RefreshCw, ChevronLeft, ChevronRight, DollarSign
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3001`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceOrder {
  id: number;
  number: string;
  client_name: string;
  client_phone: string;
  client_cpf: string;
  client_address: string;
  equipment: string;
  brand: string;
  model: string;
  serial_number: string;
  problem_description: string;
  service_description: string;
  technician: string;
  parts_used: string;
  labor_cost: number;
  parts_cost: number;
  discount: number;
  total_cost: number;
  status: string;
  estimated_date: string;
  delivery_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

type Status = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECA' | 'CONCLUIDA_PENDENTE' | 'CONCLUIDA' | 'ENTREGUE' | 'CANCELADA';

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ABERTA:          { label: 'Aberta / Pendente', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/30',    icon: <FileText size={14} /> },
  EM_ANDAMENTO:    { label: 'Em Andamento',       color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/30',  icon: <Wrench size={14} /> },
  AGUARDANDO_PECA: { label: 'Aguardando Peça',   color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30',icon: <Package size={14} /> },
  CONCLUIDA_PENDENTE: { label: 'Concluída / Pendente', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30', icon: <Clock size={14} /> },
  CONCLUIDA:       { label: 'Concluída',          color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/30',  icon: <CheckCircle size={14} /> },
  ENTREGUE:        { label: 'Entregue',           color: 'text-slate-600',  bg: 'bg-slate-100 dark:bg-slate-700',    icon: <CheckCircle size={14} /> },
  CANCELADA:       { label: 'Cancelada',          color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-900/30',    icon: <AlertCircle size={14} /> },
};

const EMPTY_FORM = {
  client_name: '', client_phone: '', client_cpf: '', client_address: '',
  equipment: '', brand: '', model: '', serial_number: '',
  problem_description: '', service_description: '', technician: '', parts_used: '', base_parts_used: '',
  labor_cost: 0, parts_cost: 0, discount: 0, total_cost: 0, status: 'ABERTA',
  estimated_date: '', delivery_date: '', notes: '',
  consume_parts: [] as { product_id: number, name: string, price: number, quantity: number }[],
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  list: () => fetch(`${API_URL}/service-orders`).then(r => r.json()),
  create: async (d: object) => {
    const res = await fetch(`${API_URL}/service-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar OS');
    return data;
  },
  update: async (id: number, d: object) => {
    const res = await fetch(`${API_URL}/service-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar OS');
    return data;
  },
  remove: async (id: number) => {
    const res = await fetch(`${API_URL}/service-orders/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
    return data;
  },
  patchStatus: async (id: number, status: string) => {
    const res = await fetch(`${API_URL}/service-orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar status');
    return data;
  },
  getNextNumber: () => fetch(`${API_URL}/service-orders/next-number`).then(r => r.json()),
  getClients: () => fetch(`${API_URL}/clients`).then(r => r.json()),
  getProducts: () => fetch(`${API_URL}/products`).then(r => r.json()),
};

// ─── Generate OS Number ───────────────────────────────────────────────────────
const generateNumber = () => {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `OS${y}${m}${d}-${r}`;
};

const fmt = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

// ─── Component Helpers ────────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-slate-800 dark:text-white text-sm';

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
      <span className="text-indigo-500">{icon}</span>
      <h3 className="font-black text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wide">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
    {children}
  </div>
);

// ─── Print View (2 vias) ─────────────────────────────────────────────────────
const Via: React.FC<{ 
  title: string; 
  os: ServiceOrder; 
  settings: any; 
  status: any;
}> = ({ title, os, settings, status }) => {
  const companyName = settings.companyName;
  const logoUrl = settings.logoUrl;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #4f46e5', paddingBottom: '4px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {logoUrl && !logoUrl.startsWith('icon:') ? (
            <img src={logoUrl} alt="Logo" style={{ width: '220px', height: 'auto', maxHeight: '70px', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                <Wrench size={20} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase' }}>{companyName || 'AJ PDV'}</div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#1e293b' }}>ORDEM DE SERVIÇO</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#4f46e5' }}>{os.number}</div>
          <div style={{ fontSize: '8px', color: '#94a3b8' }}>Data da Entrada: {new Date(os.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
          {os.delivery_date && (
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>
              Finalizada em: { (os.status === 'CONCLUIDA' || os.status === 'ENTREGUE') 
                ? new Date(os.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
                : fmtDate(os.delivery_date) 
              }
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '4px', padding: '2px 6px', display: 'inline-block', marginBottom: '4px', fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
        {title}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '8px', marginBottom: '4px' }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</div>
          <Row label="Nome" value={os.client_name} maxLines={2} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <Row label="Telefone" value={os.client_phone} />
            <Row label="CPF/CNPJ" value={os.client_cpf} />
          </div>
          <Row label="Endereço" value={os.client_address} />
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipamento</div>
          <Row label="Equip." value={os.equipment} maxLines={2} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <Row label="Marca" value={os.brand} />
            <Row label="Modelo" value={os.model} />
          </div>
          <Row label="N° Série" value={os.serial_number} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', marginBottom: '4px' }}>
        <RowBlock label="Defeito Relatado" value={os.problem_description} maxLines={4} />
        <RowBlock label="Peças Utilizadas / Insumos" value={os.parts_used} maxLines={4} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px', marginBottom: '4px', alignItems: 'stretch' }}>
        <RowBlock label="Serviço a realizar / Realizado" value={os.service_description} maxLines={8} />
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '8px', fontWeight: 700, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>Valores</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
            <span style={{ color: '#64748b' }}>Mão de Obra:</span><span style={{ fontWeight: 600 }}>{fmt(os.labor_cost || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
            <span style={{ color: '#64748b' }}>Peças:</span><span style={{ fontWeight: 600 }}>{fmt(os.parts_cost || 0)}</span>
          </div>
          {Number(os.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px', color: '#ef4444' }}>
              <span style={{ fontWeight: 700 }}>Desconto:</span><span style={{ fontWeight: 700 }}>- {fmt(Number(os.discount))}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 900, borderTop: '1px solid #e2e8f0', paddingTop: '3px', marginTop: '2px', color: '#4f46e5' }}>
            <span>TOTAL:</span><span>{fmt(os.total_cost || 0)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: '#64748b' }}>Status: <strong style={{ color: '#1e293b' }}>{status?.label || os.status}</strong></span>
        {os.notes && <span style={{ fontSize: '9px', color: '#64748b', maxWidth: '60%' }}>Obs: {os.notes}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px', marginBottom: '10px' }}>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '4px', textAlign: 'center', fontSize: '9px', color: '#64748b', fontWeight: 700 }}>
          Responsável Técnico
        </div>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '4px', fontSize: '9px', color: '#64748b', position: 'relative' }}>
          <div style={{ textAlign: 'center', fontWeight: 700 }}>Assinatura do Cliente</div>
          <div style={{ position: 'absolute', top: '4px', left: 0, fontSize: '8px' }}>Data: ____/____/____</div>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
          <p style={{ fontSize: '8px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', lineHeight: '1.3', textAlign: 'left', flex: 1 }}>
            OBS: O cliente tem um prazo de até 90 dias para retirar o equipamento. 
            <br />Após esse período, o item será destinado ao descarte.
          </p>
          <p style={{ fontSize: '8px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', lineHeight: '1.3', textAlign: 'center', flex: 1.2 }}>
            Equipamento em análise. Prazo para orçamento: 3 dias úteis.
          </p>
          <p style={{ fontSize: '8px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', lineHeight: '1.3', textAlign: 'right', flex: 1 }}>
            Garantia de 30 dias para serviços
            <br />e 90 dias para peças aplicadas.
          </p>
        </div>
        <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: '4px', textAlign: 'center', borderTop: '1px solid #f8fafc', paddingTop: '2px' }}>
            {settings.address || 'Alameda Imperial nº 51, São José, Castanhal - PA'} | {settings.phone || '(91) 98827-1517'}
        </div>
      </div>
    </>
  );
};

const MultiPrintView: React.FC<{ orders: ServiceOrder[]; settings: any; onClose: () => void }> = ({ orders, settings, onClose }) => {
  const handlePrint = () => window.print();
  const totalSum = orders.reduce((acc, os) => acc + Number(os.total_cost || 0), 0);

  return (
    <div className="fixed inset-0 z-[40] bg-slate-100 dark:bg-slate-900 overflow-y-auto print:bg-white print:overflow-visible print:static">
      <div className="print:hidden sticky top-0 left-0 right-0 h-20 bg-indigo-600 text-white px-8 flex items-center justify-between z-[50] shadow-2xl">
        <div className="flex items-center gap-4 ml-72 lg:ml-72">
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <span className="block font-black text-lg leading-none">Imprimir Selecionadas</span>
            <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-1">{orders.length} OS selecionadas</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl flex flex-col items-end">
            <span className="text-[9px] font-bold text-indigo-100 uppercase tracking-wider">Total Acumulado</span>
            <span className="text-lg font-black leading-none">{fmt(totalSum)}</span>
          </div>
          <button onClick={onClose} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10">
            <X size={16} /> Fechar
          </button>
          <button onClick={handlePrint} className="px-6 py-2.5 bg-white text-indigo-600 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20">
            <Printer size={16} /> Imprimir todas
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center py-12 px-4 ml-0 lg:ml-72 print:ml-0 print:p-0 print:block">
        <style>{`
          @media print {
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              -webkit-print-color-adjust: exact !important; 
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .os-page {
              break-after: page;
              page-break-after: always;
              height: 297mm;
              width: 210mm;
              position: relative;
              background: white;
              overflow: hidden;
              display: block !important;
            }
            .os-page:last-child {
              page-break-after: auto;
            }
            .print-via { 
              height: 148.5mm;
              margin: 0 !important;
              padding: 10mm 15mm !important;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              position: relative;
              background: white !important;
            }
            .print-separator { 
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              border: none; 
              border-top: 1px dashed #94a3b8 !important; 
              margin: 0;
              height: 0;
              z-index: 10;
            }
            .no-print { display: none !important; }
          }
          .os-page {
            background: white;
            margin-bottom: 2rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border-radius: 1rem;
            overflow: hidden;
          }
          @media print {
            .os-page {
              margin-bottom: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
        `}</style>

        {orders.map(os => {
            const status = STATUS_CONFIG[os.status as Status];
            return (
              <div key={os.id} className="os-page w-full max-w-2xl print:max-w-none">
                <div className="print-via" style={{fontFamily: 'Arial, sans-serif'}}>
                  <Via title="1ª VIA — CLIENTE" os={os} settings={settings} status={status} />
                  <div className="print-separator" />
                </div>
                <div className="print-via" style={{fontFamily: 'Arial, sans-serif'}}>
                  <Via title="2ª VIA — EMPRESA" os={os} settings={settings} status={status} />
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

const PrintView: React.FC<{ os: ServiceOrder; settings: any; onClose: () => void }> = ({ os, settings, onClose }) => {
  const handlePrint = () => window.print();
  const status = STATUS_CONFIG[os.status as Status];

  return (
    <div className="fixed inset-0 z-[40] bg-slate-100 dark:bg-slate-900 overflow-y-auto print:bg-white print:overflow-visible">
      <div className="print:hidden sticky top-0 left-0 right-0 h-20 bg-indigo-600 text-white px-8 flex items-center justify-between z-[50] shadow-2xl">
        <div className="flex items-center gap-4 ml-72 lg:ml-72">
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <span className="block font-black text-lg leading-none">Visualização de Impressão</span>
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">{os.number}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10">
            <X size={16} /> Fechar
          </button>
          <button onClick={handlePrint} className="px-6 py-2.5 bg-white text-indigo-600 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20">
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center py-12 px-4 ml-0 lg:ml-72 print:ml-0 print:p-0">
        <style>{`
          @media print {
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              -webkit-print-color-adjust: exact; 
              background: white !important;
              margin: 0;
              padding: 0;
            }
            .print-via { 
              height: 148.5mm;
              margin: 0 !important;
              padding: 10mm 15mm !important;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              position: relative;
            }
            .print-separator { 
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              border: none; 
              border-top: 1px dashed #94a3b8; 
              margin: 0;
              height: 0;
              z-index: 10;
            }
            .print-via:last-child .print-separator {
              display: none;
            }
            .no-print { display: none !important; }
            .print-content { 
              padding: 0 !important;
              box-shadow: none !important;
              max-width: none !important;
              width: 210mm !important;
              height: 297mm !important;
              border-radius: 0 !important;
            }
          }
          .print-via {
            background: white;
            padding: 10px 25px;
            font-family: Arial, sans-serif;
          }
        `}</style>

        <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print-content">
          <div className="print-via">
            <Via title="1ª VIA — CLIENTE" os={os} settings={settings} status={status} />
            <div className="print-separator" />
          </div>
          <div className="print-via">
            <Via title="2ª VIA — EMPRESA" os={os} settings={settings} status={status} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, maxLines }: { label: string; value: string; maxLines?: number }) => (
  <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', fontSize: '10px' }}>
    <span style={{ color: '#64748b', minWidth: '45px', flexShrink: 0 }}>{label}:</span>
    <span style={{ 
      fontWeight: 600, 
      color: '#1e293b',
      display: '-webkit-box',
      WebkitLineClamp: maxLines || 1,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      lineHeight: '1.2'
    }}>
      {value || '—'}
    </span>
  </div>
);
const RowBlock = ({ label, value, maxLines }: { label: string; value: string; maxLines?: number }) => (
  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', marginBottom: '0', fontSize: '11px', height: '100%' }}>
    <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: '9px', marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ 
      color: '#1e293b', 
      minHeight: '20px', 
      fontSize: '10px', 
      lineHeight: '1.2',
      display: '-webkit-box',
      WebkitLineClamp: maxLines || 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }}>
      {value || '—'}
    </div>
  </div>
);
const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', textAlign: 'center' }}>
    <div style={{ color: '#64748b', fontSize: '9px', marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontWeight: 700, color: '#1e293b' }}>{value}</div>
  </div>
);

// ─── Badge de Status ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status as Status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100', icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ServiceOrders: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [view, setView] = useState<'list' | 'form' | 'print'>(() => {
    const saved = localStorage.getItem('aj-pdv-os-draft');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        return d.view || 'list';
      } catch { return 'list'; }
    }
    return 'list';
  });
  const [editing, setEditing] = useState<ServiceOrder | null>(() => {
    const saved = localStorage.getItem('aj-pdv-os-draft');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        return d.editing || null;
      } catch { return null; }
    }
    return null;
  });
  const [printing, setPrinting] = useState<ServiceOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [multiPrinting, setMultiPrinting] = useState<ServiceOrder[] | null>(null);
  const [deleting, setDeleting] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(() => {
    const saved = localStorage.getItem('aj-pdv-os-draft');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        return d.form || { ...EMPTY_FORM };
      } catch { return { ...EMPTY_FORM }; }
    }
    return { ...EMPTY_FORM };
  });
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({ 
    companyName: '', 
    logoUrl: '',
    phone: '',
    email: '',
    address: ''
  });
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [osPayments, setOsPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<number>(0);
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<string>('DINHEIRO');
  const itemsPerPage = 10;

  useEffect(() => {
    load();
    fetch(`http://${window.location.hostname}:3001/settings`).then(r => r.json()).then(d => setSettings(d));
    api.getClients().then(setClients);
    api.getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    localStorage.setItem('aj-pdv-os-draft', JSON.stringify({ form, editing, view }));
  }, [form, editing, view]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.list();
      setOrders(Array.isArray(data) ? data : []);
    } catch { showToast('Erro ao carregar OS', 'err'); }
    finally { setLoading(false); }
  };

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setView('form');
  };

  const openEdit = async (os: ServiceOrder) => {
    setEditing(os);
    setForm({
      client_name: os.client_name, client_phone: os.client_phone, client_cpf: os.client_cpf,
      client_address: os.client_address, equipment: os.equipment, brand: os.brand,
      model: os.model, serial_number: os.serial_number, problem_description: os.problem_description,
      service_description: os.service_description, technician: os.technician, parts_used: os.parts_used, base_parts_used: os.parts_used || '',
      labor_cost: os.labor_cost, parts_cost: os.parts_cost, discount: os.discount || 0, total_cost: os.total_cost,
      status: os.status, estimated_date: os.estimated_date || '', delivery_date: os.delivery_date || '',
      notes: os.notes || '',
      consume_parts: [],
    });
    
    // Fetch payments for this OS
    try {
      const allFinance = await fetch(`${API_URL}/finance`).then(r => r.json());
      const filtered = Array.isArray(allFinance) 
        ? allFinance.filter((f: any) => f.osId === os.id || (f.description && f.description.includes(`OS #${os.number}`)))
        : [];
      setOsPayments(filtered);
    } catch (err) {
      console.error("Erro ao carregar pagamentos da OS:", err);
    }

    setView('form');
  };

  const handleSave = async () => {
    if (!form.client_name.trim()) return showToast('Informe o nome do cliente', 'err');
    if (!form.equipment.trim()) return showToast('Informe o equipamento', 'err');
    if (!form.problem_description.trim()) return showToast('Descreva o problema', 'err');
    
    if (form.status === 'CONCLUIDA' && (form.total_cost || 0) <= 0) {
      return showToast('Para concluir, a OS deve ter um valor (Mão de obra ou Peças)', 'err');
    }

    setSaving(true);
    try {
      const addedPartsText = form.consume_parts.map(p => `${p.quantity}x ${p.name}`).join(', ');
      const finalPartsUsed = form.base_parts_used 
        ? (addedPartsText ? form.base_parts_used + '\n' + addedPartsText : form.base_parts_used) 
        : addedPartsText;
      
      const payload = { ...form, parts_used: finalPartsUsed };

      if (editing) {
        await api.update(editing.id, payload);
        showToast('OS atualizada com sucesso!');
      } else {
        let finalNumber = '';
        if (form.client_name.toUpperCase().includes('ADRIANO LTDA')) {
          // Numero aleatorio para testes para não pular sequencia
          const rand = Math.floor(1000 + Math.random() * 9000);
          finalNumber = `TST-${rand}`;
        } else {
          const { nextNumber } = await api.getNextNumber();
          finalNumber = nextNumber;
        }
        
        const newOS = { ...payload, number: finalNumber };
        await api.create(newOS);
        showToast('OS criada com sucesso!');
      }
      await load();
      localStorage.removeItem('aj-pdv-os-draft');
      setView('list');
    } catch (err: any) { 
      showToast(err.message || 'Erro ao salvar OS', 'err'); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (os: ServiceOrder) => {
    setDeleting(os);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.remove(deleting.id);
      showToast('OS excluída');
      await load();
    } catch { showToast('Erro ao excluir', 'err'); }
    finally { setDeleting(null); }
  };

  const handleAddPartialPayment = async () => {
    if (!editing) return;
    if (partialPaymentAmount <= 0) return showToast('Informe um valor de recebimento', 'err');
    
    setSaving(true);
    try {
      const uniqueFinanceId = 'FIN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const financeRecord = {
        id: uniqueFinanceId,
        type: 'RECEIVABLE',
        description: `Recebimento Parcial - OS #${editing.number}`,
        amount: partialPaymentAmount,
        status: 'PAID', // Payments recorded this way are considered received
        dueDate: new Date().toISOString().split('T')[0],
        osId: editing.id,
        payment_method: partialPaymentMethod,
        createdAt: new Date().toISOString()
      };

      await fetch(`${API_URL}/finance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financeRecord)
      });

      // Recalculate total paid
      const updatedAllFinance = await fetch(`${API_URL}/finance`).then(r => r.json());
      const updatedFiltered = updatedAllFinance.filter((f: any) => f.os_id === editing.id || (f.description && f.description.includes(`OS #${editing.number}`)));
      setOsPayments(updatedFiltered);

      const totalPaidNow = updatedFiltered.filter((f: any) => f.status === 'PAID').reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
      
      // If fully paid, change OS to CONCLUIDA
      if (totalPaidNow >= editing.total_cost) {
        await api.patchStatus(editing.id, 'CONCLUIDA');
        showToast('OS Finalizada e Paga totalmente!');
        setForm(prev => ({ ...prev, status: 'CONCLUIDA' }));
      } else {
        showToast('Recebimento adicionado com sucesso!');
      }
      
      await load();
      setShowPaymentModal(false);
      setPartialPaymentAmount(0);
    } catch (err: any) {
      showToast(err.message || 'Erro ao adicionar recebimento', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Deseja realmente excluir este recebimento financeiro?')) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/finance/${paymentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir registro financeiro');
      
      showToast('Recebimento removido com sucesso!');
      
      // Refresh payments list
      const updatedAllFinance = await fetch(`${API_URL}/finance`).then(r => r.json());
      const updatedFiltered = Array.isArray(updatedAllFinance) 
        ? updatedAllFinance.filter((f: any) => f.os_id === editing?.id || (editing && f.description && f.description.includes(`OS #${editing.number}`)))
        : [];
      setOsPayments(updatedFiltered);

      const totalPaidNow = updatedFiltered.filter((f: any) => f.status === 'PAID').reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
      
      // If OS was CONCLUIDA but now balance is unpaid, revert to CONCLUIDA_PENDENTE
      if (editing && editing.status === 'CONCLUIDA' && totalPaidNow < editing.total_cost) {
        await api.patchStatus(editing.id, 'CONCLUIDA_PENDENTE');
        setForm(prev => ({ ...prev, status: 'CONCLUIDA_PENDENTE' }));
        showToast('OS revertida para Pendente pois o valor não está mais quitado.', 'ok');
      }

      await load();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover pagamento', 'err');
    } finally {
      setSaving(false);
    }
  };

  const setField = (k: string, v: string | number) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'labor_cost' || k === 'parts_cost' || k === 'discount') {
        const labor = Number(k === 'labor_cost' ? v : prev.labor_cost) || 0;
        const parts = Number(k === 'parts_cost' ? v : prev.parts_cost) || 0;
        const discount = Number(k === 'discount' ? v : prev.discount) || 0;
        next.total_cost = Math.max(0, labor + parts - discount);
      }
      return next;
    });
  };

  const handleAddConsumePart = (product: any) => {
    const parts = form.consume_parts || [];
    const existingIdx = parts.findIndex((p: any) => p.product_id === product.id);
    
    let nextParts;
    if (existingIdx >= 0) {
      nextParts = [...parts];
      nextParts[existingIdx] = { ...nextParts[existingIdx], quantity: nextParts[existingIdx].quantity + 1 };
    } else {
      nextParts = [...parts, { product_id: product.id, name: product.name, price: Number(product.salePrice) || 0, quantity: 1 }];
    }

    const newPartsCost = nextParts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    setForm(prev => ({
      ...prev,
      consume_parts: nextParts,
      parts_cost: newPartsCost,
      total_cost: Math.max(0, (Number(prev.labor_cost) || 0) + newPartsCost - (Number(prev.discount) || 0))
    }));

    setProductSearch('');
    setShowProductDropdown(false);
  };

  const updateConsumePartQty = (idx: number, delta: number) => {
    const parts = [...form.consume_parts];
    const part = parts[idx];
    const newQty = part.quantity + delta;
    
    let nextParts;
    if (newQty <= 0) {
      parts.splice(idx, 1);
      nextParts = parts;
    } else {
      parts[idx] = { ...part, quantity: newQty };
      nextParts = parts;
    }

    const newPartsCost = nextParts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    setForm(prev => ({
      ...prev,
      consume_parts: nextParts,
      parts_cost: newPartsCost,
      total_cost: Math.max(0, (Number(prev.labor_cost) || 0) + newPartsCost - (Number(prev.discount) || 0))
    }));
  };

  const removeConsumePart = (idx: number) => {
    const parts = [...form.consume_parts];
    parts.splice(idx, 1);
    const nextParts = parts;

    const newPartsCost = nextParts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    setForm(prev => ({
      ...prev,
      consume_parts: nextParts,
      parts_cost: newPartsCost,
      total_cost: Math.max(0, (Number(prev.labor_cost) || 0) + newPartsCost - (Number(prev.discount) || 0))
    }));
  };

  const filtered = orders.filter(o => {
    const matchSearch = search === '' || o.client_name.toLowerCase().includes(search.toLowerCase()) || o.number.toLowerCase().includes(search.toLowerCase()) || o.equipment.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedOrders = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrintReceipt = (os: ServiceOrder) => {
    const total = os.total_cost || 0;
    const clientName = os.client_name || 'Consumidor Final';
    const clientCnpjStr = os.client_cpf ? ` \n <span style="font-size: 11pt; color: #475569;">(CNPJ/CPF: ${os.client_cpf})</span>` : '';
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

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

    const logoHtml = settings.logoUrl && !settings.logoUrl.startsWith('icon:') 
      ? `<img src="${settings.logoUrl}" style="max-height: 80px; margin-bottom: 5px;" />` 
      : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>RECIBO - OS ${os.number}</title>
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
              grid-template-columns: 1fr 1fr;
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
              <div class="receipt-title" style="color: #000;">RECIBO</div>
            </div>

            <div class="info-grid">
               <div>
                  <div class="info-label">Controle de Serviço</div>
                  <div class="info-value">OS #${os.number}</div>
               </div>
               <div style="text-align: right;">
                  <div class="info-label">Emissão do Documento</div>
                  <div class="info-value">${date} às ${time}</div>
               </div>
            </div>

            <div class="declaracao-container">
              Recebemos de <b>${clientName.toUpperCase()}</b>${clientCnpjStr} a importância total de <br/>
              <b style="font-size: 16pt;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b><br/>
              <span style="font-size: 9.5pt; color: #64748b; font-weight: 600;">(${totalExtenso})</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">Item</th>
                  <th>Especificação do Serviço / Equipamento</th>
                  <th style="width: 80px; text-align: center;">Qtd.</th>
                  <th style="width: 120px; text-align: right;">Mão de Obra</th>
                  <th style="width: 120px; text-align: right;">Peças</th>
                  <th style="width: 120px; text-align: right;">Total Item</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td>${os.equipment} - ${os.service_description || os.problem_description}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${(os.labor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: right;">${(os.parts_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: right; font-weight: 700;">${((os.labor_cost || 0) + (os.parts_cost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
            <div class="flex-bottom">
               <div class="pix-section">
                  <div class="label">Pagamento Via PIX (Cópia e Cola)</div>
                  <div class="key">${settings.pixKey || '08.859.294/0001-13'}</div>
                  <div class="favorecido">Favorecido: ${settings.pixFavorecido || 'Aj Informatica'}</div>
               </div>
 
               <div class="totals-section">
                  <div class="total-item">
                    <span class="label">Subtotal</span>
                    <span class="value">R$ ${((os.labor_cost || 0) + (os.parts_cost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  ${Number(os.discount) > 0 ? `
                    <div class="total-item" style="color: #ef4444;">
                      <span class="label" style="color: #ef4444;">Desconto</span>
                      <span class="value" style="font-weight: 900;">- ${fmt(Number(os.discount))}</span>
                    </div>
                  ` : ''}
                  <div class="total-item">
                    <span class="label">Forma de Pgto</span>
                    <span class="value" style="color: #000; text-transform: uppercase;">DINHEIRO / PIX / CARTÃO</span>
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
                  <div class="signature-info">${settings.signatureName || 'Aj Informatica'}</div>
               </div>
            </div>
 
            <div class="footer-info">
               <div>
                  <b>CNPJ:</b> ${settings.cnpj || '08.859.294/0001-13'} | <b>Insc. Est:</b> ${settings.inscEst || '15.271.024-8'} | <b>${settings.phone || '(91) 98827-1517'}</b> | ${settings.email || 'alexsantos225@hotmail.com'}<br/>
                  ${settings.address || 'Alameda Imperial nº 51, São José, Castanhal - PA'}
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

  // ── Multi Print View ──
  if (multiPrinting) {
    return <MultiPrintView orders={multiPrinting} settings={settings} onClose={() => setMultiPrinting(null)} />;
  }

  // ── Print View ──
  if (printing) {
    return <PrintView os={printing} settings={settings} onClose={() => setPrinting(null)} />;
  }

  // ── Form View ──
  if (view === 'form') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl font-bold text-white text-sm flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 ${toast.type === 'ok' ? 'bg-green-500' : 'bg-rose-500'}`}>
            {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">{editing ? `Editar OS ${editing.number}` : 'Nova Ordem de Serviço'}</h1>
            <p className="text-slate-500 text-sm">Preencha os dados da OS</p>
          </div>
        </div>

        {/* Status Destacado - O Primeiro */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
              <RefreshCw size={28} className={saving ? 'animate-spin' : ''} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status da Ordem de Serviço</h3>
              <p className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Progresso do Atendimento</p>
            </div>
          </div>
          
          <div className="flex-1 max-w-md">
            <select 
              id="os-status-top" 
              value={form.status} 
              onChange={e => setField('status', e.target.value)} 
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:border-indigo-500 transition-all text-indigo-600 dark:text-indigo-400 text-base font-black uppercase tracking-widest cursor-pointer appearance-none text-center"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold">{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Seção Cliente */}
        <Section title="Dados do Cliente" icon={<User size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do Cliente *" id="os-client-name">
              <div className="relative">
                <input 
                  id="os-client-name" 
                  value={form.client_name} 
                  onChange={e => {
                    setField('client_name', e.target.value);
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Nome completo ou pesquisar..." 
                  className={inputCls} 
                />
                {showClientDropdown && clientSearch.length > 1 && (
                  <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1 shadow-xl z-50 max-h-48 overflow-y-auto">
                    {clients
                      .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                      .map(c => (
                        <button
                          key={c.id}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold border-b border-slate-100 dark:border-slate-700 last:border-0"
                          onClick={() => {
                            setField('client_name', c.name);
                            setField('client_phone', c.phone || '');
                            setField('client_cpf', c.cpf_cnpj || '');
                            setField('client_address', c.address || '');
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
            </Field>
            <Field label="Telefone" id="os-client-phone">
              <input id="os-client-phone" value={form.client_phone} onChange={e => setField('client_phone', e.target.value)} placeholder="(99) 99999-9999" className={inputCls} />
            </Field>
            <Field label="CPF / CNPJ" id="os-client-cpf">
              <input id="os-client-cpf" value={form.client_cpf} onChange={e => setField('client_cpf', e.target.value)} placeholder="000.000.000-00" className={inputCls} />
            </Field>
            <Field label="Endereço" id="os-client-address">
              <input id="os-client-address" value={form.client_address} onChange={e => setField('client_address', e.target.value)} placeholder="Rua, número, bairro" className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Seção Equipamento */}
        <Section title="Equipamento" icon={<Wrench size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Equipamento *" id="os-equipment">
              <input id="os-equipment" value={form.equipment} onChange={e => setField('equipment', e.target.value)} placeholder="Ex: Notebook, Impressora, Celular..." className={inputCls} />
            </Field>
            <Field label="Marca" id="os-brand">
              <input id="os-brand" value={form.brand} onChange={e => setField('brand', e.target.value)} placeholder="Ex: Dell, HP, Samsung..." className={inputCls} />
            </Field>
            <Field label="Modelo" id="os-model">
              <input id="os-model" value={form.model} onChange={e => setField('model', e.target.value)} placeholder="Ex: Inspiron 15, Galaxy S21..." className={inputCls} />
            </Field>
            <Field label="Número de Série" id="os-serial">
              <input id="os-serial" value={form.serial_number} onChange={e => setField('serial_number', e.target.value)} placeholder="S/N" className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Seção Serviço */}
        <Section title="Serviço" icon={<FileText size={18} />}>
          <div className="space-y-4">
            <Field label="Defeito Relatado *" id="os-problem">
              <textarea id="os-problem" value={form.problem_description} onChange={e => setField('problem_description', e.target.value)} placeholder="Descreva o problema relatado pelo cliente..." rows={3} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Serviço a realizar / Realizado" id="os-service">
              <textarea id="os-service" value={form.service_description} onChange={e => setField('service_description', e.target.value)} placeholder="Descreva o serviço executado..." rows={3} className={inputCls + ' resize-none'} />
            </Field>
            {form.base_parts_used && (
               <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                  <span className="font-bold block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Peças Existentes na OS:</span>
                  {form.base_parts_used}
               </div>
            )}
            
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Produtos do Estoque (Baixa Automática ao Salvar)</label>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar peça no estoque..." 
                  className={inputCls + " pl-12 relative z-20"}
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                />
                
                {showProductDropdown && productSearch.length > 0 && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {products
                      .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.stock > 0)
                      .map(p => (
                        <button
                          type="button"
                          key={p.id}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 flex justify-between items-center"
                          onClick={() => handleAddConsumePart(p)}
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-gray-200">{p.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase">Estoque disponível: {p.stock}</div>
                          </div>
                        </button>
                      ))}
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.stock > 0).length === 0 && (
                       <div className="p-4 text-center text-xs text-slate-500 font-bold uppercase">Nenhuma peça em estoque encontrada</div>
                    )}
                  </div>
                )}
              </div>

              {form.consume_parts && form.consume_parts.length > 0 && (
                 <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                     <div className="flex justify-between items-center mb-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peças / Insumos Selecionadas</div>
                     </div>
                     <div className="space-y-2">
                     {form.consume_parts.map((cp, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                           <div>
                              <div className="font-bold text-sm text-slate-800 dark:text-gray-200">{cp.name}</div>
                              <div className="text-indigo-600 dark:text-indigo-400 font-black text-[11px] uppercase tracking-widest mt-0.5">SUBTOTAL: {fmt(cp.price * cp.quantity)}</div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                                 <button type="button" onClick={() => updateConsumePartQty(idx, -1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">-</button>
                                 <span className="text-xs font-black w-6 text-center text-slate-700 dark:text-slate-300">{cp.quantity}</span>
                                 <button type="button" onClick={() => updateConsumePartQty(idx, 1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">+</button>
                              </div>
                              <button type="button" onClick={() => removeConsumePart(idx)} className="text-slate-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors ml-1">
                                 <X size={16} />
                              </button>
                           </div>
                        </div>
                     ))}
                     </div>
                  </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Técnico Responsável" id="os-tech">
                <input id="os-tech" value={form.technician} onChange={e => setField('technician', e.target.value)} placeholder="Nome do técnico" className={inputCls} />
              </Field>
              <div /> {/* Espaçador removido Status daqui */}
              <Field label="Data da Entrada" id="os-estimated">
                <input id="os-estimated" type="date" value={form.estimated_date} onChange={e => setField('estimated_date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Data de Entrega" id="os-delivery">
                <input id="os-delivery" type="date" value={form.delivery_date} onChange={e => setField('delivery_date', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
        </Section>

        {/* Seção Valores */}
        <Section title="Valores" icon={<Package size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Mão de Obra (R$)" id="os-labor">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                <input 
                  id="os-labor" 
                  type="text" 
                  value={fmt(Number(form.labor_cost) || 0).replace('R$', '').trim()} 
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, "");
                    setField('labor_cost', Number(value) / 100);
                  }}
                  className={inputCls + " pl-12"} 
                />
              </div>
            </Field>
            <Field label="Peças / insumos (R$)" id="os-parts-cost">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                <input 
                  id="os-parts-cost" 
                  type="text" 
                  value={fmt(Number(form.parts_cost) || 0).replace('R$', '').trim()} 
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, "");
                    setField('parts_cost', Number(value) / 100);
                  }}
                  className={inputCls + " pl-12"} 
                />
              </div>
            </Field>
            <Field label="Desconto (R$)" id="os-discount">
              <div className="relative text-rose-500">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-rose-300 text-sm">R$</span>
                <input 
                  id="os-discount" 
                  type="text" 
                  value={fmt(Number(form.discount) || 0).replace('R$', '').trim()} 
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, "");
                    setField('discount', Number(value) / 100);
                  }}
                  className={inputCls + " pl-12 border-rose-100 focus:border-rose-400 text-rose-600"} 
                />
              </div>
            </Field>
            <Field label="Total Final (R$)" id="os-total">
              <div className="w-full pl-4 pr-4 py-4 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-700 rounded-2xl font-black text-indigo-700 dark:text-indigo-400 text-lg">
                {fmt(form.total_cost || 0)}
              </div>
            </Field>
          </div>
        </Section>

        {/* Observações */}
        <Section title="Observações" icon={<AlertCircle size={18} />}>
          <textarea id="os-notes" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Observações adicionais..." rows={2} className={inputCls + ' resize-none w-full'} />
        </Section>

        {/* Pagamentos (Apenas se já existir a OS) */}
        {editing && (form.status === 'CONCLUIDA_PENDENTE' || form.status === 'CONCLUIDA') && (
          <Section title="Financeiro / Recebimentos" icon={<DollarSign size={18} />}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Total OS</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white">{fmt(editing.total_cost)}</span>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Total Recebido</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {fmt(osPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0))}
                  </span>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-1">Saldo Devedor</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {fmt(Math.max(0, editing.total_cost - osPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0)))}
                  </span>
                </div>
              </div>

              {osPayments.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mt-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 uppercase tracking-tighter">
                      <tr>
                        <th className="px-4 py-2">Data</th>
                        <th className="px-4 py-2">Descrição</th>
                        <th className="px-4 py-2">Método</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                        <th className="px-4 py-2 text-center w-10">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                      {osPayments.map((p, idx) => (
                        <tr key={idx} className="text-slate-600 dark:text-slate-300">
                          <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-2 font-medium">{p.description}</td>
                          <td className="px-4 py-2 uppercase font-black text-[9px]">{p.paymentMethod || 'N/A'}</td>
                          <td className={`px-4 py-2 text-right font-bold ${p.status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {fmt(p.amount)} {p.status !== 'PAID' && '(PENDENTE)'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button 
                              onClick={() => handleDeletePayment(p.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                              title="Excluir este pagamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(form.status === 'CONCLUIDA_PENDENTE' || form.status === 'CONCLUIDA') && (
                <button 
                  onClick={() => {
                    const received = Array.isArray(osPayments) ? osPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0) : 0;
                    setPartialPaymentAmount(Math.max(0, (editing?.total_cost || 0) - received));
                    setShowPaymentModal(true);
                  }}
                  className="w-full mt-2 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-xs uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/30 transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} /> Adicionar Pagamento Parcial
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 sticky bottom-0 bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-md py-4 -mx-4 px-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => setView('list')} className="px-6 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            {editing?.status === 'CONCLUIDA' ? 'Voltar' : 'Cancelar'}
          </button>
          
          {editing?.status === 'CONCLUIDA' ? (
            <button 
              onClick={() => handlePrintReceipt(editing)} 
              className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black shadow-lg shadow-emerald-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
            >
              <FileText size={18} /> Imprimir Recibo
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60">
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              {editing ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
            </button>
          )}
        </div>

        {/* Modal de Pagamento Parcial (Repetido para o Form View) */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-left">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 opacity-100">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Receber Pagamento</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-rose-500"><X /></button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1.5 text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Recebimento (R$)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                      <input 
                        type="text" 
                        value={fmt(partialPaymentAmount).replace('R$', '').trim()}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "");
                          setPartialPaymentAmount(Number(val) / 100);
                        }}
                        className={inputCls + " pl-12 text-lg font-black text-indigo-600 dark:text-indigo-400 w-full"}
                      />
                   </div>
                </div>

                <div className="space-y-1.5 text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pagamento</label>
                   <select 
                     value={partialPaymentMethod} 
                     onChange={e => setPartialPaymentMethod(e.target.value)}
                     className={inputCls + " font-bold w-full"}
                   >
                     <option value="DINHEIRO">Dinheiro</option>
                     <option value="PIX">PIX</option>
                     <option value="CARTÃO">Cartão</option>
                   </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-700/50 flex gap-3">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddPartialPayment}
                  disabled={saving}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all shadow-lg shadow-indigo-200 dark:shadow-none uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <DollarSign size={14} />} Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      {/* Modal de Confirmação de Exclusão */}
      {deleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Confirmar Exclusão</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Deseja realmente excluir a OS <span className="font-black text-slate-800 dark:text-white">{deleting.number}</span>? <br/>
                <span className="text-rose-500 font-bold uppercase text-[10px] tracking-widest mt-2 block">Esta ação é irreversível</span>
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-700/50 flex gap-3">
              <button 
                onClick={() => setDeleting(null)}
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

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl font-bold text-white text-sm flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 ${toast.type === 'ok' ? 'bg-green-500' : 'bg-rose-500'}`}>
          {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedIds.length > 0 && (
            <div className="animate-in zoom-in duration-200">
               <button 
                 onClick={() => setSelectedIds([])}
                 className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
                 title="Limpar seleção"
               >
                 <X size={20} />
               </button>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Wrench className="text-indigo-600" size={28} /> Ordens de Serviço
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {selectedIds.length > 0 ? (
                <span className="text-indigo-600 font-black">{selectedIds.length} selecionadas</span>
              ) : (
                `${orders.length} OS cadastradas`
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.length > 1 && (
            <button 
              onClick={() => {
                const selected = orders.filter(o => selectedIds.includes(o.id));
                setMultiPrinting(selected);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              <Printer size={20} /> Imprimir Selecionadas
            </button>
          )}
          <button id="os-new-btn" onClick={openNew} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all">
            <Plus size={20} /> Nova OS
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, nº OS ou equipamento..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 transition-all font-medium text-slate-600 dark:text-slate-300">
          <option value="ALL">Todos os Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={load} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Contadores de Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => {
          const cnt = orders.filter(o => o.status === k).length;
          return (
            <button key={k} onClick={() => setFilterStatus(filterStatus === k ? 'ALL' : k)}
              className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${filterStatus === k ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200'}`}>
              <span className={`text-xl font-black ${v.color}`}>{cnt}</span>
              <span className="text-xs text-slate-500 font-medium text-center leading-tight mt-0.5">{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Wrench size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-bold">Nenhuma OS encontrada</p>
          <p className="text-sm">{search || filterStatus !== 'ALL' ? 'Tente ajustar os filtros' : 'Clique em "Nova OS" para começar'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-5 py-2">
             <input 
               type="checkbox"
               checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.includes(o.id))}
               onChange={(e) => {
                 if (e.target.checked) {
                   const idsOnPage = paginatedOrders.map(o => o.id);
                   setSelectedIds(prev => Array.from(new Set([...prev, ...idsOnPage])));
                 } else {
                   const idsOnPage = paginatedOrders.map(o => o.id);
                   setSelectedIds(prev => prev.filter(id => !idsOnPage.includes(id)));
                 }
               }}
               className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
             />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar tudo nesta página</span>
          </div>

          {paginatedOrders.map(os => (
            <div 
              key={os.id} 
              className={`bg-white dark:bg-slate-800 rounded-2xl border ${selectedIds.includes(os.id) ? 'border-indigo-500 ring-2 ring-indigo-50 dark:ring-indigo-900/20' : 'border-slate-100 dark:border-slate-700'} shadow-sm hover:shadow-md transition-all overflow-hidden group`}
            >
              <div className="flex items-start gap-4 p-5">
                {/* Checkbox de Seleção */}
                <div className="flex-shrink-0 pt-1">
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(os.id)}
                    onChange={() => {
                      setSelectedIds(prev => 
                        prev.includes(os.id) ? prev.filter(id => id !== os.id) : [...prev, os.id]
                      );
                    }}
                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all"
                  />
                </div>

                {/* Número & Status */}
                <div className="flex-shrink-0 min-w-[90px]">
                  <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-1">{os.number}</div>
                  <StatusBadge status={os.status} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5"><User size={11} /> Cliente</div>
                    <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{os.client_name}</div>
                    {os.client_phone && <div className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {os.client_phone}</div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5"><Wrench size={11} /> Equipamento</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm truncate">{os.equipment}</div>
                    {(os.brand || os.model) && <div className="text-xs text-slate-400">{[os.brand, os.model].filter(Boolean).join(' · ')}</div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5"><Clock size={11} /> Criada em</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{new Date(os.created_at).toLocaleDateString('pt-BR')}</div>
                    {os.estimated_date && <div className="text-xs text-slate-400">Entrada: {fmtDate(os.estimated_date)}</div>}
                  </div>
                </div>

                {/* Valor */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <div className="text-xs text-slate-400 mb-0.5">Total</div>
                  <div className="font-black text-indigo-600 dark:text-indigo-400 text-lg">{fmt(os.total_cost || 0)}</div>
                </div>

                {/* Ações */}
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPrinting(os)} title="Imprimir OS" className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Printer size={18} />
                  </button>
                  <button onClick={() => handlePrintReceipt(os)} title="Imprimir Recibo" className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                    <FileText size={18} />
                  </button>
                  
                  {os.status !== 'CONCLUIDA' ? (
                    <>
                      <button onClick={() => openEdit(os)} title="Editar" className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(os)} title="Excluir" className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <div title="OS Concluída (Bloqueada)" className="p-2 text-slate-300">
                      <X size={18} />
                    </div>
                  )}
                </div>
              </div>

              {/* Problema resumo */}
              {os.problem_description && (
                <div className="px-5 pb-4 pt-0">
                  <p className="text-xs text-slate-400 line-clamp-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                    <span className="font-bold text-slate-500">Defeito:</span> {os.problem_description}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Mostrando <span className="text-slate-800 dark:text-white">{Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filtered.length, currentPage * itemsPerPage)}</span> de <span className="text-slate-800 dark:text-white">{filtered.length}</span> OS
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Pagamento Parcial */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-left">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 opacity-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Receber Pagamento</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-rose-500"><X /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5 text-left">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Recebimento (R$)</label>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                    <input 
                      type="text" 
                      value={fmt(partialPaymentAmount).replace('R$', '').trim()}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPartialPaymentAmount(Number(val) / 100);
                      }}
                      className={inputCls + " pl-12 text-lg font-black text-indigo-600 dark:text-indigo-400 w-full"}
                    />
                 </div>
              </div>

              <div className="space-y-1.5 text-left">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pagamento</label>
                 <select 
                   value={partialPaymentMethod} 
                   onChange={e => setPartialPaymentMethod(e.target.value)}
                   className={inputCls + " font-bold w-full"}
                 >
                   <option value="DINHEIRO">Dinheiro</option>
                   <option value="PIX">PIX</option>
                   <option value="CARTÃO">Cartão</option>
                 </select>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-700/50 flex gap-3">
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddPartialPayment}
                disabled={saving}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all shadow-lg shadow-indigo-200 dark:shadow-none uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <DollarSign size={14} />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default ServiceOrders;
