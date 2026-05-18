import React, { useState, useEffect } from 'react';
import { LogIn, User as UserIcon, Lock, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType } from '../types';
import StatusBar from './StatusBar';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [companyName, setCompanyName] = useState('Aj Informatica');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await api.getSettings();
        if (settings) {
          if (settings.companyName) setCompanyName(settings.companyName);
          if (settings.logoUrl) setLogoUrl(settings.logoUrl);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username, password);
      onLogin(data.user);
    } catch (err) {
      setError('Usuário ou senha incorretos');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4 md:p-10 font-['Outfit',sans-serif] relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-500/10 blur-[150px] rounded-full animate-pulse-slow" />

      <div className="w-full max-w-[850px] grid grid-cols-1 lg:grid-cols-2 bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.1)] overflow-hidden relative z-10 transition-all duration-300">
        
        {/* Left Side: Visual Inspiration */}
        <div className="hidden lg:flex relative bg-slate-900 overflow-hidden group">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop" 
            alt="Abstract Tech"
            className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-[10s] group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/60 via-slate-900/90 to-slate-900" />
          
          <div className="relative z-10 p-10 flex flex-col justify-center items-center lg:items-start h-full text-center lg:text-left">
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/20 rounded-full text-[9px] font-black tracking-[0.3em] text-indigo-200 uppercase">
                  Gestão Inteligente
                </span>
                <h2 className="text-3xl font-black text-white leading-[1.1] tracking-tighter">
                  Potencialize o <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-200">seu Negócio.</span>
                </h2>
              </div>
              <p className="text-indigo-100/60 text-sm font-medium max-w-[260px] leading-relaxed mx-auto lg:mx-0">
                Plataforma completa para gerenciar vendas, estoque e serviços com precisão.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="p-6 md:p-8 lg:p-10 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4">
              <div className="flex flex-col items-center lg:items-start gap-3">
                {!settingsLoaded ? (
                  <div className="h-28 w-40 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse mb-2" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-28 w-auto object-contain mb-2 animate-in fade-in duration-500" />
                ) : (
                  <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 mb-2">
                    <Store size={40} />
                  </div>
                )}
                <div className="space-y-0.5 text-center lg:text-left">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Entrar</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Bem-vindo de volta.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1 group">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Identificação</label>
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input
                      type="text"
                      value={username}
                      required
                      placeholder="Seu usuário"
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-300 shadow-inner text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1 group">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Chave de Segurança</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input
                      type="password"
                      value={password}
                      required
                      placeholder="••••••••"
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-300 shadow-inner text-xs"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-2 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 dark:text-rose-400 text-[9px] font-black rounded-xl text-center animate-in zoom-in duration-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] tracking-[.2em] shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group overflow-hidden"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    AUTENTICAR ACESSO
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <footer className="pt-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">
                 <div className="flex items-center gap-1 opacity-60">
                   <ShieldCheck size={10} className="text-emerald-500" /> PROVEDOR SEGURO
                 </div>
                 <div className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                 <span className="opacity-60">Versão 2.4.0</span>
              </div>
              
              <div className="text-center">
                 <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 tracking-tight uppercase">Adriano Martins</span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
};

export default Login;
