import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  PlayCircle
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { DynamicIcon } from '../components/DynamicIcon';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const { summary, refreshData, openTxModal } = useFinance();
  const { hideBalances } = useAuth();

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const netBalance = summary?.netBalance ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const categoryExpenses = summary?.categoryExpenses ?? [];
  const monthlyTimeline = summary?.monthlyTimeline ?? [];

  const hasNoData = totalIncome === 0 && totalExpense === 0 && monthlyTimeline.every(m => m.income === 0 && m.expense === 0);

  // Donut chart data
  const pieData = categoryExpenses.map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
    percentage: c.percentage,
    count: c.count,
    icon: c.icon,
  }));

  const handleLoadDemo = async () => {
    try {
      await api.reports.loadDemo();
      await refreshData();
    } catch (err: any) {
      alert('Erro ao carregar dados demonstrativos: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto px-4 pt-2">
      
      {/* Empty State Banner if user has 0 data */}
      {hasNoData && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Relatórios Financeiros Prontos para Gerar Insights
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assim que você registrar receitas e despesas, os gráficos serão alimentados em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openTxModal('create')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Adicionar Lançamento
            </button>
            <button
              onClick={handleLoadDemo}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100/50 transition-colors flex items-center gap-1"
            >
              <PlayCircle size={14} />
              <span>Ver Demonstração</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Balanço Líquido */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Balanço Líquido (Período)
          </span>
          <p
            className={`text-xl sm:text-2xl font-extrabold ${
              netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}
          >
            {formatCurrency(netBalance, hideBalances)}
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <span>Taxa de economia:</span>
            <strong className="text-emerald-600 font-bold">{savingsRate}%</strong>
          </div>
        </div>

        {/* Total Receitas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Total de Entradas
          </span>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatCurrency(totalIncome, hideBalances)}
          </p>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp size={13} />
            <span>Receitas consolidadas</span>
          </div>
        </div>

        {/* Total Despesas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Total de Saídas
          </span>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatCurrency(totalExpense, hideBalances)}
          </p>
          <div className="mt-2 text-[11px] text-rose-500 font-medium flex items-center gap-1">
            <TrendingDown size={13} />
            <span>Despesas consolidadas</span>
          </div>
        </div>
      </div>

      {/* 2. Monthly Timeline: Receitas vs Despesas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Comparativo Mensal (Últimos 6 Meses)
            </h2>
            <p className="text-xs text-slate-400">Evolução de receitas versus despesas</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span className="text-slate-600 dark:text-slate-400">Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500"></span>
              <span className="text-slate-600 dark:text-slate-400">Despesas</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val)), '']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="income" name="Receita" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Despesa" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Expense Categories Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Detalhamento de Despesas por Categoria
          </h2>
          <p className="text-xs text-slate-400">
            Distribuição percentual e valor acumulado no período
          </p>
        </div>

        {categoryExpenses.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma despesa para exibir na pizza
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Assim que houver gastos no período, este gráfico será gerado automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Donut Chart */}
            <div className="lg:col-span-5 h-60 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Valor']}
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
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Gasto</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(totalExpense, hideBalances)}
                </span>
              </div>
            </div>

            {/* Category Table */}
            <div className="lg:col-span-7 space-y-2 max-h-80 overflow-y-auto pr-1">
              {categoryExpenses.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <DynamicIcon name={cat.icon} size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {cat.name}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {cat.count} {cat.count === 1 ? 'lançamento' : 'lançamentos'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatCurrency(cat.amount, hideBalances)}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {cat.percentage}% do total
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* 4. Net Monthly Evolution Line Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="mb-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Evolução da Economia Líquida
          </h2>
          <p className="text-xs text-slate-400">Saldo que sobrou em cada mês</p>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val)), 'Saldo Líquido']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#059669"
                strokeWidth={3}
                dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
