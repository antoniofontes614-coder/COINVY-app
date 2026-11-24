import React, { useState, useEffect } from 'react';
import { Plus, Target, CheckCircle2, Trophy, Trash2, ArrowUpRight, ArrowDownLeft, Sparkles, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { Goal } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DynamicIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from '../DynamicIcon';

export const GoalsSection: React.FC = () => {
  const { hideBalances } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Goal Modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [currentAmountStr, setCurrentAmountStr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('Shield');
  const [color, setColor] = useState('#059669');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contribution Modal
  const [showContribModal, setShowContribModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contribAmountStr, setContribAmountStr] = useState('');
  const [contribType, setContribType] = useState<'deposit' | 'withdraw'>('deposit');

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const res = await api.goals.list();
      setGoals(res.goals);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmountStr.replace(',', '.'));
    const initial = parseFloat(currentAmountStr.replace(',', '.')) || 0;

    if (!name.trim() || isNaN(target) || target <= 0) {
      alert('Preencha o nome e um valor alvo válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.goals.create({
        name: name.trim(),
        target_amount: target,
        current_amount: initial,
        deadline: deadline || null,
        icon,
        color,
      });

      setShowGoalModal(false);
      setName('');
      setTargetAmountStr('');
      setCurrentAmountStr('');
      setDeadline('');
      await fetchGoals();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar meta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amountVal = parseFloat(contribAmountStr.replace(',', '.'));
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    const finalAmount = contribType === 'deposit' ? amountVal : -amountVal;

    setIsSubmitting(true);
    try {
      const res = await api.goals.contribute(selectedGoal.id, {
        amount: finalAmount,
        notes: contribType === 'deposit' ? 'Aporte na meta' : 'Resgate da meta',
      });

      if (res.goal.isCompleted) {
        // Fire celebration confetti!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      setShowContribModal(false);
      setContribAmountStr('');
      setSelectedGoal(null);
      await fetchGoals();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar movimentação na meta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (window.confirm('Excluir esta meta financeira?')) {
      try {
        await api.goals.delete(id);
        await fetchGoals();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Metas e Sonhos Financeiros
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe o progresso das suas conquistas
          </p>
        </div>

        <button
          onClick={() => setShowGoalModal(true)}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
            <Trophy size={24} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Você ainda não cadastrou nenhuma meta financeira.
          </p>
          <button
            onClick={() => setShowGoalModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
          >
            Cadastrar Primeira Meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-4 relative overflow-hidden"
            >
              {goal.isCompleted && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 size={13} />
                  Concluída!
                </div>
              )}

              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-900/10 shrink-0"
                  style={{ backgroundColor: goal.color }}
                >
                  <DynamicIcon name={goal.icon} size={20} />
                </div>
                <div className="truncate pr-16">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {goal.name}
                  </h3>
                  {goal.deadline && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={12} />
                      Prazo: {formatDate(goal.deadline)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress and values */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Acumulado</span>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(goal.current_amount, hideBalances)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      / {formatCurrency(goal.target_amount, hideBalances)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-slate-500">
                    Faltam {formatCurrency(goal.remaining, hideBalances)}
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {goal.progress}%
                  </span>
                </div>
              </div>

              {/* Actions: Aporte / Resgate */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedGoal(goal);
                      setContribType('deposit');
                      setContribAmountStr('');
                      setShowContribModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <ArrowDownLeft size={14} />
                    Guardar
                  </button>

                  <button
                    onClick={() => {
                      setSelectedGoal(goal);
                      setContribType('withdraw');
                      setContribAmountStr('');
                      setShowContribModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <ArrowUpRight size={14} />
                    Resgatar
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Excluir Meta"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Nova Meta Financeira
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reserva de Emergência, Viagem..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 10000,00"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Já guardado (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 500,00"
                    value={currentAmountStr}
                    onChange={(e) => setCurrentAmountStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Prazo Estimado (Opcional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Icon selection */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Ícone</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {['Shield', 'Plane', 'Laptop', 'Car', 'Home', 'Trophy', 'PiggyBank', 'Sparkles'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-xl border transition-all ${
                        icon === ic
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <DynamicIcon name={ic} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Criando...' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution / Withdrawal Modal */}
      {showContribModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {contribType === 'deposit' ? 'Guardar Dinheiro na Meta' : 'Resgatar Valor da Meta'}
            </h3>
            <p className="text-xs text-slate-400">
              Meta: <strong>{selectedGoal.name}</strong>
            </p>

            <form onSubmit={handleContribution} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 250,00"
                  value={contribAmountStr}
                  onChange={(e) => setContribAmountStr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowContribModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs ${
                    contribType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSubmitting ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
