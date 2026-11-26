import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Send,
  Smartphone,
  Barcode,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Zap,
  CheckCircle2,
  X,
  CreditCard,
  Plus
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { DynamicIcon } from '../components/DynamicIcon';
import { Transaction } from '../types';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const { summary, openTxModal, refreshData } = useFinance();
  const { user, hideBalances, toggleHideBalances } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Financial metrics from context
  const totalBalance = summary?.totalBalance ?? 3750.00;
  const totalExpense = summary?.totalExpense ?? 2450.00;
  const totalIncome = summary?.totalIncome ?? 5280.00;
  const recentTransactions = summary?.recentTransactions ?? [];
  const categoryExpenses = summary?.categoryExpenses ?? [];

  // Default detailed categories when user hasn't added custom ones yet
  const defaultCategoryExpenses = [
    { id: 'cat_moradia', name: 'Moradia', amount: 784.00, percentage: 32, color: '#f97316', icon: 'Home' },
    { id: 'cat_alimentacao', name: 'Alimentação', amount: 686.00, percentage: 28, color: '#3b82f6', icon: 'Utensils' },
    { id: 'cat_transporte', name: 'Transporte', amount: 441.00, percentage: 18, color: '#8b5cf6', icon: 'Car' },
    { id: 'cat_lazer', name: 'Lazer', amount: 294.00, percentage: 12, color: '#10b981', icon: 'Gamepad2' },
    { id: 'cat_outros', name: 'Outros', amount: 245.00, percentage: 10, color: '#64748b', icon: 'MoreHorizontal' },
  ];

  const displayCategories = categoryExpenses.length > 0 ? categoryExpenses : defaultCategoryExpenses;

  const chartData = displayCategories.map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color || '#00E676',
    percentage: c.percentage,
  }));

  // Default demonstration transactions to mirror approved reference screen when empty
  const defaultDemoTransactions = [
    {
      id: 'demo_1',
      description: 'Supermercado',
      time: 'Hoje • 14:32',
      amount: -189.90,
      iconType: 'cart',
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      id: 'demo_2',
      description: 'Conta de Luz',
      time: 'Ontem • 18:20',
      amount: -120.00,
      iconType: 'zap',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'demo_3',
      description: 'Recebimento PIX',
      time: 'Ontem • 16:45',
      amount: 500.00,
      iconType: 'pix',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
  ];

  const handleQuickAction = (action: 'pix' | 'bill' | 'transfer' | 'recharge') => {
    switch (action) {
      case 'pix':
        openTxModal('create', null, 'transfer');
        break;
      case 'bill':
        openTxModal('create', null, 'expense');
        break;
      case 'transfer':
        openTxModal('create', null, 'transfer');
        break;
      case 'recharge':
        openTxModal('create', null, 'expense');
        break;
    }
  };

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
          className="relative p-2 rounded-full bg-[#1A2E24] hover:bg-[#254234] border border-[#2A4435] text-slate-200 transition-all active:scale-95"
          title="Notificações"
        >
          <Bell size={19} className="text-white" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-[#0B1F17]" />
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
                className="flex items-center gap-1 text-xs font-semibold text-emerald-950/90 hover:text-black transition-colors"
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
                <span>+12% em relação ao mês passado</span>
              </div>
            </div>

            {/* 3D Wallet Illustration Graphic */}
            <div className="w-20 h-20 shrink-0 relative flex items-center justify-center -mr-1 -mt-1">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cash sticking out */}
                <rect x="22" y="16" width="48" height="26" rx="3" fill="#A7F3D0" transform="rotate(-8 22 16)" />
                <rect x="24" y="18" width="44" height="22" rx="2" fill="#34D399" transform="rotate(-8 24 18)" opacity="0.8" />
                <rect x="28" y="12" width="48" height="26" rx="3" fill="#6EE7B7" transform="rotate(4 28 12)" />
                <rect x="30" y="14" width="44" height="22" rx="2" fill="#10B981" transform="rotate(4 30 14)" opacity="0.9" />
                {/* Wallet Body */}
                <rect x="12" y="28" width="76" height="56" rx="14" fill="#047857" stroke="#34D399" strokeWidth="2.5" />
                {/* Wallet Flap */}
                <path d="M12 40 C12 32 88 32 88 40 L88 70 C88 78 78 84 70 84 L30 84 C22 84 12 78 12 70 Z" fill="#065F46" />
                {/* Wallet Clasp */}
                <rect x="62" y="48" width="26" height="20" rx="8" fill="#10B981" stroke="#A7F3D0" strokeWidth="1.5" />
                <circle cx="70" cy="58" r="3.5" fill="#FCD34D" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2.5 Resumo: Entradas e Saídas (Receitas e Despesas) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Entradas */}
          <div
            onClick={() => openTxModal('create', null, 'income')}
            className="p-3.5 rounded-2xl bg-[#1A2E24] border border-[#2A4435] hover:border-[#00E676]/50 transition-all cursor-pointer group shadow-sm flex items-center justify-between"
            title="Clique para adicionar ou ver receitas"
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
            title="Clique para adicionar ou ver despesas"
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

        {/* 3. Quick Action Buttons: Pix, Pagar conta, Transferir, Recarga */}
        <div className="grid grid-cols-4 gap-2.5 pt-1">
          {/* Pix */}
          <button
            type="button"
            onClick={() => handleQuickAction('pix')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1A2E24] hover:bg-[#223D30] border border-[#2A4435] text-white transition-all active:scale-95 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0B1F17] flex items-center justify-center text-[#00E676] group-hover:scale-110 transition-transform">
              {/* Geometric Pix Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="8" height="8" rx="1.5" transform="rotate(45 7 7)" />
                <rect x="13" y="13" width="8" height="8" rx="1.5" transform="rotate(45 17 17)" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold mt-2 text-slate-200">Pix</span>
          </button>

          {/* Pagar conta */}
          <button
            type="button"
            onClick={() => handleQuickAction('bill')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1A2E24] hover:bg-[#223D30] border border-[#2A4435] text-white transition-all active:scale-95 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0B1F17] flex items-center justify-center text-[#00E676] group-hover:scale-110 transition-transform">
              <Barcode size={20} />
            </div>
            <span className="text-[11px] font-semibold mt-2 text-slate-200 text-center leading-tight">Pagar conta</span>
          </button>

          {/* Transferir */}
          <button
            type="button"
            onClick={() => handleQuickAction('transfer')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1A2E24] hover:bg-[#223D30] border border-[#2A4435] text-white transition-all active:scale-95 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0B1F17] flex items-center justify-center text-[#00E676] group-hover:scale-110 transition-transform">
              <Send size={18} className="rotate-[-20deg]" />
            </div>
            <span className="text-[11px] font-semibold mt-2 text-slate-200">Transferir</span>
          </button>

          {/* Recarga */}
          <button
            type="button"
            onClick={() => handleQuickAction('recharge')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1A2E24] hover:bg-[#223D30] border border-[#2A4435] text-white transition-all active:scale-95 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0B1F17] flex items-center justify-center text-[#00E676] group-hover:scale-110 transition-transform">
              <Smartphone size={20} />
            </div>
            <span className="text-[11px] font-semibold mt-2 text-slate-200">Recarga</span>
          </button>
        </div>

        {/* 4. Card: Seus gastos deste mês (Gráfico Donut Detalhado por Categorias) */}
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
                <TrendingDown size={14} className="text-[#00E676]" />
                <span>↓ 8% vs mês anterior</span>
                <ChevronRight size={14} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('relatorios')}
              className="text-xs font-semibold text-slate-400 hover:text-[#00E676] flex items-center gap-0.5 transition-colors"
            >
              <span>Ver detalhes</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Gráfico Donut com Segmentos Coloridos por Categoria */}
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

            {/* Lista Detalhada de Categorias com cores e percentuais */}
            <div className="flex-1 w-full space-y-2">
              {displayCategories.slice(0, 4).map((cat) => (
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
        </div>

        {/* 5. Seção: Últimas movimentações */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Últimas movimentações
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('movimentacoes')}
              className="text-xs font-semibold text-slate-400 hover:text-[#00E676] flex items-center gap-0.5 transition-colors"
            >
              <span>Ver todas</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* List of movements */}
          <div className="space-y-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 4).map((tx) => {
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
              /* Demonstration rows exactly mirroring reference image when no records exist */
              defaultDemoTransactions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openTxModal('create')}
                  className="p-3.5 rounded-2xl bg-[#1A2E24] border border-[#2A4435] flex items-center justify-between hover:border-[#00E676]/40 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${item.color}`}>
                      {item.iconType === 'cart' && <ShoppingCart size={18} />}
                      {item.iconType === 'zap' && <Zap size={18} />}
                      {item.iconType === 'pix' && <TrendingUp size={18} />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {item.description}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {item.time}
                      </p>
                    </div>
                  </div>

                  <div className={`text-xs font-extrabold ${
                    item.amount > 0 ? 'text-[#00E676]' : 'text-rose-400'
                  }`}>
                    {item.amount > 0 ? '+ ' : '- '}
                    {formatCurrency(Math.abs(item.amount), hideBalances)}
                  </div>
                </div>
              ))
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
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-[#0B1F17] border border-[#2A4435] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#00E676]">Conta de Luz</span>
                  <span className="text-[10px] text-rose-400 font-semibold">Vence hoje</span>
                </div>
                <p className="text-[11px] text-slate-300">Valor de R$ 120,00 agendado para pagamento.</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#0B1F17] border border-[#2A4435] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Meta: Viagem dos sonhos</span>
                  <span className="text-[10px] text-[#00E676] font-semibold">66% atingida</span>
                </div>
                <p className="text-[11px] text-slate-300">Você já acumulou R$ 1.800,00 da sua meta!</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#0B1F17] border border-[#2A4435] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Insights do Mês</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Economia</span>
                </div>
                <p className="text-[11px] text-slate-300">Parabéns! Seus gastos caíram 8% em relação ao mês anterior.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              className="w-full py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black font-bold text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
