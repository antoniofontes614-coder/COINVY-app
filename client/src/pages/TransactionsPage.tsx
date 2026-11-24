import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowRightLeft,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatRelativeDate, formatDate } from '../utils/formatters';
import { DynamicIcon } from '../components/DynamicIcon';
import { api } from '../services/api';
import { Transaction } from '../types';

export const TransactionsPage: React.FC = () => {
  const { transactions, categories, accounts, openTxModal, refreshData } = useFinance();
  const { hideBalances } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search text filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(term);
        const matchesNotes = tx.notes ? tx.notes.toLowerCase().includes(term) : false;
        const matchesCat = tx.category_name ? tx.category_name.toLowerCase().includes(term) : false;
        if (!matchesDesc && !matchesNotes && !matchesCat) return false;
      }

      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && tx.category_id !== selectedCategory) {
        return false;
      }

      // Account filter
      if (selectedAccount !== 'all' && tx.account_id !== selectedAccount && tx.destination_account_id !== selectedAccount) {
        return false;
      }

      return true;
    });
  }, [transactions, searchTerm, selectedType, selectedCategory, selectedAccount]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const tx of filteredTransactions) {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    }
    return groups;
  }, [filteredTransactions]);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const handleDuplicate = async (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    try {
      await api.transactions.duplicate(tx.id);
      await refreshData();
    } catch (err: any) {
      alert('Erro ao duplicar: ' + err.message);
    }
  };

  const handleDelete = async (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    if (window.confirm(`Excluir "${tx.description}"? Os saldos serão recalculados.`)) {
      try {
        await api.transactions.delete(tx.id);
        await refreshData();
      } catch (err: any) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('coinvy_token') || localStorage.getItem('nexo_token');
      const res = await fetch('/api/reports/export/csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coinvy_movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch {}

    const { exportTransactionsCSV } = await import('../utils/export');
    exportTransactionsCSV(filteredTransactions);
  };

  return (
    <div className="space-y-4 pb-28 max-w-4xl mx-auto px-4 pt-2">
      
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
              showFilters || selectedType !== 'all' || selectedCategory !== 'all' || selectedAccount !== 'all'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Filter size={15} />
            <span>Filtros</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Exportar para Excel (CSV)"
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => openTxModal('create')}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Novo</span>
          </button>
        </div>
      </div>

      {/* Filter Options Drawer */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Type */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tipo</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white"
              >
                <option value="all">Todos os tipos</option>
                <option value="expense">Despesas</option>
                <option value="income">Receitas</option>
                <option value="transfer">Transferências</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Conta</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white"
              >
                <option value="all">Todas as contas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedType !== 'all' || selectedCategory !== 'all' || selectedAccount !== 'all' || searchTerm) && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedType('all');
                  setSelectedCategory('all');
                  setSelectedAccount('all');
                  setSearchTerm('');
                }}
                className="text-xs text-rose-500 font-semibold hover:underline"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>{filteredTransactions.length} movimentações encontradas</span>
      </div>

      {/* Transactions List Grouped by Date */}
      {sortedDates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma movimentação corresponde aos critérios.
          </p>
          <p className="text-xs text-slate-400">
            Tente remover os filtros aplicados ou registrar uma nova transação.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateStr) => {
            const dayTxs = groupedTransactions[dateStr];
            const dayTotal = dayTxs.reduce((acc, t) => {
              if (t.type === 'income') return acc + t.amount;
              if (t.type === 'expense') return acc - t.amount;
              return acc;
            }, 0);

            return (
              <div key={dateStr} className="space-y-1.5">
                {/* Date Header */}
                <div className="flex items-center justify-between px-2 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {formatRelativeDate(dateStr)}
                  </span>
                  <span
                    className={`font-semibold ${
                      dayTotal >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatCurrency(dayTotal, hideBalances)}
                  </span>
                </div>

                {/* Day Transactions Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
                  {dayTxs.map((tx) => {
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
                              <span>
                                {isTransfer
                                  ? `${tx.account_name} ➔ ${tx.destination_account_name}`
                                  : `${tx.category_name || 'Geral'} • ${tx.account_name}`}
                              </span>
                              {tx.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic truncate max-w-[120px] sm:max-w-xs">{tx.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Quick Actions on Hover */}
                        <div className="flex items-center gap-2">
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

                          <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <button
                              type="button"
                              onClick={(e) => handleDuplicate(e, tx)}
                              title="Duplicar"
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, tx)}
                              title="Excluir"
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
