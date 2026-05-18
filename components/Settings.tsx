
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StoreSettings, User as UserType } from '../types';
import { 
  Save, Building2, CheckCircle2, Lock,
  Store, ShoppingBag, ShoppingCart, Package, Box, 
  CreditCard, Wallet, DollarSign, TrendingUp, Gift,
  Users, UserPlus, Trash2, Edit2, Shield, Eye, EyeOff, X, Upload, FileText, Cloud, Check, RefreshCw
} from 'lucide-react';

const AVAILABLE_ICONS = [
  { name: 'Store', icon: Store, label: 'Loja' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'Sacola' },
  { name: 'ShoppingCart', icon: ShoppingCart, label: 'Carrinho' },
  { name: 'Package', icon: Package, label: 'Pacote' },
  { name: 'Box', icon: Box, label: 'Caixa' },
  { name: 'CreditCard', icon: CreditCard, label: 'Cartão' },
  { name: 'Wallet', icon: Wallet, label: 'Carteira' },
  { name: 'DollarSign', icon: DollarSign, label: 'Cifrão' },
  { name: 'TrendingUp', icon: TrendingUp, label: 'Gráfico' },
  { name: 'Gift', icon: Gift, label: 'Presente' },
];

const Settings: React.FC<{ user: UserType | null }> = ({ user }) => {
  const [settings, setSettings] = useState<StoreSettings>({ companyName: '', logoUrl: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Erro ao salvar configurações. A imagem pode ser muito grande ou houve um problema de conexão.');
    }
  };

  const handleIconSelect = (iconName: string) => {
    setSettings({ ...settings, logoUrl: `icon:${iconName}` });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Configurações do Sistema</h1>
        <p className="text-gray-500 dark:text-gray-400">Gerencie a identidade e usuários da sua empresa.</p>
      </header>

      {/* Cloud Database Status Card */}
      <div className="bg-gradient-to-br from-indigo-500/10 to-rose-500/10 dark:from-indigo-900/10 dark:to-rose-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/20 p-8 flex items-center gap-6 shadow-sm overflow-hidden relative">
         <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
         <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 shrink-0">
             <Cloud className="text-indigo-600 animate-pulse" size={32} />
         </div>
         <div className="flex-1">
             <h3 className="text-xl font-bold font-black text-slate-800 dark:text-white uppercase tracking-tighter">Banco de Dados Cloud</h3>
             <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">
               O sistema está conectado ao Supabase. Todas as alterações são salvas em tempo real na nuvem.
             </p>
         </div>
         <div className="hidden md:block">
            <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div> Online
            </span>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-indigo-600" size={24} /> Identidade Visual & Empresa
          </h3>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nome da Empresa</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={settings.companyName}
                    onChange={e => setSettings({...settings, companyName: e.target.value})}
                    className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="Ex: Minha Loja Varejo"
                  />
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Ícone ou Logo</label>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                    {settings.logoUrl?.startsWith('icon:') ? (
                      (() => {
                        const iconName = settings.logoUrl.split(':')[1];
                        const iconObj = AVAILABLE_ICONS.find(i => i.name === iconName);
                        const Icon = iconObj ? iconObj.icon : Package;
                        return <Icon className="text-indigo-600 dark:text-indigo-400" size={48} />;
                      })()
                    ) : settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Package className="text-slate-200" size={48} />
                    )}
                  </div>
                  <label className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-all flex items-center gap-2">
                    <Upload size={14} /> CARREGAR IMAGEM
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Presets de Ícones</label>
              <div className="grid grid-cols-5 gap-3">
                {AVAILABLE_ICONS.map((item) => {
                   const isSelected = settings.logoUrl === `icon:${item.name}`;
                   return (
                     <button
                       key={item.name}
                       type="button"
                       onClick={() => handleIconSelect(item.name)}
                       className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${
                         isSelected 
                         ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-md' 
                         : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200 dark:hover:border-slate-600'
                       }`}
                       title={item.label}
                     >
                       <item.icon size={24} />
                     </button>
                   );
                })}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <FileText className="text-indigo-600" size={24} /> Detalhes do Recibo & Contato
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Chave PIX</label>
                <input 
                  type="text" 
                  value={settings.pixKey || ''}
                  onChange={e => setSettings({...settings, pixKey: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Favorecido PIX</label>
                <input 
                  type="text" 
                  value={settings.pixFavorecido || ''}
                  onChange={e => setSettings({...settings, pixFavorecido: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome p/ Assinatura</label>
                <input 
                  type="text" 
                  value={settings.signatureName || ''}
                  onChange={e => setSettings({...settings, signatureName: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CNPJ</label>
                <input 
                  type="text" 
                  value={settings.cnpj || ''}
                  onChange={e => setSettings({...settings, cnpj: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Insc. Estadual</label>
                <input 
                  type="text" 
                  value={settings.inscEst || ''}
                  onChange={e => setSettings({...settings, inscEst: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                <input 
                  type="text" 
                  value={settings.phone || ''}
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email</label>
                <input 
                  type="email" 
                  value={settings.email || ''}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                <input 
                  type="text" 
                  value={settings.address || ''}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            {saved && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 size={20} />
                <span>Configurações salvas na Nuvem!</span>
              </div>
            )}
            <button 
              type="submit"
              className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
            >
              <Save size={20} /> SALVAR ALTERAÇÕES
            </button>
          </div>
        </form>
      </div>

      {/* User Management Section */}
      {(user?.role === 'ADMIN' || user?.permissions.manageUsers) && (
        <UserManagement currentUser={user} />
      )}

      {/* Security Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Lock className="text-rose-500" size={24} /> Segurança
            </h3>
         </div>
         <div className="p-8">
            <SecurityForm />
         </div>
      </div>
    </div>
  );
};

const UserManagement: React.FC<{ currentUser: UserType | null }> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (e) {
      console.error('Erro ao carregar usuários', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.username) return;

    try {
      if (editingUser.id) {
        await api.updateUser(editingUser.id, editingUser);
      } else {
        await api.saveUser(editingUser);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (e) {
      alert('Erro ao salvar usuário. Verifique se o nome de usuário já existe.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await api.deleteUser(id);
        loadUsers();
      } catch (e) {
        alert('Erro ao excluir usuário.');
      }
    }
  };

  const PermissionToggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <button 
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
      <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="text-indigo-600" size={24} /> Gerenciamento de Usuários
        </h3>
        <button 
          onClick={() => {
            setEditingUser({ 
              username: '', 
              password: '', 
              role: 'OPERATOR', 
              permissions: { 
                dashboard: true, pdv: true, sales: true, inventory: false, 
                clients: true, suppliers: false, materialShipment: false, 
                finance: false, reports: false, serviceOrders: true, 
                settings: false, manageUsers: false 
              } 
            });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <UserPlus size={16} /> NOVO USUÁRIO
        </button>
      </div>

      <div className="p-8">
        {loading ? (
          <div className="flex justify-center p-12">
            <RefreshCw className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map(u => (
              <div key={u.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      {u.username}
                      {u.role === 'ADMIN' && <Shield size={14} className="text-indigo-500" />}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                      {u.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingUser(u);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  {u.username !== 'admin' && u.id !== currentUser?.id && (
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                {editingUser?.id ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <form id="user-form" onSubmit={handleSaveUser} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nome de Usuário</label>
                    <input 
                      type="text"
                      required
                      value={editingUser?.username}
                      onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                      {editingUser?.id ? 'Senha (em branco mantém)' : 'Senha'}
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser?.id}
                        value={editingUser?.password}
                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Acesso</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, role: 'ADMIN', permissions: { dashboard: true, pdv: true, sales: true, inventory: true, clients: true, suppliers: true, materialShipment: true, finance: true, reports: true, serviceOrders: true, settings: true, manageUsers: true } })}
                      className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center gap-2 ${editingUser?.role === 'ADMIN' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Shield size={24} /> Administrador
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, role: 'OPERATOR' })}
                      className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center gap-2 ${editingUser?.role === 'OPERATOR' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Users size={24} /> Operador
                    </button>
                  </div>
                </div>

                {editingUser?.role === 'OPERATOR' && (
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">Permissões Específicas</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <PermissionToggle label="Dashboard" value={editingUser.permissions?.dashboard ?? false} onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, dashboard: v } })} />
                      <PermissionToggle label="PDV" value={editingUser.permissions?.pdv ?? false} onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, pdv: v } })} />
                      <PermissionToggle label="Vendas" value={editingUser.permissions?.sales ?? false} onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, sales: v } })} />
                      <PermissionToggle label="Estoques" value={editingUser.permissions?.inventory ?? false} onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, inventory: v } })} />
                      <PermissionToggle label="Ordens de Serviço" value={editingUser.permissions?.serviceOrders ?? false} onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, serviceOrders: v } })} />
                      <PermissionToggle label="Financeiro" value={editingUser.permissions?.finance ?? false} onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, finance: v } })} />
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 flex gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-2xl font-black transition-all"
              >
                CANCELAR
              </button>
              <button 
                form="user-form"
                type="submit"
                className="flex-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} /> SALVAR USUÁRIO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SecurityForm: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [msg, setMsg] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    
    try {
      await api.updatePassword(oldPassword, newPassword);
      setStatus('SUCCESS');
      setMsg('Senha atualizada com sucesso!');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setStatus('IDLE'), 3000);
    } catch (err) {
      setStatus('ERROR');
      setMsg('Erro ao atualizar. Verifique sua senha atual.');
      setTimeout(() => setStatus('IDLE'), 3000);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
             <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Senha Atual</label>
             <input 
               type="password" 
               className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold"
               value={oldPassword}
               onChange={e => setOldPassword(e.target.value)}
             />
          </div>
          <div className="space-y-2">
             <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nova Senha</label>
             <input 
               type="password" 
               className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold" 
               value={newPassword}
               onChange={e => setNewPassword(e.target.value)}
             />
          </div>
       </div>
       
       <div className="flex items-center justify-between">
         <div className="flex-1">
           {status === 'SUCCESS' && (
             <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 animate-in fade-in">
               <CheckCircle2 size={18} /> {msg}
             </p>
           )}
           {status === 'ERROR' && (
             <p className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2 animate-in fade-in animate-shake">
               <Lock size={18} /> {msg}
             </p>
           )}
         </div>
         <button 
           type="submit"
           disabled={!oldPassword || !newPassword}
           className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl shadow-rose-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
         >
           ALTERAR SENHA
         </button>
       </div>
    </form>
  );
};

export default Settings;
