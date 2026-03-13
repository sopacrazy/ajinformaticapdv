import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, Server, Activity } from 'lucide-react';

const StatusBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dbConnected, setDbConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkDb = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:3001/settings`);
        setDbConnected(response.ok);
      } catch {
        setDbConnected(false);
      }
    };

    checkDb();
    const interval = setInterval(checkDb, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-50 no-print">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="text-[10px] font-medium uppercase tracking-widest">{isOnline ? 'Internet Online' : 'Sem Conexão'}</span>
          </div>
        </div>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-2 hidden sm:flex">
          <div className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-rose-500'}`} />
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Database size={12} />
            <span className="text-[10px] font-medium uppercase tracking-widest">{dbConnected ? 'Banco de Dados Conectado' : 'Erro de Conexão DB'}</span>
          </div>
        </div>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 hidden md:block" />

        <div className="flex items-center gap-2 hidden md:flex">
          <Server size={12} className="text-slate-400" />
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-none">
            Servidor Local: <span className="text-indigo-600 font-medium ml-1">v1.0.0</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
          <Activity size={10} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Ativo</span>
        </div>
        <p className="text-[9px] font-medium text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Adriano Martins
        </p>
      </div>
    </footer>
  );
};

export default StatusBar;
