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

// Default categories
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Alimentação', icon: 'Utensils', color: '#f97316' },
  { name: 'Mercado', icon: 'ShoppingCart', color: '#06b6d4' },
  { name: 'Moradia', icon: 'Home', color: '#8b5cf6' },
  { name: 'Transporte', icon: 'Car', color: '#3b82f6' },
  { name: 'Saúde', icon: 'HeartPulse', color: '#ec4899' },
  { name: 'Educação', icon: 'GraduationCap', color: '#14b8a6' },
  { name: 'Lazer', icon: 'Gamepad2', color: '#eab308' },
  { name: 'Compras', icon: 'ShoppingBag', color: '#f43f5e' },
  { name: 'Assinaturas', icon: 'Repeat', color: '#6366f1' },
  { name: 'Contas domésticas', icon: 'Receipt', color: '#64748b' },
  { name: 'Cartão de crédito', icon: 'CreditCard', color: '#dc2626' },
  { name: 'Outros', icon: 'MoreHorizontal', color: '#94a3b8' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salário', icon: 'Briefcase', color: '#10b981' },
  { name: 'Trabalho extra', icon: 'TrendingUp', color: '#059669' },
  { name: 'Vendas', icon: 'Tag', color: '#0d9488' },
  { name: 'Investimentos', icon: 'LineChart', color: '#2563eb' },
  { name: 'Benefícios', icon: 'Gift', color: '#8b5cf6' },
  { name: 'Outros', icon: 'PlusCircle', color: '#64748b' },
];

export const DEFAULT_ACCOUNTS = [
  { name: 'Conta Principal', type: 'checking' as const, icon: 'Building2', color: '#059669', initial_balance: 0 },
  { name: 'Carteira (Dinheiro)', type: 'cash' as const, icon: 'Wallet', color: '#10b981', initial_balance: 0 },
  { name: 'Cartão de Crédito', type: 'credit_card' as const, icon: 'CreditCard', color: '#6366f1', initial_balance: 0 },
  { name: 'Reserva Financeira', type: 'savings' as const, icon: 'PiggyBank', color: '#f59e0b', initial_balance: 0 },
];

function generateId(): string {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

async function hashPassword(password: string): Promise<string> {
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_coinvy_salt_2026');
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback
  return btoa(password + '_coinvy_salt');
}

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
}

interface StoredUser extends User {
  password_hash: string;
}

