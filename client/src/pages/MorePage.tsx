import React, { useState } from 'react';
import {
  User,
  Wallet,
  Tag,
  Target,
  Trophy,
  Repeat
} from 'lucide-react';
import { SettingsSection } from '../components/more/SettingsSection';
import { AccountsSection } from '../components/more/AccountsSection';
import { CategoriesSection } from '../components/more/CategoriesSection';
import { BudgetsSection } from '../components/more/BudgetsSection';
import { GoalsSection } from '../components/more/GoalsSection';
import { RecurringSection } from '../components/more/RecurringSection';

interface MorePageProps {
  initialSubTab?: 'settings' | 'accounts' | 'categories' | 'budgets' | 'goals' | 'recurring';
}

export const MorePage: React.FC<MorePageProps> = ({ initialSubTab = 'settings' }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'settings' | 'accounts' | 'categories' | 'budgets' | 'goals' | 'recurring'
  >(initialSubTab);

  const navItems = [
    { id: 'settings', label: 'Meu Perfil', icon: User },
    { id: 'accounts', label: 'Contas', icon: Wallet },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'budgets', label: 'Orçamentos', icon: Target },
    { id: 'goals', label: 'Metas', icon: Trophy },
    { id: 'recurring', label: 'Recorrências', icon: Repeat },
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
        {activeSubTab === 'settings' && <SettingsSection />}
        {activeSubTab === 'accounts' && <AccountsSection />}
        {activeSubTab === 'categories' && <CategoriesSection />}
        {activeSubTab === 'budgets' && <BudgetsSection />}
        {activeSubTab === 'goals' && <GoalsSection />}
        {activeSubTab === 'recurring' && <RecurringSection />}
      </div>

    </div>
  );
};
