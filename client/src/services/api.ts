import {
  User,
  Account,
  Category,
  Transaction,
  RecurringRule,
  Budget,
  Goal,
  DashboardSummary
} from '../types';

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

  if (response.status === 401) {
    // If unauthorized, clear token and notify
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

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: { name: string; email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    demo: () =>
      request<{ token: string; user: User; isDemo: boolean }>('/auth/demo', {
        method: 'POST',
      }),
    me: () => request<{ user: User }>('/auth/me'),
    updateProfile: (data: Partial<User>) =>
      request<{ user: User }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Accounts
  accounts: {
    list: () => request<{ accounts: Account[] }>('/accounts'),
    create: (data: Omit<Account, 'id' | 'user_id' | 'current_balance' | 'is_active' | 'created_at'>) =>
      request<{ account: Account }>('/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Account>) =>
      request<{ account: Account }>(`/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/accounts/${id}`, {
        method: 'DELETE',
      }),
  },

  // Categories
  categories: {
    list: (type?: 'income' | 'expense') =>
      request<{ categories: Category[] }>(type ? `/categories?type=${type}` : '/categories'),
    create: (data: Omit<Category, 'id' | 'user_id' | 'is_default' | 'created_at'>) =>
      request<{ category: Category }>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Category>) =>
      request<{ category: Category }>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // Transactions
  transactions: {
    list: (params: {
      type?: string;
      category_id?: string;
      account_id?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
      min_amount?: number;
      max_amount?: number;
      limit?: number;
      offset?: number;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      const qs = query.toString();
      return request<{ transactions: Transaction[] }>(`/transactions${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<{ transaction: Transaction }>(`/transactions/${id}`),
    create: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) =>
      request<{ transaction: Transaction }>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Transaction>) =>
      request<{ transaction: Transaction }>(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/transactions/${id}`, {
        method: 'DELETE',
      }),
    duplicate: (id: string) =>
      request<{ transaction: Transaction }>(`/transactions/${id}/duplicate`, {
        method: 'POST',
      }),
  },

  // Recurring Rules
  recurring: {
    list: () => request<{ recurring_rules: RecurringRule[] }>('/recurring'),
    create: (data: Omit<RecurringRule, 'id' | 'user_id' | 'next_due_date' | 'is_active' | 'created_at'>) =>
      request<{ recurring_rule: RecurringRule }>('/recurring', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggle: (id: string) =>
      request<{ success: boolean; is_active: number }>(`/recurring/${id}/toggle`, {
        method: 'PATCH',
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/recurring/${id}`, {
        method: 'DELETE',
      }),
    process: () =>
      request<{ processedCount: number; processedIds: string[] }>('/recurring/process', {
        method: 'POST',
      }),
  },

  // Budgets
  budgets: {
    list: (month?: string) =>
      request<{ month: string; budgets: Budget[] }>(month ? `/budgets?month=${month}` : '/budgets'),
    upsert: (data: { category_id?: string | null; monthly_limit: number; month: string }) =>
      request<{ budget: Budget }>('/budgets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/budgets/${id}`, {
        method: 'DELETE',
      }),
  },

  // Goals
  goals: {
    list: () => request<{ goals: Goal[] }>('/goals'),
    create: (data: Omit<Goal, 'id' | 'user_id' | 'progress' | 'remaining' | 'isCompleted' | 'created_at'>) =>
      request<{ goal: Goal }>('/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    contribute: (id: string, data: { amount: number; notes?: string }) =>
      request<{ goal: Goal }>(`/goals/${id}/contribute`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Goal>) =>
      request<{ goal: Goal }>(`/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/goals/${id}`, {
        method: 'DELETE',
      }),
  },

  // Reports & Analytics & Data Management
  reports: {
    getSummary: (params: { period?: string; start_date?: string; end_date?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.period) query.append('period', params.period);
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      const qs = query.toString();
      return request<DashboardSummary>(`/reports/summary${qs ? `?${qs}` : ''}`);
    },
    exportCSVUrl: () => `${API_BASE}/reports/export/csv`,
    exportJSONUrl: () => `${API_BASE}/reports/export/json`,
    resetData: () => request<{ success: boolean; message: string }>('/reports/reset-data', { method: 'POST' }),
    loadDemo: () => request<{ success: boolean; message: string }>('/reports/load-demo', { method: 'POST' }),
  },
};
