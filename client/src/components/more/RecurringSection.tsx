import React, { useState, useEffect } from 'react';
import { Plus, Repeat, Calendar, Play, Pause, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { RecurringRule } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DynamicIcon } from '../DynamicIcon';

export const RecurringSection: React.FC = () => {
  const { categories, accounts, refreshData } = useFinance();
  const { hideBalances } = useAuth();

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await api.recurring.list();
      setRules(res.recurring_rules);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
    const firstCat = categories.find((c) => c.type === 'expense');
    if (firstCat && !categoryId) {
      setCategoryId(firstCat.id);
    }
  }, [accounts, categories]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (!description.trim() || isNaN(amount) || amount <= 0 || !accountId || !categoryId) {
      alert('Preencha os campos obrigatórios corretamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.recurring.create({
        type,
        amount,
        description: description.trim(),
        category_id: categoryId,
        account_id: accountId,
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        notes: notes.trim() || null,
      });

      setShowModal(false);
      setDescription('');
      setAmountStr('');
      setNotes('');
      await fetchRules();
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar recorrência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.recurring.toggle(id);
      await fetchRules();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta regra de recorrência?')) {
      try {
        await api.recurring.delete(id);
        await fetchRules();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleProcessDue = async () => {
    try {
      const res = await api.recurring.process();
      alert(`Processamento concluído: ${res.processedCount} lançamentos gerados.`);
      await fetchRules();
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Contas Recorrentes e Assinaturas
          </h2>
          <p className="text-xs text-slate-400">
            Lançamentos automáticos previstos para suas contas fixas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleProcessDue}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Clock size={15} />
            <span>Verificar Pendências</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Nova Recorrência</span>
          </button>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
            <Repeat size={24} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Nenhuma conta recorrente cadastrada (ex: Aluguel, Internet, Salário).
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
          >
            Adicionar Conta Fixa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {rules.map((rule) => {
            const isExpense = rule.type === 'expense';
            const isActive = Boolean(rule.is_active);

            return (
              <div
                key={rule.id}
                className={`p-4 bg-white dark:bg-slate-900 border rounded-3xl shadow-xs space-y-3 transition-all ${
                  isActive
                    ? 'border-slate-200/80 dark:border-slate-800'
                    : 'border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                      style={{ backgroundColor: rule.category_color || (isExpense ? '#f43f5e' : '#10b981') }}
                    >
                      <DynamicIcon name={rule.category_icon || 'Repeat'} size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {rule.description}
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        {rule.frequency === 'weekly' ? 'Semanal' : rule.frequency === 'monthly' ? 'Mensal' : 'Anual'} • {rule.category_name}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs sm:text-sm font-extrabold ${
                      isExpense ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isExpense ? '- ' : '+ '}
                    {formatCurrency(rule.amount, hideBalances)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar size={13} className="text-emerald-600" />
                    <span>Próximo vencimento: <strong>{formatDate(rule.next_due_date)}</strong></span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(rule.id)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={isActive ? 'Pausar' : 'Ativar'}
                    >
                      {isActive ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Recurring Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Nova Movimentação Recorrente
            </h3>

            <form onSubmit={handleCreateRule} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold ${
                    type === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  Despesa Fixa
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold ${
                    type === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  Receita Fixa
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Internet, Salário..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 150,00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Frequência
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    {categories
                      .filter((c) => c.type === type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Conta
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Primeiro Vencimento
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                  {isSubmitting ? 'Salvando...' : 'Salvar Recorrência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
