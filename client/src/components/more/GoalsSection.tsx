import React, { useState, useEffect } from 'react';
import {
  Plus,
  Target,
  CheckCircle2,
  Trophy,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Calendar,
  Pencil,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { Goal } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DynamicIcon } from '../DynamicIcon';

// Helper robusto para converter strings monetárias brasileiras (ex: "6.000,00", "6.000", "250,50", "1000") em números
export function parseBRLInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  let str = value.toString().trim().replace(/[R$\s]/g, '');
  if (!str) return 0;

  if (str.includes('.') && str.includes(',')) {
    // Formato padrão BR: 1.500,50 -> 1500.50
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    // Apenas vírgula: 1500,50 -> 1500.50
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    // Apenas ponto: verificar se é separador de milhar (ex: 6.000 ou 10.000)
    const parts = str.split('.');
    if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) {
      str = str.replace(/\./g, '');
    }
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

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
  const [color, setColor] = useState('#00E676');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Goal Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editName, setEditName] = useState('');
  const [editTargetStr, setEditTargetStr] = useState('');
  const [editCurrentStr, setEditCurrentStr] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editIcon, setEditIcon] = useState('Shield');
  const [editColor, setEditColor] = useState('#00E676');

  // Contribution / Withdrawal Modal
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
    const target = parseBRLInput(targetAmountStr);
    const initial = parseBRLInput(currentAmountStr);

    if (!name.trim() || target <= 0) {
      alert('Preencha o nome da meta e um valor alvo válido (ex: 6000 ou 6.000,00).');
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

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditName(goal.name);
    setEditTargetStr(goal.target_amount.toString().replace('.', ','));
    setEditCurrentStr(goal.current_amount.toString().replace('.', ','));
    setEditDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
    setEditIcon(goal.icon || 'Shield');
    setEditColor(goal.color || '#00E676');
    setShowEditModal(true);
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    const target = parseBRLInput(editTargetStr);
    const current = parseBRLInput(editCurrentStr);

    if (!editName.trim() || target <= 0) {
      alert('Informe um nome e um valor alvo válido maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.goals.update(editingGoal.id, {
        name: editName.trim(),
        target_amount: target,
        current_amount: current,
        deadline: editDeadline || null,
        icon: editIcon,
        color: editColor,
      });

      setShowEditModal(false);
      setEditingGoal(null);
      await fetchGoals();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar meta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amountVal = parseBRLInput(contribAmountStr);
    if (amountVal <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    const finalAmount = contribType === 'deposit' ? amountVal : -amountVal;

    setIsSubmitting(true);
    try {
      const res = await api.goals.contribute(selectedGoal.id, {
        amount: finalAmount,
        notes: contribType === 'deposit' ? 'Aporte na meta' : 'Resgate da meta',
      });

      if (res.goal.isCompleted && contribType === 'deposit') {
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
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Metas Financeiras
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento em tempo real de cada conquista
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGoalModal(true)}
          className="px-3 py-2 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="p-8 text-center bg-[#1A2E24] border border-[#2A4435] rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0B1F17] text-[#00E676] flex items-center justify-center mx-auto border border-[#2A4435]">
            <Trophy size={22} />
          </div>
          <p className="text-xs font-medium text-slate-300">
            Você ainda não cadastrou nenhuma meta financeira.
          </p>
          <button
            type="button"
            onClick={() => setShowGoalModal(true)}
            className="px-4 py-2 bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            + Cadastrar Primeira Meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {goals.map((goal) => {
            // Cálculo fiel em tempo real do progresso
            const target = Math.max(0.01, Number(goal.target_amount) || 0);
            const current = Math.max(0, Number(goal.current_amount) || 0);
            const rawPct = (current / target) * 100;
            const progress = Math.min(100, Math.max(0, Number(rawPct.toFixed(1))));
            const remaining = Math.max(0, Number((target - current).toFixed(2)));
            const isCompleted = current >= target;

            return (
              <div
                key={goal.id}
                className="p-4 sm:p-5 bg-[#1A2E24] border border-[#2A4435] rounded-3xl shadow-md space-y-3.5 relative overflow-hidden group hover:border-[#00E676]/40 transition-all"
              >
                {/* Header da Meta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-inner"
                      style={{ backgroundColor: goal.color || '#00E676' }}
                    >
                      <DynamicIcon name={goal.icon || 'Shield'} size={20} />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-white truncate">
                          {goal.name}
                        </h3>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[10px] font-bold shrink-0">
                            <CheckCircle2 size={11} />
                            Concluída!
                          </span>
                        )}
                      </div>
                      {goal.deadline && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} />
                          Prazo: {formatDate(goal.deadline)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1.5 text-slate-400 hover:text-[#00E676] rounded-lg hover:bg-[#0B1F17] transition-colors cursor-pointer"
                      title="Editar Meta"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-[#0B1F17] transition-colors cursor-pointer"
                      title="Excluir Meta"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Barra de Progressão e Valores Fielmente Atualizados */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-400">Acumulado</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-white">
                        {formatCurrency(current, hideBalances)}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">
                        / {formatCurrency(target, hideBalances)}
                      </span>
                    </div>
                  </div>

                  {/* Barra visual de progresso */}
                  <div className="w-full h-3 rounded-full bg-[#0B1F17] border border-[#2A4435] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#00E676] to-[#00C853] shadow-[0_0_8px_rgba(0,230,118,0.5)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[11px] font-medium text-slate-400">
                      {isCompleted ? (
                        <span className="text-[#00E676] font-bold">Meta atingida com sucesso! 🎉</span>
                      ) : (
                        `Faltam ${formatCurrency(remaining, hideBalances)}`
                      )}
                    </span>
                    <span className="font-extrabold text-[#00E676] text-xs">
                      {progress}%
                    </span>
                  </div>
                </div>

                {/* Ações de Guardar e Resgatar */}
                <div className="pt-2 border-t border-[#2A4435] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setContribType('deposit');
                        setContribAmountStr('');
                        setShowContribModal(true);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <ArrowDownLeft size={14} />
                      <span>Guardar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setContribType('withdraw');
                        setContribAmountStr('');
                        setShowContribModal(true);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-[#0B1F17] hover:bg-[#20362B] border border-[#2A4435] text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <ArrowUpRight size={14} />
                      <span>Resgatar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Meta */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#1A2E24] border border-[#2A4435] rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#2A4435]">
              <h3 className="font-bold text-sm text-white">Nova Meta Financeira</h3>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Viagem, Casa Própria, Economia..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 6.000,00"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Já guardado (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 500,00"
                    value={currentAmountStr}
                    onChange={(e) => setCurrentAmountStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Prazo Estimado (Opcional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                />
              </div>

              {/* Icon selection */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Ícone</label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['Shield', 'Plane', 'Home', 'Car', 'Trophy', 'PiggyBank', 'Sparkles', 'Gamepad2'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        icon === ic
                          ? 'border-[#00E676] bg-[#00E676]/20 text-[#00E676]'
                          : 'border-[#2A4435] bg-[#0B1F17] text-slate-400'
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
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-[#00E676] hover:bg-[#00c853] text-black rounded-xl cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Meta */}
      {showEditModal && editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#1A2E24] border border-[#2A4435] rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#2A4435]">
              <h3 className="font-bold text-sm text-white">Editar Meta Financeira</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateGoal} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Valor Alvo Total (R$)
                  </label>
                  <input
                    type="text"
                    value={editTargetStr}
                    onChange={(e) => setEditTargetStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Acumulado Atual (R$)
                  </label>
                  <input
                    type="text"
                    value={editCurrentStr}
                    onChange={(e) => setEditCurrentStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Prazo Estimado (Opcional)
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-xs font-medium text-white focus:border-[#00E676] outline-none"
                />
              </div>

              {/* Icon selection */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Ícone</label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['Shield', 'Plane', 'Home', 'Car', 'Trophy', 'PiggyBank', 'Sparkles', 'Gamepad2'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEditIcon(ic)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        editIcon === ic
                          ? 'border-[#00E676] bg-[#00E676]/20 text-[#00E676]'
                          : 'border-[#2A4435] bg-[#0B1F17] text-slate-400'
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
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-[#00E676] hover:bg-[#00c853] text-black rounded-xl cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution / Withdrawal Modal */}
      {showContribModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#1A2E24] border border-[#2A4435] rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#2A4435]">
              <h3 className="font-bold text-sm text-white">
                {contribType === 'deposit' ? 'Guardar Dinheiro na Meta' : 'Resgatar Valor da Meta'}
              </h3>
              <button
                type="button"
                onClick={() => setShowContribModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Meta: <strong className="text-white font-bold">{selectedGoal.name}</strong>
            </p>

            <form onSubmit={handleContribution} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Valor a {contribType === 'deposit' ? 'guardar' : 'resgatar'} (R$)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 500,00"
                  value={contribAmountStr}
                  onChange={(e) => setContribAmountStr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2A4435] bg-[#0B1F17] text-sm font-bold text-white focus:border-[#00E676] outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowContribModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors ${
                    contribType === 'deposit'
                      ? 'bg-[#00E676] hover:bg-[#00c853] text-black'
                      : 'bg-[#0B1F17] border border-[#2A4435] hover:bg-[#20362B] text-white'
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
