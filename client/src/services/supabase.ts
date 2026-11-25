import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// Official production cloud database credentials for DIM+
const DEFAULT_SUPABASE_URL = 'https://kietsrviiykbwlsvtpmv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZXRzcnZpaXlrYndsc3Z0cG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2MTA3MzUsImV4cCI6MjExMTE4NjczNX0.uZQNt08zbnoXNiE0CKnlWylS6lcEGD_8iZ-NbQeUFdY';

// Read config from env, user configuration in localStorage, or official defaults
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('coinvy_supabase_url') || '';
  const localKey = localStorage.getItem('coinvy_supabase_anon_key') || '';

  const url = (envUrl || localUrl || DEFAULT_SUPABASE_URL).trim();
  const anonKey = (envKey || localKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  localStorage.setItem('coinvy_supabase_url', url.trim());
  localStorage.setItem('coinvy_supabase_anon_key', anonKey.trim());
  // Reset client instance
  clientInstance = null;
}

export function clearSupabaseCredentials() {
  localStorage.removeItem('coinvy_supabase_url');
  localStorage.removeItem('coinvy_supabase_anon_key');
  clientInstance = null;
}

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (clientInstance) return clientInstance;
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) return null;

  try {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return clientInstance;
  } catch (err) {
    console.error('Falha ao inicializar Supabase:', err);
    return null;
  }
}

// Convert Supabase User profile to application User interface
function mapProfileToUser(authUser: any, profile?: any): User {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
    currency: profile?.currency || 'BRL',
    date_format: profile?.date_format || 'DD/MM/YYYY',
    hide_balances: profile?.hide_balances ? 1 : 0,
    theme: profile?.theme || 'light',
    avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
  };
}

