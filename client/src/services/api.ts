import {
  User,
  Account,
  Category,
  Transaction,
  RecurringRule,
  Budget,
  Goal,
  DashboardSummary,
} from '../types';
import { localDb } from './storage';
import { isSupabaseConfigured, supabaseApi } from './supabase';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('coinvy_token') || localStorage.getItem('nexo_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Backend is not available on this host (e.g. Vercel static deployment)
    throw new ApiError('NO_BACKEND_AVAILABLE', response.status);
  }

  if (response.status === 401) {
    localStorage.removeItem('coinvy_token');
    localStorage.removeItem('nexo_token');
    localStorage.removeItem('coinvy_user');
    localStorage.removeItem('nexo_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  if (!response.ok) {
    let errorMsg = 'Ocorreu um erro na requisição.';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new ApiError(errorMsg, response.status);
  }

  return response.json();
}

function hasBackendApi(): boolean {
  if (typeof window === 'undefined') return false;
  // Express server only exists on localhost during local dev
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/**
 * Executes a network API call, or seamlessly falls back to
 * Supabase (if configured) or local browser database (if offline/unconfigured).
 */
async function withFallback<T>(
  apiCall: () => Promise<T>,
  supabaseCall: () => Promise<T>,
  localFallback: () => Promise<T> | T
): Promise<T> {
  // 1. If Supabase is configured, use Supabase
  if (isSupabaseConfigured()) {
    try {
      return await supabaseCall();
    } catch (err: any) {
      console.warn('Erro na operação com Supabase:', err);
      throw err;
    }
  }

  // 2. If running on Vercel or any non-localhost host without a Node server, go directly to local database!
  if (!hasBackendApi()) {
    return await localFallback();
  }

  // 3. On localhost, try the Express API; if it fails with any network/server error, use local fallback
  try {
    return await apiCall();
  } catch (err: any) {
    console.warn('Backend local indisponível, usando armazenamento local:', err);
    return await localFallback();
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      withFallback(
        () => request<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        }),
        () => supabaseApi.auth.login(credentials),
        () => localDb.login(credentials)
      ),
    register: (data: { name: string; email: string; password: string }) =>
      withFallback(
        () => request<{ token: string; user: User }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        () => supabaseApi.auth.register(data),
        () => localDb.register(data)
      ),
    demo: () =>
      withFallback(
        () => request<{ token: string; user: User; isDemo: boolean }>('/auth/demo', {
          method: 'POST',
        }),
        () => localDb.demo(),
        () => localDb.demo()
      ),
    me: () =>
      withFallback(
        () => request<{ user: User }>('/auth/me'),
        () => supabaseApi.auth.me(),
        () => localDb.me()
      ),
    updateProfile: (data: Partial<User>) =>
      withFallback(
        () => request<{ user: User }>('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
        () => supabaseApi.auth.updateProfile(data),
        () => localDb.updateProfile(data)
      ),
  },

  // Accounts
  accounts: {
    list: () =>
      withFallback(
        () => request<{ accounts: Account[] }>('/accounts'),
        async () => ({ accounts: await supabaseApi.accounts.getAll() }),
        () => localDb.listAccounts()
      ),
    create: (data: Omit<Account, 'id' | 'user_id' | 'current_balance' | 'is_active' | 'created_at'>) =>
      withFallback(
        () => request<{ account: Account }>('/accounts', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        async () => ({ account: await supabaseApi.accounts.create(data) }),
        () => localDb.createAccount(data)
      ),
    update: (id: string, data: Partial<Account>) =>
      withFallback(
        () => request<{ account: Account }>(`/accounts/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
        async () => ({ account: await supabaseApi.accounts.update(id, data) }),
        () => localDb.updateAccount(id, data)
      ),
    delete: (id: string) =>
      withFallback(
        () => request<{ success: boolean; message: string }>(`/accounts/${id}`, {
          method: 'DELETE',
        }),
        async () => {
          await supabaseApi.accounts.delete(id);
          return { success: true, message: 'Conta excluída com sucesso' };
        },
        () => localDb.deleteAccount(id)
      ),
  },

  // Categories
  categories: {
    list: (type?: 'income' | 'expense') =>
      withFallback(
        () => request<{ categories: Category[] }>(type ? `/categories?type=${type}` : '/categories'),
        async () => ({ categories: await supabaseApi.categories.getAll(type) }),
        () => localDb.listCategories(type)
      ),
    create: (data: Omit<Category, 'id' | 'user_id' | 'is_default' | 'created_at'>) =>
      withFallback(
        () => request<{ category: Category }>('/categories', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        async () => ({ category: await supabaseApi.categories.create(data) }),
        () => localDb.createCategory(data)
      ),
    update: (id: string, data: Partial<Category>) =>
      withFallback(
        () => request<{ category: Category }>(`/categories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
        async () => ({ category: await supabaseApi.categories.update(id, data) }),
        () => localDb.updateCategory(id, data)
      ),
    delete: (id: string) =>
      withFallback(
        () => request<{ success: boolean }>(`/categories/${id}`, {
          method: 'DELETE',
        }),
        async () => {
          await supabaseApi.categories.delete(id);
          return { success: true };
        },
        () => localDb.deleteCategory(id)
      ),
  },

  // Transactions
  transactions: {
    list: (params: any = {}) =>
      withFallback(
        () => {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
              query.append(key, String(val));
            }
          });
          const qs = query.toString();
          return request<{ transactions: Transaction[] }>(`/transactions${qs ? `?${qs}` : ''}`);
        },
        async () => ({ transactions: await supabaseApi.transactions.getAll(params) }),
        () => localDb.listTransactions(params)
      ),
    get: (id: string) =>
      withFallback(
        () => request<{ transaction: Transaction }>(`/transactions/${id}`),
        async () => {
          const txs = await supabaseApi.transactions.getAll();
          const found = txs.find((t) => t.id === id);
          if (!found) throw new Error('Movimentação não encontrada');
          return { transaction: found };
        },
        () => {
          const txs = localDb.listTransactions().transactions;
          const found = txs.find((t) => t.id === id);
          if (!found) throw new Error('Movimentação não encontrada');
          return { transaction: found };
        }
      ),
    create: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) =>
      withFallback(
        () => request<{ transaction: Transaction }>('/transactions', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        async () => ({ transaction: await supabaseApi.transactions.create(data) }),
        () => localDb.createTransaction(data)
      ),
    update: (id: string, data: Partial<Transaction>) =>
      withFallback(
        () => request<{ transaction: Transaction }>(`/transactions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
        async () => ({ transaction: await supabaseApi.transactions.update(id, data) }),
        () => localDb.updateTransaction(id, data)
      ),
    delete: (id: string) =>
      withFallback(
        () => request<{ success: boolean; message: string }>(`/transactions/${id}`, {
          method: 'DELETE',
        }),
        async () => {
          await supabaseApi.transactions.delete(id);
          return { success: true, message: 'Movimentação excluída com sucesso' };
        },
        () => localDb.deleteTransaction(id)
      ),
    duplicate: (id: string) =>
      withFallback(
        () => request<{ transaction: Transaction }>(`/transactions/${id}/duplicate`, {
          method: 'POST',
        }),
        async () => {
          const txs = await supabaseApi.transactions.getAll();
          const found = txs.find((t) => t.id === id);
          if (!found) throw new Error('Movimentação original não encontrada');
          const duplicated = await supabaseApi.transactions.create({
            type: found.type,
            amount: found.amount,
            description: `${found.description} (Cópia)`,
            category_id: found.category_id,
            account_id: found.account_id,
            destination_account_id: found.destination_account_id,
            date: new Date().toISOString().split('T')[0],
            notes: found.notes,
          });
          return { transaction: duplicated };
        },
        () => localDb.duplicateTransaction(id)
      ),
  },

  // Recurring Rules
  recurring: {
    list: () =>
      withFallback(
        () => request<{ recurring_rules: RecurringRule[] }>('/recurring'),
        async () => ({ recurring_rules: await supabaseApi.recurring.getAll() }),
        () => localDb.listRecurring()
      ),
    create: (data: Omit<RecurringRule, 'id' | 'user_id' | 'next_due_date' | 'is_active' | 'created_at'>) =>
      withFallback(
        () => request<{ recurring_rule: RecurringRule }>('/recurring', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        async () => ({ recurring_rule: await supabaseApi.recurring.create(data) }),
        () => localDb.createRecurring(data)
      ),
    toggle: (id: string) =>
      withFallback(
        () => request<{ success: boolean; is_active: number }>(`/recurring/${id}/toggle`, {
          method: 'PATCH',
        }),
        async () => {
          const rules = await supabaseApi.recurring.getAll();
          const found = rules.find((r) => r.id === id);
          const nextActive = !found?.is_active;
          await supabaseApi.recurring.update(id, { is_active: nextActive });
          return { success: true, is_active: nextActive ? 1 : 0 };
        },
        () => localDb.toggleRecurring(id)
      ),
    delete: (id: string) =>
      withFallback(
        () => request<{ success: boolean }>(`/recurring/${id}`, {
          method: 'DELETE',
        }),
        async () => {
          await supabaseApi.recurring.delete(id);
          return { success: true };
        },
        () => localDb.deleteRecurring(id)
      ),
    process: () =>
      withFallback(
        () => request<{ processedCount: number; processedIds: string[] }>('/recurring/process', {
          method: 'POST',
        }),
        async () => ({ processedCount: 0, processedIds: [] }),
        () => localDb.processRecurring()
      ),
  },

  // Budgets
  budgets: {
    list: (month?: string) =>
      withFallback(
        () => request<{ month: string; budgets: Budget[] }>(month ? `/budgets?month=${month}` : '/budgets'),
        async () => ({ month: month || 'global', budgets: await supabaseApi.budgets.getAll(month) }),
        () => localDb.listBudgets(month)
      ),
    upsert: (data: { category_id?: string | null; monthly_limit: number; month: string }) =>
      withFallback(
        () => request<{ budget: Budget }>('/budgets', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        async () => ({ budget: await supabaseApi.budgets.set(data) }),
        () => localDb.upsertBudget(data)
      ),
    delete: (id: string) =>
      withFallback(
        () => request<{ success: boolean }>(`/budgets/${id}`, {
          method: 'DELETE',
        }),
        async () => {
          await supabaseApi.budgets.delete(id);
          return { success: true };
        },
        () => localDb.deleteBudget(id)
      ),
  },

  // Goals
  goals: {
    list: () =>
      withFallback(
        () => request<{ goals: Goal[] }>('/goals'),
        async () => ({ goals: await supabaseApi.goals.getAll() }),
        () => localDb.listGoals()
      ),
    create: (data: Omit<Goal, 'id' | 'user_id' | 'progress' | 'remaining' | 'isCompleted' | 'created_at'>) =>
      withFallback(
        () => request<{ goal: Goal }>('/goals', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        async () => ({ goal: await supabaseApi.goals.create(data) }),
        () => localDb.createGoal(data)
      ),
    contribute: (id: string, data: { amount: number; notes?: string }) =>
      withFallback(
        () => request<{ goal: Goal }>(`/goals/${id}/contribute`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
        async () => ({ goal: await supabaseApi.goals.addProgress(id, data.amount) }),
        () => localDb.contributeGoal(id, data)
      ),
    update: (id: string, data: Partial<Goal>) =>
      withFallback(
        () => request<{ goal: Goal }>(`/goals/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
        async () => ({ goal: await supabaseApi.goals.update(id, data) }),
        () => localDb.createGoal({ id, ...data })
      ),
    delete: (id: string) =>
      withFallback(
        () => request<{ success: boolean }>(`/goals/${id}`, {
          method: 'DELETE',
        }),
        async () => {
          await supabaseApi.goals.delete(id);
          return { success: true };
        },
        () => localDb.deleteGoal(id)
      ),
  },

  // Reports & Analytics & Data Management
  reports: {
    getSummary: (params: { period?: string; start_date?: string; end_date?: string } = {}) =>
      withFallback(
        () => {
          const query = new URLSearchParams();
          if (params.period) query.append('period', params.period);
          if (params.start_date) query.append('start_date', params.start_date);
          if (params.end_date) query.append('end_date', params.end_date);
          const qs = query.toString();
          return request<DashboardSummary>(`/reports/summary${qs ? `?${qs}` : ''}`);
        },
        async () => {
          return await supabaseApi.reports.getSummary(
            params.period || 'month',
            params.start_date && params.end_date ? { start: params.start_date, end: params.end_date } : undefined
          );
        },
        () => localDb.getSummary(params)
      ),
    exportCSVUrl: () => `${API_BASE}/reports/export/csv`,
    exportJSONUrl: () => `${API_BASE}/reports/export/json`,
    resetData: () =>
      withFallback(
        () => request<{ success: boolean; message: string }>('/reports/reset-data', { method: 'POST' }),
        async () => ({ success: true, message: 'Dados resetados' }),
        () => localDb.resetData()
      ),
    loadDemo: () =>
      withFallback(
        () => request<{ success: boolean; message: string }>('/reports/load-demo', { method: 'POST' }),
        async () => ({ success: true, message: 'Dados de demonstração carregados!' }),
        () => {
          localDb.seedDemoTransactions(localDb.getCurrentUserId());
          return { success: true, message: 'Dados de demonstração carregados com sucesso!' };
        }
      ),
  },
};
