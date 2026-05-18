import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const themes = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      icon: 'text-rose-500',
      btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      icon: 'text-amber-500',
      btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      icon: 'text-indigo-500',
      btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
    }
  };

  const theme = themes[type];

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center flex flex-col items-center gap-6">
          <div className={`w-20 h-20 ${theme.bg} rounded-full flex items-center justify-center ${theme.icon} animate-pulse`}>
            <AlertCircle size={40} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{title}</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
              {message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            <button 
              onClick={onClose}
              className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className={`py-4 ${theme.btn} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
