
import React, { useState, useEffect } from 'react';
import { User, Plus, Search, Edit, Trash2, X, Phone, MapPin, Mail, FileText, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', cpf_cnpj: '', email: '', phone: '', address: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await api.getClients();
    setClients(data);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.cpf_cnpj && c.cpf_cnpj.includes(searchTerm))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      await api.updateClient(editingId, formData);
    } else {
      await api.saveClient(formData);
    }

    await loadClients();
    setShowModal(false);
    setFormData({ name: '', cpf_cnpj: '', email: '', phone: '', address: '' });
    setEditingId(null);
  };

  const handleEdit = (client: any) => {
    setFormData({
      name: client.name,
      cpf_cnpj: client.cpf_cnpj || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    });
    setEditingId(client.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja excluir este cliente?')) {
      await api.deleteClient(id);
      loadClients();
    }
  };

  return (
    <div className="flex flex-col gap-8 h-[calc(100vh-8rem)] max-w-[1700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase mb-1">
            Gestão de <span className="text-gradient">Clientes</span>
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Lista de parceiros e consumidores
          </p>
        </div>
        
        <button 
          onClick={() => {
            setFormData({ name: '', cpf_cnpj: '', email: '', phone: '', address: '' });
            setEditingId(null);
            setShowModal(true);
          }}
          className="px-8 py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-[2rem] flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 active:scale-95 hover:-translate-y-1"
        >
          <Plus size={20} /> Adicionar Cliente
        </button>
      </div>

      <div className="glass-card rounded-[2.5rem] p-6 border-white/20 flex flex-col md:flex-row gap-4 items-center shadow-2xl shadow-slate-200/20">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF/CNPJ..."
            className="w-full pl-16 pr-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-bold placeholder:text-slate-300 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 glass-card rounded-[2.5rem] overflow-hidden flex flex-col border-white/20 shadow-2xl shadow-slate-200/20">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
              <tr className="border-b border-indigo-50/5">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nome do Cliente</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documento</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contato</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/5">
              {filteredClients.map((client) => (
                <tr key={client.id} className="group hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all duration-300">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        <User size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-white text-base tracking-tight">{client.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin size={10} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{client.address || 'Sem endereço'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {client.cpf_cnpj ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                        <FileText size={12} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{client.cpf_cnpj}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      {client.phone && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <Phone size={12} className="text-indigo-500" />
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <Mail size={12} />
                          {client.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleEdit(client)} 
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 rounded-2xl transition-all shadow-sm"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-600 rounded-2xl transition-all shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="p-8 border-b border-indigo-50/10 bg-indigo-600/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                  {editingId ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo / Razão Social</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-800 dark:text-white transition-all shadow-inner" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF / CNPJ</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-800 dark:text-white shadow-inner"
                    value={formData.cpf_cnpj}
                    onChange={e => setFormData({...formData, cpf_cnpj: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-800 dark:text-white shadow-inner"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-800 dark:text-white shadow-inner"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-800 dark:text-white shadow-inner"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-indigo-50/10 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  Salvar Cliente <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
