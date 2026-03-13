import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Menu, 
  Plus,
  X, 
  Moon, 
  Sun, 
  LogOut,
  ChevronRight,
  Settings as SettingsIcon,
  FileText,
  Store,
  ShoppingBag,
  Box,
  Wallet,
  TrendingUp,
  Gift,
  CreditCard,
  Wrench,
  User as UserIcon,
  Bell
} from 'lucide-react';
import { api } from '../services/api';
import { StoreSettings, User as UserType } from '../types';
import { Onboarding } from './Onboarding';
import StatusBar from './StatusBar';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  user: UserType | null;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout, user }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [settings, setSettings] = useState<StoreSettings>({ companyName: '', logoUrl: '' });
  const [runTour, setRunTour] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false;
  });
  const [isCadastroOpen, setIsCadastroOpen] = useState(false);

  useEffect(() => {
    const updateSettings = () => {
      api.getSettings().then(setSettings);
    };
    updateSettings();
    window.addEventListener('settings-updated', updateSettings);
    return () => window.removeEventListener('settings-updated', updateSettings);
  }, []);

  useEffect(() => {
    if (settings.companyName) {
      document.title = settings.companyName;
    }
  }, [settings.companyName]);

  useEffect(() => {
    const tutorialSeen = localStorage.getItem('tutorial_completed');
    if (!tutorialSeen) {
      setTimeout(() => setRunTour(true), 1000);
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleTourFinish = (dontShowAgain: boolean) => {
    setRunTour(false);
    if (dontShowAgain) {
        localStorage.setItem('tutorial_completed', 'true');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'pdv', label: 'PDV Vendas', icon: ShoppingCart, permission: 'pdv' },
    { id: 'vendas', label: 'Vendas', icon: TrendingUp, permission: 'sales' },
    { 
      id: 'cadastro', 
      label: 'Cadastro', 
      icon: Plus, 
      subItems: [
        { id: 'inventory', label: 'Estoque', icon: Package, permission: 'inventory' },
        { id: 'clients', label: 'Clientes', icon: UserIcon, permission: 'clients' },
        { id: 'suppliers', label: 'Fornecedores', icon: ShoppingBag, permission: 'suppliers' },
      ]
    },
    { id: 'material-shipment', label: 'Saída de Material', icon: Box, permission: 'materialShipment' },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, permission: 'finance' },
    { id: 'service-orders', label: 'Ordens de Serviço', icon: Wrench, permission: 'serviceOrders' },
    { id: 'reports', label: 'Relatórios', icon: FileText, permission: 'reports' },
  ].filter(item => {
    if (!user) return true;
    if (user.role === 'ADMIN') return true;
    
    // If it has sub-items, check if at least one sub-item is allowed
    if (item.subItems) {
      item.subItems = item.subItems.filter(sub => {
        if (!sub.permission) return true;
        return (user.permissions as any)[sub.permission];
      });
      return item.subItems.length > 0;
    }

    if (!item.permission) return true;
    return (user.permissions as any)[item.permission];
  });

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} print:bg-white print:block`}>
      <Onboarding run={runTour} onFinish={handleTourFinish} setTab={setActiveTab} />

      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-72' : 'w-24'
        } bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800/60 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] sticky top-0 h-screen z-50 flex flex-col shadow-[20px_0_40px_-15px_rgba(0,0,0,0.03)] dark:shadow-none print:hidden`}
      >
        {/* Branding Area */}
        <div className={`p-6 flex flex-col items-center ${isSidebarOpen ? 'justify-center gap-4' : 'justify-center'} min-h-[160px] relative border-b border-slate-100 dark:border-slate-800/60 mb-4`}>
          {isSidebarOpen && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 w-full">
              <div className="relative group">
                <div className="relative flex items-center justify-center p-1">
                  {(() => {
                    const logoUrl = settings.logoUrl || '';
                    if (logoUrl.startsWith('icon:')) {
                      const IconName = logoUrl.split(':')[1];
                      const iconSize = 48;
                      switch(IconName) {
                        case 'Store': return <Store size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'ShoppingBag': return <ShoppingBag size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'ShoppingCart': return <ShoppingCart size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'Package': return <Package size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'Box': return <Box size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'CreditCard': return <CreditCard size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'Wallet': return <Wallet size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'DollarSign': return <DollarSign size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'TrendingUp': return <TrendingUp size={iconSize} className="text-indigo-600 dark:text-white" />;
                        case 'Gift': return <Gift size={iconSize} className="text-indigo-600 dark:text-white" />;
                        default: return <Package size={iconSize} className="text-indigo-600 dark:text-white" />;
                      }
                    } else if (logoUrl) {
                      return <img src={logoUrl} alt="Logo" className="w-[84px] h-[84px] object-contain drop-shadow-sm" />;
                    }
                    return <Package size={48} className="text-indigo-600 dark:text-white" />;
                  })()}
                </div>
              </div>
              <div className="flex flex-col items-center text-center px-4 w-full">
                <span className="text-lg font-black text-slate-800 dark:text-white tracking-tighter leading-tight break-words max-w-full">
                  {settings.companyName || 'AJ PDV'}
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-500/80 leading-none mt-1">Sistema ERP</span>
              </div>
            </div>
          )}
          {!isSidebarOpen && (
            <div className="flex items-center justify-center p-1">
               {/* Simplified icon for closed sidebar if needed, or just let it fall through */}
               {(() => {
                    const logoUrl = settings.logoUrl || '';
                    if (logoUrl.startsWith('icon:')) {
                       // ... same logic but smaller or just use current
                       return <Package size={32} className="text-indigo-600 dark:text-white" />;
                    } else if (logoUrl) {
                      return <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />;
                    }
                    return <Package size={32} className="text-indigo-600 dark:text-white" />;
               })()}
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`absolute ${isSidebarOpen ? 'right-2' : 'left-1/2 -translate-x-1/2'} top-4 p-1.5 rounded-lg transition-all duration-500 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 dark:hover:text-indigo-400 z-[60] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-800`}
            title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
          >
            <ChevronRight size={18} className={`transition-transform duration-500 ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {menuItems.map((item) => (
            <React.Fragment key={item.id}>
              {item.subItems ? (
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (isSidebarOpen) setIsCadastroOpen(!isCadastroOpen);
                    }}
                    className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-300 group relative ${
                      isCadastroOpen && isSidebarOpen ? 'bg-indigo-50 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                    } ${!isSidebarOpen && 'justify-center'}`}
                  >
                    <item.icon size={22} className={`${isCadastroOpen && isSidebarOpen ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'} transition-all`} />
                    {isSidebarOpen && (
                      <>
                        <span className="ml-4 truncate text-sm tracking-tight font-bold flex-1 text-left">{item.label}</span>
                        <ChevronRight size={16} className={`transition-transform duration-300 ${isCadastroOpen ? 'rotate-90' : ''} text-slate-300`} />
                      </>
                    )}
                  </button>
                  {isCadastroOpen && isSidebarOpen && (
                    <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-300">
                      {item.subItems.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 ${
                            activeTab === sub.id 
                            ? 'text-indigo-600 dark:text-indigo-400 font-black' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                        >
                          <sub.icon size={16} className="mr-3" />
                          <span className="text-xs uppercase tracking-widest">{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                    activeTab === item.id 
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 active:scale-[0.98]' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
                  } ${!isSidebarOpen && 'justify-center'}`}
                >
                  <item.icon size={22} className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} transition-all duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                  
                  {isSidebarOpen && (
                    <span className={`ml-4 truncate text-sm tracking-tight font-bold ${activeTab === item.id ? 'text-white' : ''}`}>
                      {item.label}
                    </span>
                  )}

                  {activeTab === item.id && (
                    <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white/40 rounded-full blur-[1px]" />
                  )}
                </button>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Footer Area */}
        <div className="p-4 pb-12 space-y-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-1 gap-1 mb-2">
            {(user?.role === 'ADMIN' || user?.permissions.settings) && (
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center p-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'settings' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                } ${!isSidebarOpen && 'justify-center'}`}
              >
                <SettingsIcon size={20} className={activeTab === 'settings' ? 'animate-spin-slow' : ''} />
                {isSidebarOpen && <span className="ml-3 text-xs font-bold">Configurações</span>}
              </button>
            )}
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`flex items-center p-3 rounded-xl transition-all duration-300 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!isSidebarOpen && 'justify-center'}`}
            >
              {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-400" />}
              {isSidebarOpen && <span className="ml-3 text-xs font-bold">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
            </button>

            {!isSidebarOpen && (
              <button 
                onClick={onLogout}
                className="flex items-center p-3 rounded-xl transition-all duration-300 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 justify-center"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>

          {/* User Info Capsule */}
          {isSidebarOpen && user && (
            <div className="px-3 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between border border-slate-100/50 dark:border-slate-700/50 group/user">
              <div className="flex items-center gap-3 truncate flex-1">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 font-black text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-black text-slate-800 dark:text-white truncate">{user.username}</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                title="Sair do sistema"
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Floating Header */}
        <header className="h-24 flex items-center justify-between px-10 shrink-0 relative z-10 bg-transparent no-print print:hidden">
          <div className="flex flex-col ml-4">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight animate-in fade-in slide-in-from-top-4 duration-500">
              {(() => {
                const flatItems = menuItems.flatMap(i => i.subItems ? [i, ...i.subItems] : [i]);
                return flatItems.find(i => i.id === activeTab)?.label || 'Acesso Restrito';
              })()}
            </h2>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-700">
              Sistema ERP &bull; Operação em tempo real
            </p>
          </div>


        </header>

        <section className="flex-1 overflow-y-auto custom-scrollbar p-0 md:px-8 pb-8 relative z-[20]">
          {children}
        </section>
        
        {/* Background Decorative Blur */}
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

        <StatusBar />
      </main>
    </div>
  );
};

export default Layout;
