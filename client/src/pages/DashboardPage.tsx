import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ArrowUpRight,
  Plus,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  PiggyBank,
  Wallet,
  Sparkles,
  Layers,
  CheckCircle2,
  HelpCircle,
  PlayCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatRelativeDate } from '../utils/formatters';
import { DynamicIcon } from '../components/DynamicIcon';
import { api } from '../services/api';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const { summary, accounts, openTxModal, refreshData } = useFinance();
  const { user, hideBalances } = useAuth();

  const totalBalance = summary?.totalBalance ?? 0;
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const netBalance = summary?.netBalance ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const categoryExpenses = summary?.categoryExpenses ?? [];
  const recentTransactions = summary?.recentTransactions ?? [];

  const isBrandNewUser = recentTransactions.length === 0 && totalIncome === 0 && totalExpense === 0;

  // Data for Category Donut Chart
  const chartData = categoryExpenses.map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
    icon: c.icon,
    percentage: c.percentage,
  }));

  const handleLoadDemo = async () => {
    try {
      await api.reports.loadDemo();
      await refreshData();
    } catch (err: any) {
      alert('Erro ao carregar dados de demonstração: ' + err.message);
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto px-4 pt-2">
      
      {/* 1. Main Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 shadow-xl shadow-emerald-900/20">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
                Saldo Total Disponível
              </span>
              <span className="text-[10px] bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded-full font-medium">
                Consolidado
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {formatCurrency(totalBalance, hideBalances)}
              </h1>
            </div>

            {/* Health / Savings indicator */}
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-100/90 font-medium">
              <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-white">
                <Sparkles size={12} />
              </div>
              {isBrandNewUser ? (
                <span>
                  👋 Olá, <strong>{user?.name.split(' ')[0] || 'Usuário'}</strong>! Comece registrando seu primeiro saldo ou lançamento.
                </span>
              ) : netBalance >= 0 ? (
                <span>
                  Economia de <strong className="text-white font-bold">{savingsRate}%</strong> da receita no período
                </span>
              ) : (
                <span className="text-rose-200">
                  Atenção: Gastos superaram as receitas no período selecionado
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openTxModal('create', null, 'expense')}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 active:scale-95"
            >
              <TrendingDown size={15} className="text-rose-300" />
              Despesa
            </button>
            <button
              onClick={() => openTxModal('create', null, 'income')}
              className="px-4 py-2.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <TrendingUp size={15} className="text-emerald-600" />
              Receita
            </button>
          </div>
        </div>

        {/* Background Blur Bubble */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/10 pointer-events-none blur-xl"></div>
      </div>

      {/* 2. FIRST-TIME ONBOARDING CARD (When user has zero transactions) */}
      {isBrandNewUser && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Seus Primeiros Passos na COINVY
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Veja como é rápido organizar suas finanças em menos de 1 minuto:
                </p>
              </div>
            </div>

            <button
              onClick={handleLoadDemo}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100/50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              title="Preenche o aplicativo com lançamentos de exemplo para você ver como fica"
            >
              <PlayCircle size={15} />
              <span>Ver Exemplo de Demonstração</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Step 1 */}
            <div
              onClick={() => openTxModal('create', null, 'income')}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Cadastrar Saldo Inicial
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Adicione uma receita com seu salário ou o saldo atual que você tem no banco.
              </p>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => openTxModal('create', null, 'expense')}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 font-extrabold text-[11px] flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                  Registrar uma Despesa
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lance seu primeiro café, almoço ou conta do dia usando o teclado rápido.
              </p>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => onNavigateTab('perfil')}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] flex items-center justify-center">
                  3
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Definir Metas e Limites
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Estabeleça tetos de gastos para o mês e crie sua reserva de emergência.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Income vs Expenses Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Receitas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Receitas
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalIncome, hideBalances)}
          </p>
          <div className="mt-1 flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span>+ entradas do período</span>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Despesas
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalExpense, hideBalances)}
          </p>
          <div className="mt-1 flex items-center text-[11px] text-rose-500 font-medium">
            <span>- saídas do período</span>
          </div>
        </div>
      </div>

      {/* 4. Accounts Horizontal Scroll List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Minhas Contas ({accounts.length})
          </h2>
          <button
            onClick={() => onNavigateTab('perfil')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            Gerenciar
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="min-w-[170px] sm:min-w-[190px] p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: acc.color }}
                >
                  <DynamicIcon name={acc.icon} size={16} />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {acc.name}
                  </p>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {acc.type === 'checking' ? 'Corrente' : acc.type === 'cash' ? 'Dinheiro' : acc.type === 'savings' ? 'Reserva' : 'Cartão'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">Saldo Atual</span>
                <p className={`text-sm font-bold ${acc.current_balance < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                  {formatCurrency(acc.current_balance, hideBalances)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Expenses by Category (Donut chart & breakdown) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Distribuição de Despesas
            </h2>
            <p className="text-xs text-slate-400">Onde você mais investiu seu dinheiro</p>
          </div>
          <button
            onClick={() => onNavigateTab('relatorios')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            Ver Análise
            <ChevronRight size={14} />
          </button>
        </div>

        {categoryExpenses.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Layers size={22} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nenhuma despesa registrada neste período
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
              Conforme você for registrando suas contas (alimentação, mercado, transporte, etc.), este gráfico montará automaticamente uma pizza colorida dos seus gastos.
            </p>
            <button
              onClick={() => openTxModal('create', null, 'expense')}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Adicionar Despesa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Donut Chart */}
            <div className="h-52 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Total']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(totalExpense, hideBalances)}
                </span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="space-y-2.5">
              {categoryExpenses.slice(0, 5).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <DynamicIcon name={cat.icon} size={13} />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {cat.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(cat.amount, hideBalances)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      ({cat.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Recent Transactions Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Últimas Movimentações
          </h2>
          {recentTransactions.length > 0 && (
            <button
              onClick={() => onNavigateTab('movimentacoes')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Ver todas
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-1">
              <Wallet size={22} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nenhuma movimentação registrada ainda
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Clique no botão verde (+) abaixo ou nos botões de Receita e Despesa para registrar seu primeiro valor.
            </p>
            <button
              onClick={() => openTxModal('create')}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
            >
              Registrar Primeira Movimentação
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  onClick={() => openTxModal('edit', tx)}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{
                        backgroundColor: isTransfer
                          ? '#6366f1'
                          : tx.category_color || (isIncome ? '#10b981' : '#f43f5e'),
                      }}
                    >
                      <DynamicIcon
                        name={isTransfer ? 'ArrowRightLeft' : tx.category_icon || 'Tag'}
                        size={18}
                      />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span>{formatRelativeDate(tx.date)}</span>
                        <span>•</span>
                        <span>
                          {isTransfer
                            ? `${tx.account_name} ➔ ${tx.destination_account_name}`
                            : `${tx.category_name || 'Geral'} (${tx.account_name})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-xs sm:text-sm font-bold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isExpense
                          ? 'text-rose-500'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {isIncome ? '+ ' : isExpense ? '- ' : ''}
                      {formatCurrency(tx.amount, hideBalances)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
