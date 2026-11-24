export type TransactionType = 'income' | 'expense' | 'transfer';

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  date_format: string;
  hide_balances: number | boolean;
  theme: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'cash' | 'savings' | 'credit_card' | 'investment';
  color: string;
  icon: string;
  initial_balance: number;
  current_balance: number;
  is_active: number | boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  is_default: number | boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id?: string | null;
  account_id: string;
  destination_account_id?: string | null;
  date: string;
  notes?: string | null;
  is_recurring?: number | boolean;
  recurring_rule_id?: string | null;
  created_at: string;

  // Joined fields
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  account_name?: string | null;
  account_icon?: string | null;
  account_color?: string | null;
  destination_account_name?: string | null;
  destination_account_icon?: string | null;
  destination_account_color?: string | null;
}

export interface RecurringRule {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id?: string | null;
  account_id: string;
  destination_account_id?: string | null;
  frequency: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  next_due_date: string;
  last_processed_date?: string | null;
  is_active: number | boolean;
  notes?: string | null;
  created_at: string;

  // Joined fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
  destination_account_name?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id?: string | null;
  monthly_limit: number;
  month: string;
  created_at: string;

  category_name?: string;
  category_icon?: string;
  category_color?: string;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
  isNearLimit: boolean;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string | null;
  icon: string;
  color: string;
  created_at: string;
  progress: number;
  remaining: number;
  isCompleted: boolean;
}

export interface DashboardSummary {
  period: string;
  range: { start: string; end: string };
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  comparison: {
    prevIncome: number;
    prevExpense: number;
    incomeDiff: number;
    expenseDiff: number;
  };
  categoryExpenses: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  categoryIncomes: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    amount: number;
    count: number;
  }>;
  monthlyTimeline: Array<{
    monthKey: string;
    label: string;
    income: number;
    expense: number;
    net: number;
  }>;
  recentTransactions: Transaction[];
}
