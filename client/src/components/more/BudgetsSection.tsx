import React, { useState, useEffect } from 'react';
import { Plus, Target, AlertTriangle, CheckCircle, Trash2, Edit3 } from 'lucide-react';
import { api } from '../../services/api';
import { Budget } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { DynamicIcon } from '../DynamicIcon';

export const BudgetsSection: React.FC = () => {
  const { categories, refreshData } = useFinance();
  const { hideBalances } = useAuth();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isLoading, setIsLoading] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('global');
  const [limitStr, setLimitStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const res = await api.budgets.list(selectedMonth);
      setBudgets(res.budgets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(limitStr.replace(',', '.'));
    if (isNaN(limit) || limit <= 0) {
      alert('Informe um limite válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.budgets.upsert({
        category_id: categoryId === 'global' ? null : categoryId,
        monthly_limit: limit,
        month: selectedMonth,
      });
      setShowModal(false);
      setLimitStr('');
      await fetchBudgets();
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar orçamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm('Deseja remover este orçamento?')) {
      try {
        await api.budgets.delete(id);
        await fetchBudgets();
        await refreshData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Find global budget
  const globalBudget = budgets.find((b) => !b.category_id);
  const categoryBudgets = budgets.filter((b) => Boolean(b.category_id));

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Orçamentos e Limites de Gastos
          </h2>
          <p className="text-xs text-slate-400">
            Defina limites para não gastar mais do que o planejado
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={() => {
              setCategoryId('global');
              setLimitStr('');
              setShowModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Definir Limite</span>
          </button>
        </div>
      </div>

      {/* Global Budget Banner */}
      {globalBudget && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Orçamento Geral Mensal
                </h3>
                <span className="text-xs text-slate-400">
                  Limite global para todas as despesas do mês
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDeleteBudget(globalBudget.id)}
                className="text-slate-400 hover:text-rose-500 p-1"
                title="Excluir"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  globalBudget.isExceeded
                    ? 'bg-rose-500'
                    : globalBudget.isNearLimit
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, globalBudget.percentage)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-500">
                Gasto: <strong>{formatCurrency(globalBudget.spent, hideBalances)}</strong>
              </span>
              <span className="text-slate-500">
                Limite: <strong>{formatCurrency(globalBudget.monthly_limit, hideBalances)}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span
                className={`font-semibold ${
                  globalBudget.isExceeded
                    ? 'text-rose-500 flex items-center gap-1'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {globalBudget.isExceeded ? (
                  <>
                    <AlertTriangle size={13} />
                    Ultrapassado em {formatCurrency(globalBudget.spent - globalBudget.monthly_limit, hideBalances)}
                  </>
                ) : (
                  `Restante disponível: ${formatCurrency(globalBudget.remaining, hideBalances)}`
                )}
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {globalBudget.percentage}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Category Budgets Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Orçamentos por Categoria
        </h3>

        {categoryBudgets.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <p className="text-xs text-slate-400">
              Nenhum limite específico por categoria definido para este mês.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {categoryBudgets.map((b) => (
              <div
                key={b.id}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: b.category_color || '#059669' }}
                    >
                      <DynamicIcon name={b.category_icon || 'Tag'} size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {b.category_name}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {formatCurrency(b.spent, hideBalances)} de {formatCurrency(b.monthly_limit, hideBalances)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteBudget(b.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        b.isExceeded
                          ? 'bg-rose-500'
                          : b.isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-semibold ${
                        b.isExceeded ? 'text-rose-500' : 'text-slate-500'
                      }`}
                    >
                      {b.isExceeded
                        ? `Estourado (+${formatCurrency(b.spent - b.monthly_limit, hideBalances)})`
                        : `Resta: ${formatCurrency(b.remaining, hideBalances)}`}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {b.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upsert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Definir Orçamento Mensal
            </h3>
            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Categoria ou Geral
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="global">🎯 Orçamento Geral (Todas as categorias)</option>
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Limite Mensal (R$)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 800,00"
                  value={limitStr}
                  onChange={(e) => setLimitStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
