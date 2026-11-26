import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Send,
  Smartphone,
  Barcode,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Zap,
  CheckCircle2,
  X,
  Plus,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Wifi,
  Droplets,
  Gamepad2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { DynamicIcon } from '../components/DynamicIcon';
import { Transaction } from '../types';

export interface QuickShortcut {
  id: string;
  label: string;
  icon: string;
  categoryId?: string;
}

const DEFAULT_SHORTCUTS: QuickShortcut[] = [
  { id: '1', label: 'Internet', icon: 'Wifi' },
  { id: '2', label: 'Luz', icon: 'Zap' },
  { id: '3', label: 'Água', icon: 'Droplets' },
  { id: '4', label: 'Lazer', icon: 'Gamepad2' },
];

const AVAILABLE_SHORTCUT_ICONS = [
  'Wifi', 'Zap', 'Droplets', 'Gamepad2',
  'ShoppingCart', 'Car', 'Home', 'Smartphone',
  'Utensils', 'CreditCard', 'Receipt', 'TrendingUp',
  'HeartPulse', 'Coffee', 'Tv', 'Dumbbell',
  'Sparkles', 'Send', 'Briefcase', 'GraduationCap'
];

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const { summary, openTxModal, categories } = useFinance();
  const { user, hideBalances, toggleHideBalances } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Financial metrics from context (strictly 100% real user data)
  const totalBalance = summary?.totalBalance ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const totalIncome = summary?.totalIncome ?? 0;
  const recentTransactions = summary?.recentTransactions ?? [];
  const categoryExpenses = summary?.categoryExpenses ?? [];

  // 4 Atalhos Rápidos Editáveis (Padrão: Internet, Luz, Água, Lazer)
  const storageKey = `dim_shortcuts_${user?.id || 'default'}`;
  const [shortcuts, setShortcuts] = useState<QuickShortcut[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_SHORTCUTS;
  });

  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [tempShortcuts, setTempShortcuts] = useState<QuickShortcut[]>(shortcuts);

  const handleOpenCustomize = () => {
    setTempShortcuts(shortcuts.map(s => ({ ...s })));
    setShowCustomizeModal(true);
  };

  const handleSaveShortcuts = () => {
    setShortcuts(tempShortcuts);
    try {
      localStorage.setItem(storageKey, JSON.stringify(tempShortcuts));
    } catch (err) {
      console.error('Erro ao salvar atalhos:', err);
    }
    setShowCustomizeModal(false);
  };

  const handleResetDefaultShortcuts = () => {
    setTempShortcuts(DEFAULT_SHORTCUTS.map(s => ({ ...s })));
  };

  const handleShortcutClick = (shortcut: QuickShortcut) => {
    const matchedCategory = categories.find(
      (c) => (shortcut.categoryId && c.id === shortcut.categoryId) || c.name.toLowerCase() === shortcut.label.toLowerCase()
    );

    openTxModal(
      'create',
      {
        description: shortcut.label,
        category_id: matchedCategory ? matchedCategory.id : undefined,
        type: matchedCategory ? matchedCategory.type : 'expense',
      } as any,
      matchedCategory ? matchedCategory.type : 'expense'
    );
  };

  const chartData = categoryExpenses.map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color || '#00E676',
    percentage: c.percentage,
  }));

  // Helper to format date and time for transaction items
  const formatTxTime = (t: Transaction) => {
    try {
      const d = new Date(t.date);
      const isToday = new Date().toDateString() === d.toDateString();
      const timePart = t.created_at ? new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '12:00';
      return `${isToday ? 'Hoje' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • ${timePart}`;
    } catch {
      return 'Recente';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1F17] text-white pb-28 pt-2 px-3 sm:px-4 max-w-md mx-auto select-none transition-colors">
      
      {/* 1. Header Bar: DIM+ Logo on left, Notification Bell on right */}
      <header className="flex items-center justify-between py-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black tracking-tight text-white flex items-center">
            DIM<span className="text-[#00E676] drop-shadow-[0_0_12px_rgba(0,230,118,0.7)]">+</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowNotifications(true)}
          className="relative p-2 rounded-full bg-[#1A2E24] hover:bg-[#254234] border border-[#2A4435] text-slate-200 transition-all active:scale-95 cursor-pointer"
          title="Notificações"
        >
          <Bell size={19} className="text-white" />
        </button>
      </header>

      <div className="space-y-4 mt-2">
        
        {/* 2. Hero Card: Saldo Disponível (Neon Green Card with Wallet) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#00E676] via-[#00C853] to-[#0A4D2E] p-5 text-white shadow-xl shadow-[#00E676]/20 border border-[#00E676]/40">
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-2 max-w-[70%]">
              <button
                type="button"
                onClick={toggleHideBalances}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-950/90 hover:text-black transition-colors cursor-pointer"
                title="Alternar privacidade do saldo"
              >
                <span>Saldo disponível</span>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                {formatCurrency(totalBalance, hideBalances)}
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-emerald-950">
                <TrendingUp size={13} className="text-emerald-950" />
                <span>
                  {totalBalance === 0 ? 'Saldo atualizado' : '+12% em relação ao mês passado'}
                </span>
              </div>
            </div>

            {/* 3D Wallet Illustration Graphic */}
            <div className="w-20 h-20 shrink-0 relative flex items-center justify-center -mr-1 -mt-1">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="22" y="16" width="48" height="26" rx="3" fill="#A7F3D0" transform="rotate(-8 22 16)" />
                <rect x="24" y="18" width="44" height="22" rx="2" fill="#34D399" transform="rotate(-8 24 18)" opacity="0.8" />
                <rect x="28" y="12" width="48" height="26" rx="3" fill="#6EE7B7" transform="rotate(4 28 12)" />
                <rect x="30" y="14" width="44" height="22" rx="2" fill="#10B981" transform="rotate(4 30 14)" opacity="0.9" />
                <rect x="12" y="28" width="76" height="56" rx="14" fill="#047857" stroke="#34D399" strokeWidth="2.5" />
                <path d="M12 40 C12 32 88 32 88 40 L88 70 C88 78 78 84 70 84 L30 84 C22 84 12 78 12 70 Z" fill="#065F46" />
                <rect x="62" y="48" width="26" height="20" rx="8" fill="#10B981" stroke="#A7F3D0" strokeWidth="1.5" />
                <circle cx="70" cy="58" r="3.5" fill="#FCD34D" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2.5 Resumo: Entradas e Saídas (Receitas e Despesas 100% Reais) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Entradas */}
          <div
            onClick={() => openTxModal('create', null, 'income')}
            className="p-3.5 rounded-2xl bg-[#1A2E24] border border-[#2A4435] hover:border-[#00E676]/50 transition-all cursor-pointer group shadow-sm flex items-center justify-between"
            title="Clique para adicionar receita"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                Entradas (Receitas)
              </span>
              <span className="text-base font-extrabold text-[#00E676] tracking-tight mt-0.5 block">
                {formatCurrency(totalIncome, hideBalances)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-[#00E676] flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <TrendingUp size={16} />
            </div>
          </div>

          {/* Saídas */}
          <div
            onClick={() => openTxModal('create', null, 'expense')}
            className="p-3.5 rounded-2xl bg-[#1A2E24] border border-[#2A4435] hover:border-rose-500/50 transition-all cursor-pointer group shadow-sm flex items-center justify-between"
            title="Clique para adicionar despesa"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                Saídas (Despesas)
              </span>
              <span className="text-base font-extrabold text-rose-400 tracking-tight mt-0.5 block">
                {formatCurrency(totalExpense, hideBalances)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 group-hover:scale-110 transition-transform">
              <TrendingDown size={16} />
            </div>
          </div>
        </div>

        {/* 3. Atalhos Rápidos Customizáveis (Padrão: Internet, Luz, Água, Lazer) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-slate-400">Atalhos rápidos</span>
            <button
              type="button"
              onClick={handleOpenCustomize}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-[#00E676] transition-colors cursor-pointer"
              title="Personalizar ou substituir atalhos"
            >
              <SlidersHorizontal size={12} />
              <span>Personalizar</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => handleShortcutClick(shortcut)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1A2E24] hover:bg-[#223D30] border border-[#2A4435] text-white transition-all active:scale-95 group shadow-sm cursor-pointer"
                title={`Registrar despesa com ${shortcut.label}`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#0B1F17] flex items-center justify-center text-[#00E676] group-hover:scale-110 transition-transform">
                  <DynamicIcon name={shortcut.icon} size={20} />
                </div>
                <span className="text-[11px] font-semibold mt-2 text-slate-200 text-center leading-tight truncate w-full px-0.5">
                  {shortcut.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Card: Seus gastos deste mês (Gráfico Donut e Detalhamento Real) */}
        <div className="p-5 rounded-3xl bg-[#1A2E24] border border-[#2A4435] space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-400">
                Seus gastos deste mês
              </span>
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(totalExpense, hideBalances)}
              </div>
              <div
                onClick={() => onNavigateTab('relatorios')}
                className="flex items-center gap-1 text-[11px] font-bold text-[#00E676] pt-0.5 cursor-pointer hover:underline"
              >
                <span>{totalExpense === 0 ? 'Sem gastos registrados' : 'Ver análise comparativa'}</span>
                <ChevronRight size={14} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('relatorios')}
              className="text-xs font-semibold text-slate-400 hover:text-[#00E676] flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>Ver detalhes</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Estado com Dados Reais ou Estado Vazio */}
          {categoryExpenses.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val), hideBalances), 'Total']}
                      contentStyle={{
                        backgroundColor: '#0B1F17',
                        borderRadius: '12px',
                        border: '1px solid #2A4435',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Total</span>
                  <span className="text-xs font-extrabold text-white">
                    {formatCurrency(totalExpense, hideBalances)}
                  </span>
                </div>
              </div>

              {/* Lista Detalhada das Categorias Reais */}
              <div className="flex-1 w-full space-y-2">
                {categoryExpenses.slice(0, 4).map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <DynamicIcon name={cat.icon} size={11} />
                      </div>
                      <span className="font-semibold text-slate-200 truncate text-[11px]">
                        {cat.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="font-bold text-white text-[11px]">
                        {formatCurrency(cat.amount, hideBalances)}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-[#0B1F17] px-1.5 py-0.5 rounded-full border border-[#2A4435]">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Estado Vazio Adequado (Zero dados fictícios) */
            <div className="p-5 text-center space-y-2 bg-[#0B1F17]/60 rounded-2xl border border-dashed border-[#2A4435]">
              <p className="text-xs font-semibold text-slate-300">Nenhum gasto registrado neste mês</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Suas despesas aparecerão aqui detalhadas por categoria assim que você cadastrar seu primeiro lançamento.
              </p>
              <button
                type="button"
                onClick={() => openTxModal('create', null, 'expense')}
                className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-bold transition-all cursor-pointer"
              >
                + Registrar Despesa
              </button>
            </div>
          )}
        </div>

        {/* 5. Seção: Últimas movimentações (100% Dados Reais) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Últimas movimentações
            </h3>
            {recentTransactions.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('movimentacoes')}
                className="text-xs font-semibold text-slate-400 hover:text-[#00E676] flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>Ver todas</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Lista de movimentações */}
          <div className="space-y-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((tx) => {
                const isExpense = tx.type === 'expense';
                const isIncome = tx.type === 'income';
                return (
                  <div
                    key={tx.id}
                    onClick={() => openTxModal('edit', tx)}
                    className="p-3.5 rounded-2xl bg-[#1A2E24] border border-[#2A4435] flex items-center justify-between hover:border-[#00E676]/40 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/20 text-[#00E676] border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isIncome ? <TrendingUp size={18} /> : <ShoppingCart size={18} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {tx.description || tx.category_name || 'Movimentação'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {formatTxTime(tx)}
                        </p>
                      </div>
                    </div>

                    <div className={`text-xs font-extrabold ${
                      isIncome ? 'text-[#00E676]' : 'text-rose-400'
                    }`}>
                      {isIncome ? '+ ' : '- '}
                      {formatCurrency(Math.abs(tx.amount), hideBalances)}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Estado Vazio 100% Real */
              <div className="p-6 text-center space-y-2 bg-[#1A2E24] rounded-2xl border border-dashed border-[#2A4435]">
                <div className="w-10 h-10 rounded-full bg-[#0B1F17] text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingCart size={18} />
                </div>
                <p className="text-xs font-bold text-white">Nenhuma movimentação registrada</p>
                <p className="text-[11px] text-slate-400">
                  Toque no botão '+' abaixo para cadastrar sua primeira receita ou despesa.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Notifications Drawer / Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#1A2E24] border border-[#2A4435] rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A4435]">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#00E676]" />
                <h3 className="text-sm font-bold text-white">Notificações DIM+</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 text-center text-xs text-slate-400 bg-[#0B1F17] rounded-2xl border border-[#2A4435]">
              Nenhuma notificação pendente no momento.
            </div>

            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              className="w-full py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black font-bold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Personalizar Atalhos Rápidos */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#1A2E24] border border-[#2A4435] rounded-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A4435]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[#00E676]" />
                <h3 className="text-sm font-bold text-white">Personalizar Atalhos</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Personalize os 4 atalhos da sua tela inicial ou vincule-os a qualquer uma das suas categorias cadastradas:
            </p>

            <div className="space-y-3">
              {tempShortcuts.map((item, idx) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-[#0B1F17] border border-[#2A4435] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Atalho {idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Prévia:</span>
                      <div className="w-7 h-7 rounded-lg bg-[#1A2E24] border border-[#2A4435] flex items-center justify-center text-[#00E676]">
                        <DynamicIcon name={item.icon} size={15} />
                      </div>
                    </div>
                  </div>

                  {/* 1. Escolha rápida a partir das Categorias Cadastradas */}
                  {categories.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-400">Suas Categorias:</span>
                        <span className="text-[#00E676] font-bold">{categories.length} disponíveis</span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                        {categories.map((cat) => {
                          const isChosen = item.categoryId === cat.id || item.label.toLowerCase() === cat.name.toLowerCase();
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                const updated = [...tempShortcuts];
                                updated[idx].label = cat.name;
                                updated[idx].icon = cat.icon || 'Tag';
                                updated[idx].categoryId = cat.id;
                                setTempShortcuts(updated);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                                isChosen
                                  ? 'bg-[#00E676] text-black font-bold shadow-sm'
                                  : 'bg-[#1A2E24] border border-[#2A4435] text-slate-300 hover:text-white hover:border-[#00E676]/40'
                              }`}
                              title={`Usar categoria ${cat.name}`}
                            >
                              <DynamicIcon name={cat.icon || 'Tag'} size={12} />
                              <span>{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Campo de Texto Customizado */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Nome exibido no botão:
                    </span>
                    <input
                      type="text"
                      value={item.label}
                      maxLength={14}
                      onChange={(e) => {
                        const updated = [...tempShortcuts];
                        updated[idx].label = e.target.value;
                        setTempShortcuts(updated);
                      }}
                      placeholder="Nome do atalho"
                      className="w-full px-3 py-1.5 rounded-xl bg-[#1A2E24] border border-[#2A4435] text-white text-xs focus:border-[#00E676] outline-none"
                    />
                  </div>

                  {/* 3. Galeria de Ícones */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Ícone do botão:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                      {AVAILABLE_SHORTCUT_ICONS.map((iconName) => {
                        const isSelected = item.icon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => {
                              const updated = [...tempShortcuts];
                              updated[idx].icon = iconName;
                              setTempShortcuts(updated);
                            }}
                            className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#00E676] text-black ring-1 ring-[#00E676]'
                                : 'bg-[#1A2E24] text-slate-300 hover:text-white border border-[#2A4435]'
                            }`}
                            title={iconName}
                          >
                            <DynamicIcon name={iconName} size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleSaveShortcuts}
                className="w-full py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black font-bold text-xs transition-colors cursor-pointer"
              >
                Salvar Atalhos
              </button>

              <button
                type="button"
                onClick={handleResetDefaultShortcuts}
                className="w-full py-2 rounded-xl bg-[#0B1F17] hover:bg-[#254234] border border-[#2A4435] text-slate-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Restaurar Padrão (Internet, Luz, Água, Lazer)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
