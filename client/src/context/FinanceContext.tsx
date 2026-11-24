import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Account, Category, Transaction, DashboardSummary, TransactionType } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  summary: DashboardSummary | null;
  period: 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';
  setPeriod: (p: 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom') => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;
  isLoadingData: boolean;
  refreshData: () => Promise<void>;
  
  // Transaction Modal State
  isTxModalOpen: boolean;
  txModalMode: 'create' | 'edit' | 'duplicate';
  txModalInitialType: TransactionType;
  editingTransaction: Transaction | null;
  openTxModal: (mode?: 'create' | 'edit' | 'duplicate', tx?: Transaction | null, defaultType?: TransactionType) => void;
  closeTxModal: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalMode, setTxModalMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [txModalInitialType, setTxModalInitialType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const refreshData = useCallback(async () => {
    if (!token) return;
    setIsLoadingData(true);
    try {
      // Check and process due recurring transactions first
      await api.recurring.process().catch(() => {});

      const [accRes, catRes, sumRes, txRes] = await Promise.all([
        api.accounts.list(),
        api.categories.list(),
        api.reports.getSummary({
          period,
          start_date: period === 'custom' ? customDateRange.start : undefined,
          end_date: period === 'custom' ? customDateRange.end : undefined,
        }),
        api.transactions.list({ limit: 100 }),
      ]);

      setAccounts(accRes.accounts);
      setCategories(catRes.categories);
      setSummary(sumRes);
      setTransactions(txRes.transactions);
    } catch (err) {
      console.error('Erro ao atualizar dados financeiros:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [token, period, customDateRange]);

  useEffect(() => {
    if (user && token) {
      refreshData();
    } else {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setSummary(null);
    }
  }, [user, token, period, customDateRange, refreshData]);

  const openTxModal = (
    mode: 'create' | 'edit' | 'duplicate' = 'create',
    tx: Transaction | null = null,
    defaultType: TransactionType = 'expense'
  ) => {
    setTxModalMode(mode);
    setEditingTransaction(tx);
    setTxModalInitialType(tx ? tx.type : defaultType);
    setIsTxModalOpen(true);
  };

  const closeTxModal = () => {
    setIsTxModalOpen(false);
    setEditingTransaction(null);
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        categories,
        transactions,
        summary,
        period,
        setPeriod,
        customDateRange,
        setCustomDateRange,
        isLoadingData,
        refreshData,
        isTxModalOpen,
        txModalMode,
        txModalInitialType,
        editingTransaction,
        openTxModal,
        closeTxModal,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  }
  return context;
};
