
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StoreSettings, User as UserType } from '../types';
import { 
  Save, Building2, CheckCircle2, Lock,
  Store, ShoppingBag, ShoppingCart, Package, Box, 
  CreditCard, Wallet, DollarSign, TrendingUp, Gift,
  Users, UserPlus, Trash2, Edit2, Shield, Eye, EyeOff, X, Upload, FileText, Cloud
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
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Configurações da Loja</h1>
        <p className="text-gray-500 dark:text-gray-400">Personalize a identidade do seu sistema.</p>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-indigo-600" size={24} /> Identidade Visual
          </h3>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Ícone da Loja</label>
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
                         ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' 
                         : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300'
                       }`}
                       title={item.label}
                     >
                       <item.icon size={24} />
                     </button>
                   );
                })}
                <label 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                    settings.logoUrl && !settings.logoUrl.startsWith('icon:')
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-500'
                  }`}
                  title="Upload de Imagem"
                >
                  <Upload size={24} />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900 flex items-center gap-4">
             <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                {settings.logoUrl?.startsWith('icon:') ? (
                  (() => {
                    const iconName = settings.logoUrl.split(':')[1];
                    const iconObj = AVAILABLE_ICONS.find(i => i.name === iconName);
                    const Icon = iconObj ? iconObj.icon : Package;
                    return <Icon className="text-indigo-600 dark:text-indigo-400" size={32} />;
                  })()
                ) : settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Preview" className="w-10 h-10 object-contain" />
                ) : (
                  <Package className="text-gray-300" size={32} />
                )}
             </div>
             <div className="flex-1">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Prévia do Ícone</h4>
                <p className="text-sm text-indigo-700/70 dark:text-indigo-400/70 mt-1">
                  Este ícone será exibido no topo do menu lateral.
                </p>
             </div>
          </div>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <FileText className="text-indigo-600" size={24} /> Configuração do Recibo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Chave PIX</label>
                <input 
                  type="text" 
                  value={settings.pixKey || ''}
                  onChange={e => setSettings({...settings, pixKey: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: 00.000.000/0001-00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Favorecido PIX</label>
                <input 
                  type="text" 
                  value={settings.pixFavorecido || ''}
                  onChange={e => setSettings({...settings, pixFavorecido: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: Nome da Empresa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Nome para Assinatura</label>
                <input 
                  type="text" 
                  value={settings.signatureName || ''}
                  onChange={e => setSettings({...settings, signatureName: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: Responsável da Loja"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">CNPJ</label>
                <input 
                  type="text" 
                  value={settings.cnpj || ''}
                  onChange={e => setSettings({...settings, cnpj: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: 00.000.000/0001-00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Insc. Estadual</label>
                <input 
                  type="text" 
                  value={settings.inscEst || ''}
                  onChange={e => setSettings({...settings, inscEst: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: 000.000.000-0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                <input 
                  type="text" 
                  value={settings.phone || ''}
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: (00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Email</label>
                <input 
                  type="email" 
                  value={settings.email || ''}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: contato@empresa.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                <input 
                  type="text" 
                  value={settings.address || ''}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  placeholder="Ex: Rua Nome, nº 123, Bairro, Cidade - UF"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            {saved && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 size={20} />
                <span>Configurações salvas!</span>
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

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
         <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Cloud className="text-sky-500" size={24} /> Backup na Nuvem (Supabase)
            </h3>
         </div>
         <div className="p-8">
            <div className="flex items-center justify-between p-6 bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/20 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center">
                        <Cloud className="text-sky-500" size={28} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">Status da Sincronização</h4>
                        <div className="flex items-center gap-2 mt-1">
                            {settings.lastBackupAt ? (
                                <>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        Último backup realizado em: <span className="text-slate-900 dark:text-white font-bold">{settings.lastBackupAt}</span>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        O backup ainda não foi iniciado ou o servidor foi reiniciado.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-black rounded-full uppercase tracking-tighter">
                        Automático a cada 1 hora
                    </span>
                    <p className="text-[10px] text-slate-400 mt-2">Sincroniza todos os dados do SQLite para o Postgres na nuvem.</p>
                </div>
            </div>
         </div>
      </div>

      {/* Maintenance Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
         <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="text-amber-500" size={24} /> Manutenção do Sistema
            </h3>
         </div>
         <div className="p-8">
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Correção de Dados Fantasmas</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Use isso se você excluiu vendas no financeiro, mas elas continuam aparecendo nos relatórios.
                    </p>
                </div>
                <button 
                  onClick={async () => {
                      if(window.confirm('Isso irá apagar vendas órfãs do banco de dados. Deseja continuar?')) {
                          try {
                              const res = await api.fixOrphans();
                              alert(`Manutenção concluída! ${res.fixedCount} registros corrigidos.`);
                          } catch (e) {
                              alert('Erro ao executar manutenção.');
                          }
                      }
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-200 dark:shadow-none"
                >
                    CORRIGIR AGORA
                </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 rounded-2xl mt-4">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Reiniciar Tutorial</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Exibir o guia de boas-vindas novamente na próxima inicialização.
                    </p>
                </div>
                <button 
                  onClick={() => {
                      localStorage.removeItem('tutorial_completed');
                      if(confirm('Tutorial resetado! Deseja reiniciar o sistema agora para ver?')) {
                          window.location.reload();
                      }
                  }}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                    RESETAR TOUR
                </button>
            </div>
         </div>
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
                dashboard: true,
                pdv: true,
                sales: true,
                inventory: true,
                clients: true,
                suppliers: true,
                materialShipment: true,
                finance: true, 
                reports: true, 
                serviceOrders: true,
                settings: false,
                manageUsers: false 
              } 
            });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <UserPlus size={18} /> NOVO USUÁRIO
        </button>
      </div>

      <div className="p-8">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
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
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 truncate">
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
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Permissões do Operador</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <PermissionToggle 
                        label="Painel de Controle" 
                        value={editingUser.permissions?.dashboard ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, dashboard: v } })} 
                      />
                      <PermissionToggle 
                        label="PDV Vendas" 
                        value={editingUser.permissions?.pdv ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, pdv: v } })} 
                      />
                      <PermissionToggle 
                        label="Histórico de Vendas" 
                        value={editingUser.permissions?.sales ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, sales: v } })} 
                      />
                      <PermissionToggle 
                        label="Ordens de Serviço" 
                        value={editingUser.permissions?.serviceOrders ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, serviceOrders: v } })} 
                      />
                      <PermissionToggle 
                        label="Financeiro" 
                        value={editingUser.permissions?.finance ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, finance: v } })} 
                      />
                      <PermissionToggle 
                        label="Estoque / Produtos" 
                        value={editingUser.permissions?.inventory ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, inventory: v } })} 
                      />
                      <PermissionToggle 
                        label="Clientes" 
                        value={editingUser.permissions?.clients ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, clients: v } })} 
                      />
                      <PermissionToggle 
                        label="Fornecedores" 
                        value={editingUser.permissions?.suppliers ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, suppliers: v } })} 
                      />
                      <PermissionToggle 
                        label="Saída de Material" 
                        value={editingUser.permissions?.materialShipment ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, materialShipment: v } })} 
                      />
                      <PermissionToggle 
                        label="Relatórios" 
                        value={editingUser.permissions?.reports ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, reports: v } })} 
                      />
                      <PermissionToggle 
                        label="Configurações (Empresa)" 
                        value={editingUser.permissions?.settings ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, settings: v } })} 
                      />
                      <PermissionToggle 
                        label="Gerenciar Usuários" 
                        value={editingUser.permissions?.manageUsers ?? false} 
                        onChange={v => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions!, manageUsers: v } })} 
                      />
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
