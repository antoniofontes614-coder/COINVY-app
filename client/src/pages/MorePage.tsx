import React, { useState } from 'react';
import {
  Target,
  Trophy,
  Wallet,
  Repeat,
  Tag,
  Settings,
  ChevronRight
} from 'lucide-react';
import { BudgetsSection } from '../components/more/BudgetsSection';
import { GoalsSection } from '../components/more/GoalsSection';
import { AccountsSection } from '../components/more/AccountsSection';
import { RecurringSection } from '../components/more/RecurringSection';
import { CategoriesSection } from '../components/more/CategoriesSection';
import { SettingsSection } from '../components/more/SettingsSection';

export const MorePage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'budgets' | 'goals' | 'accounts' | 'recurring' | 'categories' | 'settings'
  >('budgets');

  const navItems = [
    { id: 'budgets', label: 'Orçamentos', icon: Target },
    { id: 'goals', label: 'Metas', icon: Trophy },
    { id: 'accounts', label: 'Contas', icon: Wallet },
    { id: 'recurring', label: 'Recorrências', icon: Repeat },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ] as const;

  return (
    <div className="space-y-5 pb-28 max-w-5xl mx-auto px-4 pt-2">
      
      {/* Horizontal Sub-nav Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-tab View */}
      <div className="animate-in fade-in duration-200">
        {activeSubTab === 'budgets' && <BudgetsSection />}
        {activeSubTab === 'goals' && <GoalsSection />}
        {activeSubTab === 'accounts' && <AccountsSection />}
        {activeSubTab === 'recurring' && <RecurringSection />}
        {activeSubTab === 'categories' && <CategoriesSection />}
        {activeSubTab === 'settings' && <SettingsSection />}
      </div>

    </div>
  );
};
