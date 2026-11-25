import React from 'react';
import {
  Home,
  Receipt,
  Plus,
  PieChart,
  User
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const { openTxModal } = useFinance();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 pb-safe transition-colors">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        
        {/* Tab 1: Início */}
        <button
          onClick={() => onTabChange('inicio')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'inicio'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Home size={20} className={currentTab === 'inicio' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Início</span>
        </button>

        {/* Tab 2: Movimentações */}
        <button
          onClick={() => onTabChange('movimentacoes')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'movimentacoes'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Receipt size={20} className={currentTab === 'movimentacoes' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Movimentações</span>
        </button>

        {/* Center Tab: Action Button (Adicionar +) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            type="button"
            onClick={() => openTxModal('create')}
            title="Adicionar Movimentação"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 ring-4 ring-white dark:ring-slate-900 active:scale-90 hover:scale-105 transition-all"
          >
            <Plus size={28} className="stroke-[2.8]" />
          </button>
        </div>

        {/* Tab 4: Relatórios */}
        <button
          onClick={() => onTabChange('relatorios')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'relatorios'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <PieChart size={20} className={currentTab === 'relatorios' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Relatórios</span>
        </button>

        {/* Tab 5: Perfil */}
        <button
          onClick={() => onTabChange('perfil')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'perfil'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <User size={20} className={currentTab === 'perfil' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Perfil</span>
        </button>

      </div>
    </nav>
  );
};
