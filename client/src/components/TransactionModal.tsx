import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Calendar,
  Wallet,
  ArrowRightLeft,
  Trash2,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Delete,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { DynamicIcon } from './DynamicIcon';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { TransactionType } from '../types';

export const TransactionModal: React.FC = () => {
  const {
    isTxModalOpen,
    txModalMode,
    txModalInitialType,
    editingTransaction,
    closeTxModal,
    categories,
    accounts,
    refreshData,
  } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Math expression evaluation in numpad (e.g. 50 + 20)
  const [mathOp, setMathOp] = useState<'+' | '-' | null>(null);
  const [prevVal, setPrevVal] = useState<number | null>(null);

  // Quick category creation modal state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#059669');

  // Synchronize state when modal opens
  useEffect(() => {
    if (isTxModalOpen) {
      setErrorMsg('');
      setMathOp(null);
      setPrevVal(null);
      setShowNewCategory(false);

      if (editingTransaction && (txModalMode === 'edit' || txModalMode === 'duplicate')) {
        setType(editingTransaction.type);
        setAmountStr(editingTransaction.amount.toFixed(2).replace('.', ','));
        setDescription(txModalMode === 'duplicate' ? `${editingTransaction.description} (Cópia)` : editingTransaction.description);
        setCategoryId(editingTransaction.category_id || '');
        setAccountId(editingTransaction.account_id || (accounts[0]?.id || ''));
        setDestinationAccountId(editingTransaction.destination_account_id || '');
        setDate(txModalMode === 'duplicate' ? new Date().toISOString().split('T')[0] : editingTransaction.date);
        setNotes(editingTransaction.notes || '');
      } else {
        // Create new
        setType(txModalInitialType || 'expense');
        setAmountStr('0');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');

        // Preselect default account
        if (accounts.length > 0) {
          setAccountId(accounts[0].id);
          if (accounts.length > 1) {
            setDestinationAccountId(accounts[1].id);
          }
        }

        // Preselect first matching category
        const initialCats = categories.filter(c => c.type === (txModalInitialType || 'expense'));
        if (initialCats.length > 0) {
          setCategoryId(initialCats[0].id);
        } else {
          setCategoryId('');
        }
      }
    }
  }, [isTxModalOpen, txModalMode, txModalInitialType, editingTransaction, accounts, categories]);

  if (!isTxModalOpen) return null;

  // Filter categories by selected transaction type
  const availableCategories = categories.filter(c => c.type === type);

  // Numeric keyboard handlers
  const handleDigit = (digit: string) => {
    if (amountStr === '0' && digit !== ',') {
      setAmountStr(digit);
    } else if (digit === ',') {
      if (!amountStr.includes(',')) {
        setAmountStr(amountStr + ',');
      }
    } else {
      // Limit to 2 decimal places if comma exists
      if (amountStr.includes(',')) {
        const [, decimals] = amountStr.split(',');
        if (decimals && decimals.length >= 2) return;
      }
      setAmountStr(amountStr + digit);
    }
  };

  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      setAmountStr('0');
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  const handleClear = () => {
    setAmountStr('0');
    setMathOp(null);
    setPrevVal(null);
  };

  const handleMath = (op: '+' | '-') => {
    const parsed = parseFloat(amountStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      if (prevVal !== null && mathOp) {
        // compute intermediate result
        const res = mathOp === '+' ? prevVal + parsed : Math.max(0, prevVal - parsed);
        setPrevVal(res);
      } else {
        setPrevVal(parsed);
      }
      setMathOp(op);
      setAmountStr('0');
    }
  };

  const handleEquals = () => {
    if (prevVal !== null && mathOp) {
      const current = parseFloat(amountStr.replace(',', '.')) || 0;
      const res = mathOp === '+' ? prevVal + current : Math.max(0, prevVal - current);
      setAmountStr(res.toFixed(2).replace('.', ','));
      setMathOp(null);
      setPrevVal(null);
    }
  };

  const currentNumericAmount = () => {
    let base = parseFloat(amountStr.replace(',', '.')) || 0;
    if (prevVal !== null && mathOp) {
      base = mathOp === '+' ? prevVal + base : Math.max(0, prevVal - base);
    }
    return base;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const finalAmount = currentNumericAmount();
    if (finalAmount <= 0) {
      setErrorMsg('Informe um valor maior que zero.');
      return;
    }

    if (!description.trim()) {
      // If user didn't enter description, default to selected category or account name
      if (type === 'transfer') {
        const src = accounts.find(a => a.id === accountId)?.name || 'Conta';
        const dst = accounts.find(a => a.id === destinationAccountId)?.name || 'Destino';
        setDescription(`Transferência de ${src} para ${dst}`);
      } else {
        const cat = categories.find(c => c.id === categoryId)?.name || (type === 'income' ? 'Receita' : 'Despesa');
        setDescription(cat);
      }
    }

    if (!accountId) {
      setErrorMsg('Selecione uma conta para a movimentação.');
      return;
    }

    if (type === 'transfer') {
      if (!destinationAccountId) {
        setErrorMsg('Selecione a conta de destino para a transferência.');
        return;
      }
      if (accountId === destinationAccountId) {
        setErrorMsg('A conta de origem e destino devem ser diferentes.');
        return;
      }
    } else {
      if (!categoryId) {
        setErrorMsg('Selecione uma categoria.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        amount: Number(finalAmount.toFixed(2)),
        description: description.trim() || (type === 'transfer' ? 'Transferência' : 'Movimentação'),
        category_id: type === 'transfer' ? null : categoryId,
        account_id: accountId,
        destination_account_id: type === 'transfer' ? destinationAccountId : null,
        date,
        notes: notes.trim() || null,
      };

      if (txModalMode === 'edit' && editingTransaction) {
        await api.transactions.update(editingTransaction.id, payload);
      } else {
        await api.transactions.create(payload);
      }

      await refreshData();
      closeTxModal();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    if (window.confirm('Tem certeza que deseja excluir esta movimentação? O saldo será recalculado.')) {
      setIsSubmitting(true);
      try {
        await api.transactions.delete(editingTransaction.id);
        await refreshData();
        closeTxModal();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao excluir.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await api.categories.create({
        name: newCatName.trim(),
        type: type === 'transfer' ? 'expense' : type,
        icon: newCatIcon,
        color: newCatColor,
      });
      await refreshData();
      setCategoryId(res.category.id);
      setShowNewCategory(false);
      setNewCatName('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar categoria');
    }
  };

  // Quick suggestions based on type
  const quickSuggestions = type === 'expense'
    ? ['Almoço', 'Supermercado', 'Uber', 'Farmácia', 'Combustível', 'Cinema', 'Lanche']
    : ['Salário', 'Freelance', 'PIX Recebido', 'Rendimento', 'Venda', 'Bônus'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header Tabs */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const first = categories.find(c => c.type === 'expense');
                if (first) setCategoryId(first.id);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownCircle size={14} />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const first = categories.find(c => c.type === 'income');
                if (first) setCategoryId(first.id);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpCircle size={14} />
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                type === 'transfer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowRightLeft size={14} />
              Transferir
            </button>
          </div>

          <button
            onClick={closeTxModal}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Amount Display */}
          <div className="text-center py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              {type === 'expense' ? 'Valor a Gastar' : type === 'income' ? 'Valor a Receber' : 'Valor a Transferir'}
            </span>
            <div className="flex items-center justify-center mt-1">
              <span className={`text-2xl font-bold mr-1 ${
                type === 'expense' ? 'text-rose-500' : type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
              }`}>
                R$
              </span>
              <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {amountStr}
              </span>
              {mathOp && (
                <span className="ml-2 text-sm px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full font-bold">
                  {prevVal} {mathOp}
                </span>
              )}
            </div>
          </div>

          {/* Monefy-style Numeric Pad */}
          <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-100/70 dark:bg-slate-800/70 rounded-2xl">
            {['1', '2', '3'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="h-11 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-11 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center hover:bg-slate-300 active:scale-95 transition-all"
            >
              <Delete size={18} />
            </button>

            {['4', '5', '6'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="h-11 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleMath('+')}
              className="h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-lg hover:bg-emerald-200 active:scale-95 transition-all"
            >
              +
            </button>

            {['7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="h-11 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleMath('-')}
              className="h-11 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-lg hover:bg-rose-200 active:scale-95 transition-all"
            >
              -
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="h-11 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase hover:bg-slate-300 active:scale-95 transition-all"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-11 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleDigit(',')}
              className="h-11 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
            >
              ,
            </button>
            <button
              type="button"
              onClick={handleEquals}
              className="h-11 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
            >
              =
            </button>
          </div>

          {/* Description & Quick Suggestions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Descrição
              </label>
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'transfer' ? 'Ex: Transferência de saldo' : 'Ex: Almoço no restaurante'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {type !== 'transfer' && (
              <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
                {quickSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setDescription(sug)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 transition-colors whitespace-nowrap"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Selector (if not transfer) */}
          {type !== 'transfer' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Categoria
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={13} />
                  Nova Categoria
                </button>
              </div>

              {/* Inline Create Category Form */}
              {showNewCategory && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nome da categoria"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              )}

              {/* Category Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
                {availableCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold scale-[1.03] shadow-xs'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-1 text-white shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <DynamicIcon name={cat.icon} size={18} />
                      </div>
                      <span className="text-[10px] leading-tight text-center truncate w-full">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {type === 'transfer' ? 'Conta de Origem' : 'Conta'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' ? (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Conta de Destino
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione a conta...</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.current_balance)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Date for Transfer mode */}
          {type === 'transfer' && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Data da Transferência
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Notes Optional */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Observações (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comprovante guardado no e-mail"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {txModalMode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          ) : (
            <button
              type="button"
              onClick={closeTxModal}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className={`flex-1 py-3 px-5 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 ${
              type === 'expense'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
            }`}
          >
            <Check size={18} />
            {isSubmitting ? 'Salvando...' : txModalMode === 'edit' ? 'Salvar Alterações' : 'Salvar Movimentação'}
          </button>
        </div>

      </div>
    </div>
  );
};