export const localDb = {
  // Get active user ID
  getCurrentUserId(): string {
    const user = getStored<User | null>('coinvy_user', null);
    return user ? user.id : '';
  },

  // Seed default categories & accounts for a user
  seedUserData(userId: string) {
    const now = new Date().toISOString();
    const categories = getStored<Category[]>('coinvy_db_categories', []);
    const accounts = getStored<Account[]>('coinvy_db_accounts', []);

    // Check if user already has categories
    if (!categories.some((c) => c.user_id === userId)) {
      for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        categories.push({
          id: generateId(),
          user_id: userId,
          name: cat.name,
          type: 'expense',
          icon: cat.icon,
          color: cat.color,
          is_default: 1,
          created_at: now,
        });
      }
      for (const cat of DEFAULT_INCOME_CATEGORIES) {
        categories.push({
          id: generateId(),
          user_id: userId,
          name: cat.name,
          type: 'income',
          icon: cat.icon,
          color: cat.color,
          is_default: 1,
          created_at: now,
        });
      }
      setStored('coinvy_db_categories', categories);
    }

    // Check if user already has accounts
    if (!accounts.some((a) => a.user_id === userId)) {
      for (const acc of DEFAULT_ACCOUNTS) {
        accounts.push({
          id: generateId(),
          user_id: userId,
          name: acc.name,
          type: acc.type,
          color: acc.color,
          icon: acc.icon,
          initial_balance: acc.initial_balance,
          current_balance: acc.initial_balance,
          is_active: 1,
          created_at: now,
        });
      }
      setStored('coinvy_db_accounts', accounts);
    }
  },

  // Recalculates balance for an account
  recalculateAccountBalance(accountId: string): number {
    const accounts = getStored<Account[]>('coinvy_db_accounts', []);
    const accIndex = accounts.findIndex((a) => a.id === accountId);
    if (accIndex === -1) return 0;

    const txs = getStored<Transaction[]>('coinvy_db_transactions', []);
    const account = accounts[accIndex];

    const income = txs
      .filter((t) => t.account_id === accountId && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = txs
      .filter((t) => t.account_id === accountId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const transferOut = txs
      .filter((t) => t.account_id === accountId && t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);

    const transferIn = txs
      .filter((t) => t.destination_account_id === accountId && t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);

    const exact = Number((account.initial_balance + income - expense - transferOut + transferIn).toFixed(2));
    accounts[accIndex].current_balance = exact;
    setStored('coinvy_db_accounts', accounts);
    return exact;
  },

  // AUTH
  async register(data: { name: string; email: string; password: string }): Promise<{ token: string; user: User }> {
    const users = getStored<StoredUser[]>('coinvy_db_users', []);
    const emailClean = data.email.toLowerCase().trim();

    if (users.some((u) => u.email === emailClean)) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const userId = generateId();
    const passwordHash = await hashPassword(data.password);
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id: userId,
      name: data.name.trim(),
      email: emailClean,
      password_hash: passwordHash,
      currency: 'BRL',
      date_format: 'DD/MM/YYYY',
      hide_balances: 0,
      theme: 'light',
    };

    users.push(newUser);
    setStored('coinvy_db_users', users);

    // Seed default categories and accounts
    this.seedUserData(userId);

    const token = 'token_' + userId + '_' + Date.now();
    const publicUser: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      currency: newUser.currency,
      date_format: newUser.date_format,
      hide_balances: newUser.hide_balances,
      theme: newUser.theme,
    };

    return { token, user: publicUser };
  },

  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const users = getStored<StoredUser[]>('coinvy_db_users', []);
    const emailClean = credentials.email.toLowerCase().trim();
    const user = users.find((u) => u.email === emailClean);

    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const passwordHash = await hashPassword(credentials.password);
    if (user.password_hash !== passwordHash) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const token = 'token_' + user.id + '_' + Date.now();
    const publicUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      date_format: user.date_format,
      hide_balances: user.hide_balances,
      theme: user.theme,
    };

    return { token, user: publicUser };
  },

  async demo(): Promise<{ token: string; user: User; isDemo: boolean }> {
    const demoEmail = 'demo@coinvy.com.br';
    const users = getStored<StoredUser[]>('coinvy_db_users', []);
    let user = users.find((u) => u.email === demoEmail);

    if (!user) {
      const userId = 'demo_user_coinvy';
      const passwordHash = await hashPassword('demo123456');
      user = {
        id: userId,
        name: 'Demonstração COINVY',
        email: demoEmail,
        password_hash: passwordHash,
        currency: 'BRL',
        date_format: 'DD/MM/YYYY',
        hide_balances: 0,
        theme: 'light',
      };
      users.push(user);
      setStored('coinvy_db_users', users);

      this.seedUserData(userId);
      this.seedDemoTransactions(userId);
    }

    const token = 'token_demo_' + user.id;
    const publicUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      date_format: user.date_format,
      hide_balances: user.hide_balances,
      theme: user.theme,
    };

    return { token, user: publicUser, isDemo: true };
  },

  me(): { user: User } {
    const user = getStored<User | null>('coinvy_user', null);
    if (!user) {
      throw new Error('Não autenticado.');
    }
    return { user };
  },

  updateProfile(data: Partial<User>): { user: User } {
    const current = getStored<User | null>('coinvy_user', null);
    if (!current) throw new Error('Não autenticado.');

    const users = getStored<StoredUser[]>('coinvy_db_users', []);
    const idx = users.findIndex((u) => u.id === current.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...data };
      setStored('coinvy_db_users', users);
    }

    const updatedUser = { ...current, ...data };
    setStored('coinvy_user', updatedUser);
    return { user: updatedUser };
  },

  // ACCOUNTS
  listAccounts(): { accounts: Account[] } {
    const userId = this.getCurrentUserId();
    const accounts = getStored<Account[]>('coinvy_db_accounts', []).filter((a) => a.user_id === userId && a.is_active);
    const withRecalc = accounts.map((acc) => {
      const bal = this.recalculateAccountBalance(acc.id);
      return { ...acc, current_balance: bal };
    });
    return { accounts: withRecalc };
  },

  createAccount(data: any): { account: Account } {
    const userId = this.getCurrentUserId();
    const accounts = getStored<Account[]>('coinvy_db_accounts', []);
    const newAcc: Account = {
      id: generateId(),
      user_id: userId,
      name: data.name,
      type: data.type,
      color: data.color || '#059669',
      icon: data.icon || 'Wallet',
      initial_balance: data.initial_balance || 0,
      current_balance: data.initial_balance || 0,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    accounts.push(newAcc);
    setStored('coinvy_db_accounts', accounts);
    return { account: newAcc };
  },

  updateAccount(id: string, data: any): { account: Account } {
    const accounts = getStored<Account[]>('coinvy_db_accounts', []);
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Conta não encontrada.');

    accounts[idx] = { ...accounts[idx], ...data };
    setStored('coinvy_db_accounts', accounts);
    const bal = this.recalculateAccountBalance(id);
    return { account: { ...accounts[idx], current_balance: bal } };
  },

  deleteAccount(id: string): { success: boolean; message: string } {
    const accounts = getStored<Account[]>('coinvy_db_accounts', []);
    const filtered = accounts.filter((a) => a.id !== id);
    setStored('coinvy_db_accounts', filtered);
    return { success: true, message: 'Conta excluída.' };
  },

  // CATEGORIES
  listCategories(type?: 'income' | 'expense'): { categories: Category[] } {
    const userId = this.getCurrentUserId();
    let categories = getStored<Category[]>('coinvy_db_categories', []).filter((c) => c.user_id === userId);
    if (type) {
      categories = categories.filter((c) => c.type === type);
    }
    return { categories };
  },

  createCategory(data: any): { category: Category } {
    const userId = this.getCurrentUserId();
    const categories = getStored<Category[]>('coinvy_db_categories', []);
    const newCat: Category = {
      id: generateId(),
      user_id: userId,
      name: data.name,
      type: data.type,
      icon: data.icon || 'Tag',
      color: data.color || '#059669',
      is_default: 0,
      created_at: new Date().toISOString(),
    };
    categories.push(newCat);
    setStored('coinvy_db_categories', categories);
    return { category: newCat };
  },

  updateCategory(id: string, data: any): { category: Category } {
    const categories = getStored<Category[]>('coinvy_db_categories', []);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Categoria não encontrada.');

    categories[idx] = { ...categories[idx], ...data };
    setStored('coinvy_db_categories', categories);
    return { category: categories[idx] };
  },

  deleteCategory(id: string): { success: boolean } {
    const categories = getStored<Category[]>('coinvy_db_categories', []);
    const filtered = categories.filter((c) => c.id !== id);
    setStored('coinvy_db_categories', filtered);
    return { success: true };
  },

  // TRANSACTIONS
  listTransactions(params: any = {}): { transactions: Transaction[] } {
    const userId = this.getCurrentUserId();
    const txs = getStored<Transaction[]>('coinvy_db_transactions', []).filter((t) => t.user_id === userId);
    const cats = getStored<Category[]>('coinvy_db_categories', []);
    const accs = getStored<Account[]>('coinvy_db_accounts', []);

    const enriched = txs.map((t) => {
      const cat = cats.find((c) => c.id === t.category_id);
      const acc = accs.find((a) => a.id === t.account_id);
      const dest = accs.find((a) => a.id === t.destination_account_id);
      return {
        ...t,
        category_name: cat ? cat.name : null,
        category_icon: cat ? cat.icon : null,
        category_color: cat ? cat.color : null,
        account_name: acc ? acc.name : null,
        destination_account_name: dest ? dest.name : null,
      };
    });

    let filtered = enriched;
    if (params.type && params.type !== 'all') {
      filtered = filtered.filter((t) => t.type === params.type);
    }
    if (params.category_id && params.category_id !== 'all') {
      filtered = filtered.filter((t) => t.category_id === params.category_id);
    }
    if (params.account_id && params.account_id !== 'all') {
      filtered = filtered.filter((t) => t.account_id === params.account_id || t.destination_account_id === params.account_id);
    }
    if (params.start_date) {
      filtered = filtered.filter((t) => t.date >= params.start_date);
    }
    if (params.end_date) {
      filtered = filtered.filter((t) => t.date <= params.end_date);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((t) => t.description.toLowerCase().includes(s) || (t.notes && t.notes.toLowerCase().includes(s)));
    }

    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    return { transactions: filtered };
  },

  createTransaction(data: any): { transaction: Transaction } {
    const userId = this.getCurrentUserId();
    const txs = getStored<Transaction[]>('coinvy_db_transactions', []);
    const newTx: Transaction = {
      id: generateId(),
      user_id: userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      category_id: data.category_id || null,
      account_id: data.account_id,
      destination_account_id: data.destination_account_id || null,
      date: data.date,
      notes: data.notes || null,
      is_recurring: data.is_recurring ? 1 : 0,
      recurring_rule_id: data.recurring_rule_id || null,
      created_at: new Date().toISOString(),
    };
    txs.push(newTx);
    setStored('coinvy_db_transactions', txs);

    this.recalculateAccountBalance(data.account_id);
    if (data.destination_account_id) {
      this.recalculateAccountBalance(data.destination_account_id);
    }

    return { transaction: newTx };
  },

  updateTransaction(id: string, data: any): { transaction: Transaction } {
    const txs = getStored<Transaction[]>('coinvy_db_transactions', []);
    const idx = txs.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Movimentação não encontrada.');

    const oldAcc1 = txs[idx].account_id;
    const oldAcc2 = txs[idx].destination_account_id;

    txs[idx] = { ...txs[idx], ...data };
    setStored('coinvy_db_transactions', txs);

    this.recalculateAccountBalance(oldAcc1);
    if (oldAcc2) this.recalculateAccountBalance(oldAcc2);
    this.recalculateAccountBalance(data.account_id);
    if (data.destination_account_id) this.recalculateAccountBalance(data.destination_account_id);

    return { transaction: txs[idx] };
  },

  deleteTransaction(id: string): { success: boolean; message: string } {
    const txs = getStored<Transaction[]>('coinvy_db_transactions', []);
    const target = txs.find((t) => t.id === id);
    if (!target) throw new Error('Movimentação não encontrada.');

    const filtered = txs.filter((t) => t.id !== id);
    setStored('coinvy_db_transactions', filtered);

    this.recalculateAccountBalance(target.account_id);
    if (target.destination_account_id) {
      this.recalculateAccountBalance(target.destination_account_id);
    }

    return { success: true, message: 'Movimentação excluída.' };
  },

  duplicateTransaction(id: string): { transaction: Transaction } {
    const txs = getStored<Transaction[]>('coinvy_db_transactions', []);
    const target = txs.find((t) => t.id === id);
    if (!target) throw new Error('Movimentação não encontrada.');

    const newTx: Transaction = {
      ...target,
      id: generateId(),
      description: `${target.description} (Cópia)`,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    txs.push(newTx);
    setStored('coinvy_db_transactions', txs);

    this.recalculateAccountBalance(newTx.account_id);
    if (newTx.destination_account_id) this.recalculateAccountBalance(newTx.destination_account_id);

    return { transaction: newTx };
  },

  // RECURRING
  listRecurring(): { recurring_rules: RecurringRule[] } {
    const userId = this.getCurrentUserId();
    const rules = getStored<RecurringRule[]>('coinvy_db_recurring', []).filter((r) => r.user_id === userId);
    const cats = getStored<Category[]>('coinvy_db_categories', []);
    const accs = getStored<Account[]>('coinvy_db_accounts', []);

    const enriched = rules.map((r) => {
      const cat = cats.find((c) => c.id === r.category_id);
      const acc = accs.find((a) => a.id === r.account_id);
      return {
        ...r,
        category_name: cat ? cat.name : undefined,
        category_icon: cat ? cat.icon : undefined,
        category_color: cat ? cat.color : undefined,
        account_name: acc ? acc.name : undefined,
      };
    });
    return { recurring_rules: enriched };
  },

  createRecurring(data: any): { recurring_rule: RecurringRule } {
    const userId = this.getCurrentUserId();
    const rules = getStored<RecurringRule[]>('coinvy_db_recurring', []);
    const newRule: RecurringRule = {
      id: generateId(),
      user_id: userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      category_id: data.category_id || null,
      account_id: data.account_id,
      destination_account_id: data.destination_account_id || null,
      frequency: data.frequency,
      start_date: data.start_date,
      end_date: data.end_date || null,
      next_due_date: data.start_date,
      is_active: 1,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
    };
    rules.push(newRule);
    setStored('coinvy_db_recurring', rules);
    return { recurring_rule: newRule };
  },

  toggleRecurring(id: string): { success: boolean; is_active: number } {
    const rules = getStored<RecurringRule[]>('coinvy_db_recurring', []);
    const idx = rules.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Regra não encontrada.');

    rules[idx].is_active = rules[idx].is_active ? 0 : 1;
    setStored('coinvy_db_recurring', rules);
    return { success: true, is_active: Number(rules[idx].is_active) };
  },

  deleteRecurring(id: string): { success: boolean } {
    const rules = getStored<RecurringRule[]>('coinvy_db_recurring', []);
    setStored('coinvy_db_recurring', rules.filter((r) => r.id !== id));
    return { success: true };
  },

  processRecurring(): { processedCount: number; processedIds: string[] } {
    return { processedCount: 0, processedIds: [] };
  },

  // BUDGETS
  listBudgets(month?: string): { month: string; budgets: Budget[] } {
    const userId = this.getCurrentUserId();
    const currMonth = month || new Date().toISOString().slice(0, 7);
    const budgets = getStored<Budget[]>('coinvy_db_budgets', []).filter((b) => b.user_id === userId && (b.month === currMonth || b.month === 'global'));
    const txs = getStored<Transaction[]>('coinvy_db_transactions', []).filter((t) => t.user_id === userId && t.type === 'expense' && t.date.startsWith(currMonth));
    const cats = getStored<Category[]>('coinvy_db_categories', []);

    const enriched = budgets.map((b) => {
      const cat = cats.find((c) => c.id === b.category_id);
      let spent = 0;
      if (b.category_id) {
        spent = txs.filter((t) => t.category_id === b.category_id).reduce((sum, t) => sum + t.amount, 0);
      } else {
        spent = txs.reduce((sum, t) => sum + t.amount, 0);
      }

      const remaining = Math.max(0, Number((b.monthly_limit - spent).toFixed(2)));
      const percentage = Number(((spent / b.monthly_limit) * 100).toFixed(1));
      const isExceeded = spent > b.monthly_limit;
      const isNearLimit = percentage >= 80 && !isExceeded;

      return {
        ...b,
        category_name: cat ? cat.name : 'Geral',
        category_icon: cat ? cat.icon : 'Target',
        category_color: cat ? cat.color : '#059669',
        spent: Number(spent.toFixed(2)),
        remaining,
        percentage,
        isExceeded,
        isNearLimit,
      };
    });

    return { month: currMonth, budgets: enriched };
  },

  upsertBudget(data: any): { budget: Budget } {
    const userId = this.getCurrentUserId();
    const budgets = getStored<Budget[]>('coinvy_db_budgets', []);
    const idx = budgets.findIndex((b) => b.user_id === userId && b.month === data.month && b.category_id === (data.category_id || null));

    if (idx !== -1) {
      budgets[idx].monthly_limit = data.monthly_limit;
      setStored('coinvy_db_budgets', budgets);
      return { budget: budgets[idx] };
    } else {
      const newBudget: Budget = {
        id: generateId(),
        user_id: userId,
        category_id: data.category_id || null,
        monthly_limit: data.monthly_limit,
        month: data.month,
        created_at: new Date().toISOString(),
        spent: 0,
        remaining: data.monthly_limit,
        percentage: 0,
        isExceeded: false,
        isNearLimit: false,
      };
      budgets.push(newBudget);
      setStored('coinvy_db_budgets', budgets);
      return { budget: newBudget };
    }
  },

  deleteBudget(id: string): { success: boolean } {
    const budgets = getStored<Budget[]>('coinvy_db_budgets', []);
    setStored('coinvy_db_budgets', budgets.filter((b) => b.id !== id));
    return { success: true };
  },

  // GOALS
  listGoals(): { goals: Goal[] } {
    const userId = this.getCurrentUserId();
    const goals = getStored<Goal[]>('coinvy_db_goals', []).filter((g) => g.user_id === userId);
    const enriched = goals.map((g) => {
      const progress = Math.min(100, Number(((g.current_amount / g.target_amount) * 100).toFixed(1)));
      const remaining = Math.max(0, Number((g.target_amount - g.current_amount).toFixed(2)));
      return {
        ...g,
        progress,
        remaining,
        isCompleted: g.current_amount >= g.target_amount,
      };
    });
    return { goals: enriched };
  },

  createGoal(data: any): { goal: Goal } {
    const userId = this.getCurrentUserId();
    const goals = getStored<Goal[]>('coinvy_db_goals', []);
    const newGoal: Goal = {
      id: generateId(),
      user_id: userId,
      name: data.name,
      target_amount: data.target_amount,
      current_amount: data.current_amount || 0,
      deadline: data.deadline || null,
      icon: data.icon || 'Shield',
      color: data.color || '#059669',
      created_at: new Date().toISOString(),
      progress: 0,
      remaining: data.target_amount,
      isCompleted: false,
    };
    goals.push(newGoal);
    setStored('coinvy_db_goals', goals);
    return { goal: newGoal };
  },

  contributeGoal(id: string, data: any): { goal: Goal } {
    const goals = getStored<Goal[]>('coinvy_db_goals', []);
    const idx = goals.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error('Meta não encontrada.');

    goals[idx].current_amount = Math.max(0, Number((goals[idx].current_amount + data.amount).toFixed(2)));
    setStored('coinvy_db_goals', goals);

    const progress = Math.min(100, Number(((goals[idx].current_amount / goals[idx].target_amount) * 100).toFixed(1)));
    return {
      goal: {
        ...goals[idx],
        progress,
        remaining: Math.max(0, Number((goals[idx].target_amount - goals[idx].current_amount).toFixed(2))),
        isCompleted: goals[idx].current_amount >= goals[idx].target_amount,
      },
    };
  },

  deleteGoal(id: string): { success: boolean } {
    const goals = getStored<Goal[]>('coinvy_db_goals', []);
    setStored('coinvy_db_goals', goals.filter((g) => g.id !== id));
    return { success: true };
  },

  // SUMMARY & REPORTS
  getSummary(params: any = {}): DashboardSummary {
    const userId = this.getCurrentUserId();
    const accRes = this.listAccounts();
    const totalBalance = accRes.accounts.reduce((sum, a) => sum + a.current_balance, 0);

    const txRes = this.listTransactions(params);
    const txs = txRes.transactions;

    const totalIncome = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = Number((totalIncome - totalExpense).toFixed(2));
    const savingsRate = totalIncome > 0 ? Number(((netBalance / totalIncome) * 100).toFixed(1)) : 0;

    // Group expenses by category
    const expMap = new Map<string, { id: string; name: string; icon: string; color: string; amount: number; count: number }>();
    txs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const catId = t.category_id || 'other';
        const existing = expMap.get(catId) || {
          id: catId,
          name: t.category_name || 'Outros',
          icon: t.category_icon || 'MoreHorizontal',
          color: t.category_color || '#94a3b8',
          amount: 0,
          count: 0,
        };
        existing.amount += t.amount;
        existing.count += 1;
        expMap.set(catId, existing);
      });

    const categoryExpenses = Array.from(expMap.values()).map((c) => ({
      ...c,
      amount: Number(c.amount.toFixed(2)),
      percentage: totalExpense > 0 ? Number(((c.amount / totalExpense) * 100).toFixed(1)) : 0,
    }));
    categoryExpenses.sort((a, b) => b.amount - a.amount);

    // Monthly timeline for the last 6 months
    const now = new Date();
    const monthNamesPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const allUserTxs = getStored<Transaction[]>('coinvy_db_transactions', []).filter((t) => t.user_id === userId);
    const monthlyTimeline = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = `${monthNamesPt[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;

      const mIncome = allUserTxs
        .filter((t) => t.date.startsWith(mStr) && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const mExpense = allUserTxs
        .filter((t) => t.date.startsWith(mStr) && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyTimeline.push({
        monthKey: mStr,
        label: mLabel,
        income: Number(mIncome.toFixed(2)),
        expense: Number(mExpense.toFixed(2)),
        net: Number((mIncome - mExpense).toFixed(2)),
      });
    }

    return {
      period: params.period || 'this_month',
      range: { start: '', end: '' },
      totalBalance: Number(totalBalance.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      netBalance,
      savingsRate,
      comparison: { prevIncome: 0, prevExpense: 0, incomeDiff: 0, expenseDiff: 0 },
      categoryExpenses,
      categoryIncomes: [],
      monthlyTimeline,
      recentTransactions: txs.slice(0, 6),
    };
  },

  // Seed realistic demo data
  seedDemoTransactions(userId: string) {
    const accRes = this.listAccounts();
    const catRes = this.listCategories();
    const accounts = accRes.accounts;
    const categories = catRes.categories;

    const mainAcc = accounts[0];
    const cashAcc = accounts[1] || accounts[0];
    const savingsAcc = accounts[3] || accounts[0];

    const getCat = (name: string) => categories.find((c) => c.name === name)?.id || null;
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    const demoTxs = [
      { type: 'income' as const, amount: 5500.0, desc: 'Salário Mensal', cat: getCat('Salário'), acc: mainAcc.id, days: 16 },
      { type: 'income' as const, amount: 650.0, desc: 'Projeto Freelance', cat: getCat('Trabalho extra'), acc: mainAcc.id, days: 8 },
      { type: 'income' as const, amount: 142.5, desc: 'Rendimentos CDB', cat: getCat('Investimentos'), acc: savingsAcc.id, days: 5 },
      { type: 'expense' as const, amount: 1450.0, desc: 'Aluguel do Apartamento', cat: getCat('Moradia'), acc: mainAcc.id, days: 15 },
      { type: 'expense' as const, amount: 580.4, desc: 'Supermercado Mensal', cat: getCat('Mercado'), acc: mainAcc.id, days: 12 },
      { type: 'expense' as const, amount: 220.0, desc: 'Conta de Energia (Enel)', cat: getCat('Contas domésticas'), acc: mainAcc.id, days: 10 },
      { type: 'expense' as const, amount: 99.9, desc: 'Internet Fibra 500MB', cat: getCat('Contas domésticas'), acc: mainAcc.id, days: 9 },
      { type: 'expense' as const, amount: 185.0, desc: 'Abastecimento Carro', cat: getCat('Transporte'), acc: mainAcc.id, days: 7 },
      { type: 'expense' as const, amount: 84.5, desc: 'Almoço Restaurante', cat: getCat('Alimentação'), acc: cashAcc.id, days: 4 },
      { type: 'expense' as const, amount: 55.9, desc: 'Netflix & Spotify', cat: getCat('Assinaturas'), acc: mainAcc.id, days: 3 },
      { type: 'expense' as const, amount: 130.0, desc: 'Farmácia e Vitaminas', cat: getCat('Saúde'), acc: mainAcc.id, days: 2 },
      { type: 'expense' as const, amount: 62.0, desc: 'Café e Lanche da Tarde', cat: getCat('Alimentação'), acc: cashAcc.id, days: 1 },
      { type: 'expense' as const, amount: 110.0, desc: 'Cinema e Pipoca', cat: getCat('Lazer'), acc: mainAcc.id, days: 0 },
    ];

    const txs = getStored<Transaction[]>('coinvy_db_transactions', []);
    for (const t of demoTxs) {
      const d = new Date(today);
      d.setDate(d.getDate() - t.days);
      txs.push({
        id: generateId(),
        user_id: userId,
        type: t.type,
        amount: t.amount,
        description: t.desc,
        category_id: t.cat,
        account_id: t.acc,
        date: formatYMD(d),
        created_at: new Date().toISOString(),
      });
    }
    setStored('coinvy_db_transactions', txs);

    // Recalculate accounts
    for (const a of accounts) {
      this.recalculateAccountBalance(a.id);
    }

    // Set demo budgets
    const currMonth = today.toISOString().slice(0, 7);
    this.upsertBudget({ category_id: null, monthly_limit: 3500, month: currMonth });
    if (getCat('Alimentação')) this.upsertBudget({ category_id: getCat('Alimentação'), monthly_limit: 600, month: currMonth });
    if (getCat('Mercado')) this.upsertBudget({ category_id: getCat('Mercado'), monthly_limit: 800, month: currMonth });

    // Set demo goals
    const goals = getStored<Goal[]>('coinvy_db_goals', []);
    if (!goals.some((g) => g.user_id === userId)) {
      goals.push({
        id: generateId(),
        user_id: userId,
        name: 'Reserva de Emergência (6 Meses)',
        target_amount: 15000,
        current_amount: 4800,
        deadline: '2027-06-30',
        icon: 'Shield',
        color: '#059669',
        created_at: new Date().toISOString(),
        progress: 32,
        remaining: 10200,
        isCompleted: false,
      });
      goals.push({
        id: generateId(),
        user_id: userId,
        name: 'Viagem de Férias para Praia',
        target_amount: 4000,
        current_amount: 2650,
        deadline: '2026-12-20',
        icon: 'Plane',
        color: '#3b82f6',
        created_at: new Date().toISOString(),
        progress: 66.3,
        remaining: 1350,
        isCompleted: false,
      });
      setStored('coinvy_db_goals', goals);
    }
  },

  resetData(): { success: boolean; message: string } {
    const userId = this.getCurrentUserId();
    const txs = getStored<Transaction[]>('coinvy_db_transactions', []).filter((t) => t.user_id !== userId);
    setStored('coinvy_db_transactions', txs);

    const budgets = getStored<Budget[]>('coinvy_db_budgets', []).filter((b) => b.user_id !== userId);
    setStored('coinvy_db_budgets', budgets);

    const goals = getStored<Goal[]>('coinvy_db_goals', []).filter((g) => g.user_id !== userId);
    setStored('coinvy_db_goals', goals);

    const recurring = getStored<RecurringRule[]>('coinvy_db_recurring', []).filter((r) => r.user_id !== userId);
    setStored('coinvy_db_recurring', recurring);

    const accounts = getStored<Account[]>('coinvy_db_accounts', []);
    accounts.forEach((a) => {
      if (a.user_id === userId) {
        a.current_balance = a.initial_balance;
      }
    });
    setStored('coinvy_db_accounts', accounts);

    return { success: true, message: 'Todos os lançamentos foram limpos.' };
  },
};
