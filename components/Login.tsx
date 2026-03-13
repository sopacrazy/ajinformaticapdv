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
  const [companyName, setCompanyName] = useState('AJ INFORMATICA');
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-0 md:p-6 lg:p-12 relative overflow-hidden font-['Outfit',sans-serif]">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-100 blur-[120px] rounded-full opacity-60" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-100 blur-[120px] rounded-full opacity-60" />

      <div className="max-w-6xl w-full h-auto md:h-[min(800px,90vh)] flex flex-col md:flex-row bg-white rounded-none md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden relative z-10 border border-slate-200/60 transition-all duration-500">
        
        {/* Left Side - Visual & Branding */}
        <div className="hidden md:flex md:w-1/2 relative bg-indigo-600 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1920&auto=format&fit=crop" 
            alt="Technology"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 scale-110 animate-slow-fade"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-600/50 to-transparent" />
          
          <div className="relative z-10 p-12 lg:p-16 flex flex-col justify-between h-full text-white">
            <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
              <div className="relative group">
                <div className="absolute inset-0 bg-white blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative">
                  {logoUrl ? (
                    logoUrl.startsWith('icon:') ? (
                      <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/30 shadow-2xl">
                         <Store size={64} />
                      </div>
                    ) : (
                      <img src={logoUrl} alt="Logo" className="w-48 h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]" />
                    )
                  ) : (
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/30 shadow-2xl">
                      <Store size={64} />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black tracking-tight">{companyName}</span>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-[0.3em]">Sistema de Gestão</p>
              </div>
            </div>

            <div className="space-y-4 lg:space-y-6 mt-8 md:mt-0">
              <h2 className="text-4xl lg:text-5xl font-black leading-tight">
                Tecnologia que <br />
                <span className="text-indigo-200">impulsiona</span> sua <br />
                gestão.
              </h2>
              <div className="h-1.5 w-24 bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
              <p className="text-indigo-50/80 font-medium text-lg lg:text-xl max-w-sm leading-relaxed">
                A inteligência digital que conecta inovação e controle para transformar os resultados do seu negócio.
              </p>
            </div>

            <div className="flex items-center gap-3 py-2 px-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 w-fit">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-bold text-indigo-50 tracking-wider">SISTEMA OPERACIONAL ATIVO</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-white relative overflow-hidden">
          <div className="max-w-sm mx-auto w-full space-y-6 lg:space-y-10 animate-stagger-in">
            <div className="space-y-3">
                <h3 className="text-3xl font-black text-slate-900">Autenticação</h3>
                <p className="text-slate-500 font-medium">Insira suas credenciais para acessar o painel.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Identidade</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-transform group-focus-within:translate-x-1">
                      <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 group-focus-within:border-indigo-500/30 group-focus-within:bg-indigo-50 transition-all">
                        <UserIcon className="text-slate-400 group-focus-within:text-indigo-500" size={18} />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={username}
                      required
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-transparent border-b-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                      placeholder="Username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Chave de Acesso</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-transform group-focus-within:translate-x-1">
                       <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 group-focus-within:border-indigo-500/30 group-focus-within:bg-indigo-50 transition-all">
                        <Lock className="text-slate-400 group-focus-within:text-indigo-500" size={18} />
                      </div>
                    </div>
                    <input
                      type="password"
                      value={password}
                      required
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-transparent border-b-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-500 text-[11px] font-black rounded-xl text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
                  {error}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs tracking-[.2em] shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      AUTENTICAR ACESSO
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <ShieldCheck size={14} className="text-indigo-500" />
                        Ambiente Segregado
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">v1.0.0</span>
                </div>
                <p className="mt-6 text-center text-[11px] text-slate-400 font-medium leading-relaxed">
                    Desenvolvido com excelência por <br />
                    <span className="text-indigo-600 font-black uppercase tracking-tight inline-flex items-center gap-1">
                      Adriano Martins
                    </span>
                </p>
            </div>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
};

export default Login;
