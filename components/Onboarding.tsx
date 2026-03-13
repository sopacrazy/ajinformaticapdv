import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface Step {
  target: string; // DOM selector or 'center' for modal
  title: string;
  content: string;
  tab?: string;
  position?: 'right' | 'left' | 'top' | 'bottom' | 'center';
}

interface OnboardingProps {
  run: boolean;
  onFinish: (dontShowAgain: boolean) => void;
  setTab: (tab: string) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ run, onFinish, setTab }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState<{top: number, left: number} | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const steps: Step[] = [
    {
      target: 'center',
      title: 'Bem-vindo ao MicroERP! 👋',
      content: 'Vamos fazer um rápido tour para você conhecer as funcionalidades do seu novo sistema. É rapidinho!',
      position: 'center'
    },
    {
      target: '[data-tour="sidebar-dashboard"]',
      title: 'Painel Inicial',
      content: 'Aqui você tem uma visão geral do seu negócio: vendas do dia, alertas de estoque e fluxo de caixa.',
      tab: 'dashboard',
      position: 'right'
    },
    {
      target: '[data-tour="sidebar-pdv"]',
      title: 'Frente de Caixa (PDV)',
      content: 'Realize suas vendas aqui. Adicione produtos, escolha a forma de pagamento e finalize em segundos.',
      tab: 'pdv',
      position: 'right'
    },
    {
      target: '[data-tour="sidebar-inventory"]',
      title: 'Controle de Estoque',
      content: 'Cadastre seus produtos, ajuste quantidades e defina preços de custo e venda.',
      tab: 'inventory',
      position: 'right'
    },
    {
      target: '[data-tour="sidebar-finance"]',
      title: 'Gestão Financeira',
      content: 'Controle contas a pagar e receber. Mantenha seu fluxo de caixa sempre organizado.',
      tab: 'finance',
      position: 'right'
    },
    {
      target: '[data-tour="sidebar-reports"]',
      title: 'Relatórios Inteligentes',
      content: 'Acompanhe seu desempenho com relatórios detalhados e gráficos de evolução.',
      tab: 'reports',
      position: 'right'
    },
    {
      target: '[data-tour="sidebar-settings"]',
      title: 'Configurações',
      content: 'Personalize o sistema com o nome da sua loja, logo e faça backups de segurança.',
      tab: 'settings',
      position: 'right'
    },
    {
      target: 'center',
      title: 'Tudo Pronto! 🚀',
      content: 'Você já conhece o básico. Agora é com você! Boas vendas!',
      position: 'center'
    }
  ];

  useEffect(() => {
    if (!run) return;

    const step = steps[currentStep];
    
    // Switch tab if needed
    if (step.tab) {
        setTab(step.tab);
    }

    // Calculate position
    if (step.target === 'center') {
        setPosition(null); // Center modal
    } else {
        const el = document.querySelector(step.target);
        if (el) {
            const rect = el.getBoundingClientRect();
            // Simple positioning logic (assuming right placement for sidebar)
            setPosition({
                top: rect.top,
                left: rect.right + 20
            });
        }
    }
  }, [currentStep, run]);

  if (!run) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
        onFinish(dontShowAgain);
    } else {
        setCurrentStep(p => p + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* Backdrop - Lighter and clearer */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto transition-all duration-500" />

      {/* Card */}
      <div 
        className="pointer-events-auto bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700 w-[400px] flex flex-col gap-4 transition-all duration-500 absolute ring-4 ring-indigo-500/20"
        style={position ? { top: position.top, left: position.left } : { position: 'relative' }}
      >
        <div className="flex justify-between items-start">
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400">{step.title}</h3>
            <button onClick={() => onFinish(dontShowAgain)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {step.content}
        </p>

        {currentStep === 0 && (
             <div className="flex items-center gap-2 py-2">
                 <input 
                    type="checkbox" 
                    id="dontShow" 
                    checked={dontShowAgain}
                    onChange={e => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                 />
                 <label htmlFor="dontShow" className="text-sm text-slate-500 cursor-pointer select-none">
                    Não exibir este tutorial novamente
                 </label>
             </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Passo {currentStep + 1} de {steps.length}</span>
            <div className="flex gap-2">
                {currentStep > 0 && (
                    <button 
                        onClick={() => setCurrentStep(p => p - 1)}
                        className="px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Voltar
                    </button>
                )}
                <button 
                    onClick={handleNext}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-1"
                >
                    {isLast ? 'Concluir' : 'Próximo'} {!isLast && <ChevronRight size={16} />}
                </button>
            </div>
        </div>
        
        {/* Little arrow if pointing to side */}
        {position && (
            <div className="absolute top-8 -left-2 w-4 h-4 bg-white dark:bg-slate-800 rotate-45 border-l border-b border-gray-100 dark:border-gray-700" />
        )}
      </div>
    </div>
  );
};
