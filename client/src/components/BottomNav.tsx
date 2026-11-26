import React from 'react';
import {
  Home,
  LayoutGrid,
  Plus,
  Target,
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B1F17]/95 backdrop-blur-xl border-t border-[#2A4435] pb-safe transition-colors">
      <div className="max-w-md mx-auto px-3 h-16 flex items-center justify-between relative">
        
        {/* Tab 1: Início */}
        <button
          type="button"
          onClick={() => onTabChange('inicio')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'inicio'
              ? 'text-[#00E676] font-bold scale-105'
              : 'text-slate-400 hover:text-white font-medium'
          }`}
        >
          <Home size={20} className={currentTab === 'inicio' ? 'stroke-[2.5] text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Início</span>
        </button>

        {/* Tab 2: Categorias */}
        <button
          type="button"
          onClick={() => onTabChange('categorias')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'categorias'
              ? 'text-[#00E676] font-bold scale-105'
              : 'text-slate-400 hover:text-white font-medium'
          }`}
        >
          <LayoutGrid size={20} className={currentTab === 'categorias' ? 'stroke-[2.5] text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Categorias</span>
        </button>

        {/* Center Tab: Action Button (Adicionar +) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            type="button"
            onClick={() => openTxModal('create')}
            title="Adicionar Movimentação"
            className="w-13 h-13 rounded-full bg-[#00E676] hover:bg-[#00c853] text-black flex items-center justify-center shadow-lg shadow-[#00E676]/40 ring-4 ring-[#0B1F17] active:scale-90 hover:scale-105 transition-all cursor-pointer"
          >
            <Plus size={26} className="stroke-[3] text-black" />
          </button>
        </div>

        {/* Tab 4: Metas */}
        <button
          type="button"
          onClick={() => onTabChange('metas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'metas'
              ? 'text-[#00E676] font-bold scale-105'
              : 'text-slate-400 hover:text-white font-medium'
          }`}
        >
          <Target size={20} className={currentTab === 'metas' ? 'stroke-[2.5] text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Metas</span>
        </button>

        {/* Tab 5: Perfil */}
        <button
          type="button"
          onClick={() => onTabChange('perfil')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'perfil'
              ? 'text-[#00E676] font-bold scale-105'
              : 'text-slate-400 hover:text-white font-medium'
          }`}
        >
          <User size={20} className={currentTab === 'perfil' ? 'stroke-[2.5] text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]' : 'stroke-2'} />
          <span className="text-[10px] mt-1 tracking-tight">Perfil</span>
        </button>

      </div>
    </nav>
  );
};
