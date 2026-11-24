import React, { useState } from 'react';
import { Plus, ArrowRightLeft, Edit2, Trash2, Wallet, Building2, CreditCard, PiggyBank, Check } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Account } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { DynamicIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from '../DynamicIcon';

export const AccountsSection: React.FC = () => {
  const { accounts, refreshData, openTxModal } = useFinance();
  const { hideBalances } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [color, setColor] = useState('#059669');
  const [icon, setIcon] = useState('Building2');
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setType('checking');
    setColor('#059669');
    setIcon('Building2');
    setInitialBalanceStr('0');
    setShowModal(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setColor(acc.color);
    setIcon(acc.icon);
    setInitialBalanceStr(String(acc.initial_balance));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome da conta.');
      return;
    }

    const initBal = parseFloat(initialBalanceStr.replace(',', '.')) || 0;

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        await api.accounts.update(editingAccount.id, {
          name: name.trim(),
          type,
          color,
          icon,
          initial_balance: initBal,
        });
      } else {
        await api.accounts.create({
          name: name.trim(),
          type,
          color,
          icon,
          initial_balance: initBal,
        });
      }

      await refreshData();
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (acc: Account) => {
    if (window.confirm(`Deseja excluir a conta "${acc.name}"? Lançamentos associados a esta conta serão removidos.`)) {
      try {
        await api.accounts.delete(acc.id);
        await refreshData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const accountTypeNames: Record<Account['type'], string> = {
    checking: 'Conta Corrente',
    cash: 'Dinheiro / Carteira',
    savings: 'Poupança / Reserva',
    credit_card: 'Cartão de Crédito',
    investment: 'Investimentos',
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Contas e Carteiras ({accounts.length})
          </h2>
          <p className="text-xs text-slate-400">
            Gerencie onde seu dinheiro está guardado
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openTxModal('create', null, 'transfer')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowRightLeft size={15} />
            <span>Transferir</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                style={{ backgroundColor: acc.color }}
              >
                <DynamicIcon name={acc.icon} size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {acc.name}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {accountTypeNames[acc.type]}
                </span>
                <p className={`text-xs font-bold mt-1 ${acc.current_balance < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                  Saldo: {formatCurrency(acc.current_balance, hideBalances)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => openEditModal(acc)}
                className="p-2 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Editar"
              >
                <Edit2 size={15} />
              </button>
              {accounts.length > 1 && (
                <button
                  onClick={() => handleDelete(acc)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Excluir"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {editingAccount ? 'Editar Conta' : 'Nova Conta Bancária / Carteira'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Itaú, Carteira..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Tipo de Conta
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="cash">Dinheiro em Espécie / Carteira</option>
                  <option value="savings">Conta Poupança / Reserva</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="investment">Investimentos</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Saldo Inicial (R$)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1200,00"
                  value={initialBalanceStr}
                  onChange={(e) => setInitialBalanceStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Ícone</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {['Building2', 'Wallet', 'PiggyBank', 'CreditCard', 'Coins', 'Landmark'].map((ic) => (
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

              {/* Color Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Cor de Destaque</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-all shrink-0 ${
                        color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
                  {isSubmitting ? 'Salvando...' : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
