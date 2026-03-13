import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Printer, Edit2, Trash2, X, Save,
  ChevronDown, Wrench, User, Phone, Hash, Calendar,
  AlertCircle, CheckCircle, Clock, Package, FileText,
  ArrowLeft, Filter, RefreshCw, ChevronLeft, ChevronRight
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
  total_cost: number;
  status: string;
  estimated_date: string;
  delivery_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

type Status = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECA' | 'CONCLUIDA' | 'ENTREGUE' | 'CANCELADA';

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ABERTA:          { label: 'Aberta / Pendente', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/30',    icon: <FileText size={14} /> },
  EM_ANDAMENTO:    { label: 'Em Andamento',       color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/30',  icon: <Wrench size={14} /> },
  AGUARDANDO_PECA: { label: 'Aguardando Peça',   color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30',icon: <Package size={14} /> },
  CONCLUIDA:       { label: 'Concluída',          color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/30',  icon: <CheckCircle size={14} /> },
  ENTREGUE:        { label: 'Entregue',           color: 'text-slate-600',  bg: 'bg-slate-100 dark:bg-slate-700',    icon: <CheckCircle size={14} /> },
  CANCELADA:       { label: 'Cancelada',          color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-900/30',    icon: <AlertCircle size={14} /> },
};

const EMPTY_FORM = {
  client_name: '', client_phone: '', client_cpf: '', client_address: '',
  equipment: '', brand: '', model: '', serial_number: '',
  problem_description: '', service_description: '', technician: '', parts_used: '',
  labor_cost: 0, parts_cost: 0, total_cost: 0, status: 'ABERTA',
  estimated_date: '', delivery_date: '', notes: '',
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  list: () => fetch(`${API_URL}/service-orders`).then(r => r.json()),
  create: (d: object) => fetch(`${API_URL}/service-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json()),
  update: (id: number, d: object) => fetch(`${API_URL}/service-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json()),
  remove: (id: number) => fetch(`${API_URL}/service-orders/${id}`, { method: 'DELETE' }).then(r => r.json()),
  patchStatus: (id: number, status: string) => fetch(`${API_URL}/service-orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
  getNextNumber: () => fetch(`${API_URL}/service-orders/next-number`).then(r => r.json()),
  getClients: () => fetch(`${API_URL}/clients`).then(r => r.json()),
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

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

// ─── Print View (2 vias) ─────────────────────────────────────────────────────
const PrintView: React.FC<{ os: ServiceOrder; settings: any; onClose: () => void }> = ({ os, settings, onClose }) => {
  const handlePrint = () => window.print();
  const status = STATUS_CONFIG[os.status as Status];
  const { companyName, logoUrl } = settings;

  const Via = ({ title }: { title: string }) => (
    <div className="print-via">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #4f46e5', paddingBottom: '6px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {logoUrl && !logoUrl.startsWith('icon:') ? (
            <img src={logoUrl} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
              <Wrench size={20} />
            </div>
          )}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase' }}>{companyName || 'MicroERP Varejo'}</div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sistema de Gestão</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#1e293b' }}>ORDEM DE SERVIÇO</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#4f46e5' }}>{os.number}</div>
          <div style={{ fontSize: '8px', color: '#94a3b8' }}>Emitida em: {new Date(os.created_at).toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {/* Via label */}
      <div style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '4px', padding: '2px 6px', display: 'inline-block', marginBottom: '6px', fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
        {title}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        {/* Cliente */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</div>
          <Row label="Nome" value={os.client_name} />
          <Row label="Telefone" value={os.client_phone} />
          <Row label="CPF/CNPJ" value={os.client_cpf} />
          <Row label="Endereço" value={os.client_address} />
        </div>
        {/* Equipamento */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipamento</div>
          <Row label="Equip." value={os.equipment} />
          <Row label="Marca" value={os.brand} />
          <Row label="Modelo" value={os.model} />
          <Row label="N° Série" value={os.serial_number} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
        <RowBlock label="Defeito Relatado" value={os.problem_description} />
        <RowBlock label="Serviço Realizado" value={os.service_description} />
        <RowBlock label="Peças Utilizadas" value={os.parts_used} />
      </div>

      {/* Valores */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', marginBottom: '6px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>Valores</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
          <span style={{ color: '#64748b' }}>Mão de Obra:</span><span style={{ fontWeight: 600 }}>{fmt(os.labor_cost || 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
          <span style={{ color: '#64748b' }}>Peças:</span><span style={{ fontWeight: 600 }}>{fmt(os.parts_cost || 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900, borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '3px', color: '#4f46e5' }}>
          <span>TOTAL:</span><span>{fmt(os.total_cost || 0)}</span>
        </div>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: '#64748b' }}>Status: <strong style={{ color: '#1e293b' }}>{status?.label || os.status}</strong></span>
        {os.notes && <span style={{ fontSize: '9px', color: '#64748b', maxWidth: '60%' }}>Obs: {os.notes}</span>}
      </div>

      {/* Assinaturas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', marginBottom: '10px' }}>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '3px', textAlign: 'center', fontSize: '9px', color: '#64748b' }}>Assinatura do Cliente</div>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '3px', textAlign: 'center', fontSize: '9px', color: '#64748b' }}>Responsável Técnico</div>
      </div>

      {/* Termos / Footer */}
      <div style={{ textAlign: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
        <p style={{ fontSize: '8px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', lineHeight: '1.3' }}>
          OBS: O cliente tem um prazo de até 90 dias para retirar o equipamento. 
          <br />Após esse período, o item será destinado ao descarte.
        </p>
        <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: '2px' }}>
            ${settings.address || 'Alameda Imperial nº 51, São José, Castanhal - PA'} | ${settings.phone || '(91) 98827-1517'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[40] bg-slate-100 dark:bg-slate-900 overflow-y-auto print:bg-white print:overflow-visible">
      {/* Controles de tela - só visível na tela, não imprime */}
      <div className="print:hidden sticky top-0 left-0 right-0 h-20 bg-indigo-600 text-white px-8 flex items-center justify-between z-[50] shadow-2xl">
        <div className="flex items-center gap-4 ml-72 lg:ml-72"> {/* Alinhado após a barra lateral principal */}
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

      {/* Folha de impressão */}
      <div className="flex flex-col items-center py-12 px-4 ml-0 lg:ml-72 print:ml-0 print:p-0">
        <style>{`
          @media print {
            @page { 
              size: A4; 
              margin: 8mm; 
            }
            body { 
              -webkit-print-color-adjust: exact; 
              background: white !important;
            }
            .print-via { 
              page-break-inside: avoid;
              margin-bottom: 5mm;
            }
            .print-separator { 
              border: none; 
              border-top: 1px dashed #94a3b8; 
              margin: 8px 0; 
              height: 1px;
            }
            .no-print { display: none !important; }
            .print-content { 
              padding: 0 !important;
              box-shadow: none !important;
              max-width: none !important;
            }
          }
          .print-via {
            background: white;
            padding: 15px 25px;
            font-family: Arial, sans-serif;
          }
        `}</style>

        <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print-content pb-10">
          <Via title="1ª VIA — CLIENTE" />
          <div className="print-separator border-t border-dashed border-slate-300 mx-8 print:mx-0" />
          <Via title="2ª VIA — EMPRESA" />
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', gap: '4px', marginBottom: '3px', fontSize: '11px' }}>
    <span style={{ color: '#64748b', minWidth: '60px' }}>{label}:</span>
    <span style={{ fontWeight: 600, color: '#1e293b' }}>{value || '—'}</span>
  </div>
);
const RowBlock = ({ label, value }: { label: string; value: string }) => (
  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', marginBottom: '0', fontSize: '11px', height: '100%' }}>
    <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: '9px', marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ color: '#1e293b', minHeight: '30px', fontSize: '10px', lineHeight: '1.2' }}>{value || '—'}</div>
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
  const [view, setView] = useState<'list' | 'form' | 'print'>('list');
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [printing, setPrinting] = useState<ServiceOrder | null>(null);
  const [deleting, setDeleting] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
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
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    load();
    fetch(`http://${window.location.hostname}:3001/settings`).then(r => r.json()).then(d => setSettings(d));
    api.getClients().then(setClients);
  }, []);

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

  const openEdit = (os: ServiceOrder) => {
    setEditing(os);
    setForm({
      client_name: os.client_name, client_phone: os.client_phone, client_cpf: os.client_cpf,
      client_address: os.client_address, equipment: os.equipment, brand: os.brand,
      model: os.model, serial_number: os.serial_number, problem_description: os.problem_description,
      service_description: os.service_description, technician: os.technician, parts_used: os.parts_used,
      labor_cost: os.labor_cost, parts_cost: os.parts_cost, total_cost: os.total_cost,
      status: os.status, estimated_date: os.estimated_date || '', delivery_date: os.delivery_date || '',
      notes: os.notes || '',
    });
    setView('form');
  };

  const handleSave = async () => {
    if (!form.client_name.trim()) return showToast('Informe o nome do cliente', 'err');
    if (!form.equipment.trim()) return showToast('Informe o equipamento', 'err');
    if (!form.problem_description.trim()) return showToast('Descreva o problema', 'err');

    setSaving(true);
    try {
      if (editing) {
        await api.update(editing.id, form);
        showToast('OS atualizada com sucesso!');
      } else {
        const { nextNumber } = await api.getNextNumber();
        const newOS = { ...form, number: nextNumber };
        await api.create(newOS);
        showToast('OS criada com sucesso!');
      }
      await load();
      setView('list');
    } catch { showToast('Erro ao salvar OS', 'err'); }
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

  const setField = (k: string, v: string | number) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'labor_cost' || k === 'parts_cost') {
        next.total_cost = (Number(k === 'labor_cost' ? v : prev.labor_cost) || 0) + (Number(k === 'parts_cost' ? v : prev.parts_cost) || 0);
      }
      return next;
    });
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

  // ── Print View ──
  if (printing) {
    return <PrintView os={printing} settings={settings} onClose={() => setPrinting(null)} />;
  }

  // ── Form View ──
  if (view === 'form') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
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
            <Field label="Serviço Realizado" id="os-service">
              <textarea id="os-service" value={form.service_description} onChange={e => setField('service_description', e.target.value)} placeholder="Descreva o serviço executado..." rows={3} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Peças Utilizadas" id="os-parts">
              <textarea id="os-parts" value={form.parts_used} onChange={e => setField('parts_used', e.target.value)} placeholder="Liste as peças utilizadas..." rows={2} className={inputCls + ' resize-none'} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Técnico Responsável" id="os-tech">
                <input id="os-tech" value={form.technician} onChange={e => setField('technician', e.target.value)} placeholder="Nome do técnico" className={inputCls} />
              </Field>
              <div /> {/* Espaçador removido Status daqui */}
              <Field label="Previsão de Entrega" id="os-estimated">
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
              <input id="os-labor" type="number" min="0" step="0.01" value={form.labor_cost} onChange={e => setField('labor_cost', parseFloat(e.target.value) || 0)} className={inputCls} />
            </Field>
            <Field label="Peças (R$)" id="os-parts-cost">
              <input id="os-parts-cost" type="number" min="0" step="0.01" value={form.parts_cost} onChange={e => setField('parts_cost', parseFloat(e.target.value) || 0)} className={inputCls} />
            </Field>
            <Field label="Total (R$)" id="os-total">
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

        {/* Botões */}
        <div className="flex justify-end gap-3 sticky bottom-0 bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-md py-4 -mx-4 px-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => setView('list')} className="px-6 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60">
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {editing ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
          </button>
        </div>
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
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Wrench className="text-indigo-600" size={28} /> Ordens de Serviço
          </h1>
          <p className="text-slate-500 text-sm mt-1">{orders.length} OS cadastradas</p>
        </div>
        <button id="os-new-btn" onClick={openNew} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all">
          <Plus size={20} /> Nova OS
        </button>
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
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
          {paginatedOrders.map(os => (
            <div key={os.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all overflow-hidden group">
              <div className="flex items-start gap-4 p-5">
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
                    {os.estimated_date && <div className="text-xs text-slate-400">Prev.: {fmtDate(os.estimated_date)}</div>}
                  </div>
                </div>

                {/* Valor */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <div className="text-xs text-slate-400 mb-0.5">Total</div>
                  <div className="font-black text-indigo-600 dark:text-indigo-400 text-lg">{fmt(os.total_cost || 0)}</div>
                </div>

                {/* Ações */}
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPrinting(os)} title="Imprimir" className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Printer size={18} />
                  </button>
                  <button onClick={() => openEdit(os)} title="Editar" className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(os)} title="Excluir" className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                    <Trash2 size={18} />
                  </button>
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
    </div>
  );
};

// ─── Helper components ────────────────────────────────────────────────────────
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

export default ServiceOrders;