export const supabaseApi = {
  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------
  auth: {
    async register(data: { name: string; email: string; password: string }) {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não está configurado.');

      const { data: authData, error } = await client.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('Este e-mail já está cadastrado. Faça login.');
        }
        throw new Error(error.message);
      }

      if (!authData.user) {
        throw new Error('Não foi possível criar o usuário no Supabase.');
      }

      const user = mapProfileToUser(authData.user, { name: data.name });
      const token = authData.session?.access_token || 'supabase_session';

      return { user, token };
    },

    async login(credentials: { email: string; password: string }) {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não está configurado.');

      const { data: authData, error } = await client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw new Error(error.message);
      }

      // Fetch profile
      const { data: profile } = await client
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      const user = mapProfileToUser(authData.user, profile);
      const token = authData.session.access_token;

      return { user, token };
    },

    async me() {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não está configurado.');

      const { data: { user: authUser }, error } = await client.auth.getUser();
      if (error || !authUser) throw new Error('Sessão expirada.');

      const { data: profile } = await client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      return { user: mapProfileToUser(authUser, profile) };
    },

    async logout() {
      const client = getSupabase();
      if (client) {
        await client.auth.signOut();
      }
    },

    async updateProfile(updates: Partial<User>) {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não está configurado.');

      const { data: { user: authUser } } = await client.auth.getUser();
      if (!authUser) throw new Error('Não autenticado.');

      const profilePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) profilePayload.name = updates.name;
      if (updates.currency !== undefined) profilePayload.currency = updates.currency;
      if (updates.date_format !== undefined) profilePayload.date_format = updates.date_format;
      if (updates.hide_balances !== undefined) profilePayload.hide_balances = Boolean(updates.hide_balances);
      if (updates.theme !== undefined) profilePayload.theme = updates.theme;
      if (updates.avatar_url !== undefined) profilePayload.avatar_url = updates.avatar_url;

      const { data, error } = await client
        .from('profiles')
        .upsert({ id: authUser.id, email: authUser.email, ...profilePayload })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { user: mapProfileToUser(authUser, data) };
    },
  },

  // ----------------------------------------------------
  // ACCOUNTS
  // ----------------------------------------------------
  accounts: {
    async getAll(): Promise<Account[]> {
      const client = getSupabase();
      if (!client) return [];
      const { data, error } = await client
        .from('accounts')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(a => ({
        ...a,
        initial_balance: Number(a.initial_balance),
        current_balance: Number(a.current_balance),
      }));
    },

    async create(account: Partial<Account>): Promise<Account> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Não autenticado.');

      const payload = {
        user_id: user.id,
        name: account.name,
        type: account.type || 'checking',
        color: account.color || '#059669',
        icon: account.icon || 'Building2',
        initial_balance: Number(account.initial_balance || 0),
        current_balance: Number(account.initial_balance || 0),
      };

      const { data, error } = await client.from('accounts').insert(payload).select().single();
      if (error) throw error;
      return {
        ...data,
        initial_balance: Number(data.initial_balance),
        current_balance: Number(data.current_balance),
      };
    },

    async update(id: string, updates: Partial<Account>): Promise<Account> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data, error } = await client
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        initial_balance: Number(data.initial_balance),
        current_balance: Number(data.current_balance),
      };
    },

    async delete(id: string): Promise<void> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { error } = await client.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ----------------------------------------------------
  // CATEGORIES
  // ----------------------------------------------------
  categories: {
    async getAll(type?: 'income' | 'expense'): Promise<Category[]> {
      const client = getSupabase();
      if (!client) return [];
      let query = client.from('categories').select('*').order('name', { ascending: true });
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(cat: Partial<Category>): Promise<Category> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Não autenticado.');

      const payload = {
        user_id: user.id,
        name: cat.name,
        type: cat.type || 'expense',
        icon: cat.icon || 'Tag',
        color: cat.color || '#059669',
        is_default: false,
      };

      const { data, error } = await client.from('categories').insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Category>): Promise<Category> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data, error } = await client
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { error } = await client.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ----------------------------------------------------
  // TRANSACTIONS
  // ----------------------------------------------------
  transactions: {
    async getAll(filters: any = {}): Promise<Transaction[]> {
      const client = getSupabase();
      if (!client) return [];

      let query = client
        .from('transactions')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts!transactions_account_id_fkey(name, icon, color),
          dest_account:accounts!transactions_destination_account_id_fkey(name, icon, color)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.type) query = query.eq('type', filters.type);
      if (filters.accountId) query = query.eq('account_id', filters.accountId);
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.startDate) query = query.gte('date', filters.startDate);
      if (filters.endDate) query = query.lte('date', filters.endDate);
      if (filters.limit) query = query.limit(Number(filters.limit));

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        category_name: t.category?.name || null,
        category_icon: t.category?.icon || null,
        category_color: t.category?.color || null,
        account_name: t.account?.name || null,
        account_icon: t.account?.icon || null,
        account_color: t.account?.color || null,
        destination_account_name: t.dest_account?.name || null,
        destination_account_icon: t.dest_account?.icon || null,
        destination_account_color: t.dest_account?.color || null,
      }));
    },

    async create(tx: Partial<Transaction>): Promise<Transaction> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Não autenticado.');

      const payload = {
        user_id: user.id,
        type: tx.type || 'expense',
        amount: Number(tx.amount || 0),
        description: tx.description || '',
        category_id: tx.category_id || null,
        account_id: tx.account_id,
        destination_account_id: tx.destination_account_id || null,
        date: tx.date || new Date().toISOString().split('T')[0],
        notes: tx.notes || null,
      };

      const { data, error } = await client.from('transactions').insert(payload).select().single();
      if (error) throw error;

      // Recalculate balance for affected accounts
      await this.syncAccountBalances();

      return { ...data, amount: Number(data.amount) };
    },

    async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');

      const { data, error } = await client
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await this.syncAccountBalances();
      return { ...data, amount: Number(data.amount) };
    },

    async delete(id: string): Promise<void> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { error } = await client.from('transactions').delete().eq('id', id);
      if (error) throw error;
      await this.syncAccountBalances();
    },

    async syncAccountBalances() {
      const client = getSupabase();
      if (!client) return;

      const { data: accounts } = await client.from('accounts').select('id, initial_balance');
      if (!accounts) return;

      const { data: txs } = await client.from('transactions').select('type, amount, account_id, destination_account_id');
      if (!txs) return;

      for (const acc of accounts) {
        let balance = Number(acc.initial_balance || 0);
        for (const t of txs) {
          const amt = Number(t.amount);
          if (t.type === 'income' && t.account_id === acc.id) {
            balance += amt;
          } else if (t.type === 'expense' && t.account_id === acc.id) {
            balance -= amt;
          } else if (t.type === 'transfer') {
            if (t.account_id === acc.id) balance -= amt;
            if (t.destination_account_id === acc.id) balance += amt;
          }
        }
        await client.from('accounts').update({ current_balance: balance }).eq('id', acc.id);
      }
    },
  },

  // ----------------------------------------------------
  // RECURRING RULES
  // ----------------------------------------------------
  recurring: {
    async getAll(): Promise<RecurringRule[]> {
      const client = getSupabase();
      if (!client) return [];
      const { data, error } = await client
        .from('recurring_rules')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts!recurring_rules_account_id_fkey(name),
          dest_account:accounts!recurring_rules_destination_account_id_fkey(name)
        `)
        .order('next_due_date', { ascending: true });
      if (error) throw error;

      return (data || []).map((r: any) => ({
        ...r,
        amount: Number(r.amount),
        category_name: r.category?.name,
        category_icon: r.category?.icon,
        category_color: r.category?.color,
        account_name: r.account?.name,
        destination_account_name: r.dest_account?.name,
      }));
    },

    async create(rule: Partial<RecurringRule>): Promise<RecurringRule> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Não autenticado.');

      const payload = {
        user_id: user.id,
        type: rule.type || 'expense',
        amount: Number(rule.amount || 0),
        description: rule.description || '',
        category_id: rule.category_id || null,
        account_id: rule.account_id,
        destination_account_id: rule.destination_account_id || null,
        frequency: rule.frequency || 'monthly',
        start_date: rule.start_date || new Date().toISOString().split('T')[0],
        end_date: rule.end_date || null,
        next_due_date: rule.next_due_date || rule.start_date || new Date().toISOString().split('T')[0],
        notes: rule.notes || null,
        is_active: true,
      };

      const { data, error } = await client.from('recurring_rules').insert(payload).select().single();
      if (error) throw error;
      return { ...data, amount: Number(data.amount) };
    },

    async update(id: string, updates: Partial<RecurringRule>): Promise<RecurringRule> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data, error } = await client
        .from('recurring_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, amount: Number(data.amount) };
    },

    async delete(id: string): Promise<void> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { error } = await client.from('recurring_rules').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ----------------------------------------------------
  // BUDGETS
  // ----------------------------------------------------
  budgets: {
    async getAll(month: string = 'global'): Promise<Budget[]> {
      const client = getSupabase();
      if (!client) return [];

      const { data: budgets, error } = await client
        .from('budgets')
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq('month', month);

      if (error) throw error;

      // Calculate spent for each budget in that month
      const start = `${month}-01`;
      const end = `${month}-31`;
      const txs = await supabaseApi.transactions.getAll({
        type: 'expense',
        startDate: start,
        endDate: end,
      });

      return (budgets || []).map((b: any) => {
        const limit = Number(b.monthly_limit);
        const spent = txs
          .filter(t => !b.category_id || t.category_id === b.category_id)
          .reduce((acc, curr) => acc + curr.amount, 0);

        const remaining = limit - spent;
        const percentage = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;

        return {
          ...b,
          monthly_limit: limit,
          spent,
          remaining,
          percentage,
          isExceeded: spent > limit,
          isNearLimit: percentage >= 80 && spent <= limit,
          category_name: b.category?.name,
          category_icon: b.category?.icon,
          category_color: b.category?.color,
        };
      });
    },

    async set(budget: { category_id?: string | null; monthly_limit: number; month: string }): Promise<Budget> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Não autenticado.');

      // Check existing
      let check = client.from('budgets').select('id').eq('month', budget.month);
      if (budget.category_id) {
        check = check.eq('category_id', budget.category_id);
      } else {
        check = check.is('category_id', null);
      }
      const { data: existing } = await check.maybeSingle();

      if (existing) {
        const { data, error } = await client
          .from('budgets')
          .update({ monthly_limit: budget.monthly_limit })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await client
          .from('budgets')
          .insert({
            user_id: user.id,
            category_id: budget.category_id || null,
            monthly_limit: budget.monthly_limit,
            month: budget.month,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },

    async delete(id: string): Promise<void> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { error } = await client.from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ----------------------------------------------------
  // GOALS
  // ----------------------------------------------------
  goals: {
    async getAll(): Promise<Goal[]> {
      const client = getSupabase();
      if (!client) return [];
      const { data, error } = await client.from('goals').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((g: any) => {
        const target = Number(g.target_amount);
        const current = Number(g.current_amount);
        const remaining = Math.max(0, target - current);
        const progress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

        return {
          ...g,
          target_amount: target,
          current_amount: current,
          progress,
          remaining,
          isCompleted: current >= target,
        };
      });
    },

    async create(goal: Partial<Goal>): Promise<Goal> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Não autenticado.');

      const payload = {
        user_id: user.id,
        name: goal.name,
        target_amount: Number(goal.target_amount || 0),
        current_amount: Number(goal.current_amount || 0),
        deadline: goal.deadline || null,
        icon: goal.icon || 'Target',
        color: goal.color || '#10b981',
      };

      const { data, error } = await client.from('goals').insert(payload).select().single();
      if (error) throw error;
      return {
        ...data,
        target_amount: Number(data.target_amount),
        current_amount: Number(data.current_amount),
        progress: 0,
        remaining: Number(data.target_amount),
        isCompleted: false,
      };
    },

    async update(id: string, updates: Partial<Goal>): Promise<Goal> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { data, error } = await client.from('goals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async addProgress(id: string, amount: number): Promise<Goal> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');

      const { data: goal } = await client.from('goals').select('current_amount').eq('id', id).single();
      const newAmount = Number(goal?.current_amount || 0) + Number(amount);

      const { data, error } = await client
        .from('goals')
        .update({ current_amount: newAmount })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado.');
      const { error } = await client.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ----------------------------------------------------
  // DASHBOARD SUMMARY & REPORTS
  // ----------------------------------------------------
  reports: {
    async getSummary(period: string = 'month', customRange?: { start: string; end: string }): Promise<DashboardSummary> {
      const accounts = await supabaseApi.accounts.getAll();
      const totalBalance = accounts.reduce((acc, a) => acc + (a.is_active ? a.current_balance : 0), 0);

      const now = new Date();
      let startStr = '';
      let endStr = '';

      if (customRange?.start && customRange?.end) {
        startStr = customRange.start;
        endStr = customRange.end;
      } else {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        startStr = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      }

      const txs = await supabaseApi.transactions.getAll({
        startDate: startStr,
        endDate: endStr,
      });

      const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const netBalance = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

      // Category breakdown
      const expCatMap = new Map<string, any>();
      const incCatMap = new Map<string, any>();

      for (const t of txs) {
        if (t.type === 'expense') {
          const catId = t.category_id || 'sem-categoria';
          const name = t.category_name || 'Sem Categoria';
          const icon = t.category_icon || 'MoreHorizontal';
          const color = t.category_color || '#94a3b8';

          const existing = expCatMap.get(catId) || { id: catId, name, icon, color, amount: 0, count: 0 };
          existing.amount += t.amount;
          existing.count += 1;
          expCatMap.set(catId, existing);
        } else if (t.type === 'income') {
          const catId = t.category_id || 'sem-categoria';
          const name = t.category_name || 'Sem Categoria';
          const icon = t.category_icon || 'MoreHorizontal';
          const color = t.category_color || '#94a3b8';

          const existing = incCatMap.get(catId) || { id: catId, name, icon, color, amount: 0, count: 0 };
          existing.amount += t.amount;
          existing.count += 1;
          incCatMap.set(catId, existing);
        }
      }

      const categoryExpenses = Array.from(expCatMap.values()).map(cat => ({
        ...cat,
        percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
      })).sort((a, b) => b.amount - a.amount);

      const categoryIncomes = Array.from(incCatMap.values()).sort((a, b) => b.amount - a.amount);

      const recentTransactions = await supabaseApi.transactions.getAll({ limit: 10 });

      return {
        period,
        range: { start: startStr, end: endStr },
        totalBalance,
        totalIncome,
        totalExpense,
        netBalance,
        savingsRate,
        comparison: {
          prevIncome: 0,
          prevExpense: 0,
          incomeDiff: 0,
          expenseDiff: 0,
        },
        categoryExpenses,
        categoryIncomes,
        monthlyTimeline: [],
        recentTransactions,
      };
    },

    async resetData(): Promise<{ success: boolean; message: string }> {
      const client = getSupabase();
      if (!client) throw new Error('Supabase não conectado');
      const { data: { user } } = await client.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      await client.from('transactions').delete().eq('user_id', userId);
      await client.from('recurring_rules').delete().eq('user_id', userId);
      await client.from('budgets').delete().eq('user_id', userId);
      await client.from('goals').delete().eq('user_id', userId);
      await client.from('accounts').update({ current_balance: 0, initial_balance: 0 }).eq('user_id', userId);

      try {
        const { localDb } = await import('./storage');
        localDb.resetData();
      } catch {}

      return { success: true, message: 'Todos os lançamentos e saldos foram zerados com sucesso!' };
    },
  },
};
