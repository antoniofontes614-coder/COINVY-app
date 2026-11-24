import { Router, Response } from 'express';
import { db, recalculateAccountBalance } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { seedDemoTransactions } from '../db/seeds';

const router = Router();
router.use(authMiddleware);

function getDateRangeForPeriod(period: string, customStart?: string, customEnd?: string): { start: string; end: string; prevStart: string; prevEnd: string } {
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  if (period === 'today') {
    const todayStr = formatYMD(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = formatYMD(yesterday);
    return { start: todayStr, end: todayStr, prevStart: yestStr, prevEnd: yestStr };
  }

  if (period === 'this_week') {
    const currentDay = now.getDay(); // 0 is Sunday
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const prevSunday = new Date(monday);
    prevSunday.setDate(monday.getDate() - 1);

    return {
      start: formatYMD(monday),
      end: formatYMD(sunday),
      prevStart: formatYMD(prevMonday),
      prevEnd: formatYMD(prevSunday),
    };
  }

  if (period === 'last_month') {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthLastDate = new Date(now.getFullYear(), now.getMonth(), 0);

    const twoMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const twoMonthsAgoLastDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);

    return {
      start: formatYMD(prevMonthDate),
      end: formatYMD(prevMonthLastDate),
      prevStart: formatYMD(twoMonthsAgoDate),
      prevEnd: formatYMD(twoMonthsAgoLastDate),
    };
  }

  if (period === 'custom' && customStart && customEnd) {
    return {
      start: customStart,
      end: customEnd,
      prevStart: customStart,
      prevEnd: customEnd,
    };
  }

  // Default: 'this_month'
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const prevMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    start: formatYMD(firstDay),
    end: formatYMD(lastDay),
    prevStart: formatYMD(prevMonthFirstDay),
    prevEnd: formatYMD(prevMonthLastDay),
  };
}

// Summary for Dashboard and Reports
router.get('/summary', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const period = (req.query.period as string) || 'this_month';
  const customStart = req.query.start_date as string | undefined;
  const customEnd = req.query.end_date as string | undefined;

  const { start, end, prevStart, prevEnd } = getDateRangeForPeriod(period, customStart, customEnd);

  // Total balance across all active accounts
  const accounts = db.prepare('SELECT id, current_balance FROM accounts WHERE user_id = ? AND is_active = 1').all(userId) as any[];
  const totalBalance = accounts.reduce((acc, a) => {
    const bal = recalculateAccountBalance(a.id);
    return acc + bal;
  }, 0);

  // Income & Expense in current period
  const currentIncomeRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM transactions 
    WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?
  `).get(userId, start, end) as { total: number; count: number };

  const currentExpenseRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM transactions 
    WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
  `).get(userId, start, end) as { total: number; count: number };

  // Previous period for comparison
  const prevIncomeRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions 
    WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?
  `).get(userId, prevStart, prevEnd) as { total: number };

  const prevExpenseRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions 
    WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
  `).get(userId, prevStart, prevEnd) as { total: number };

  const totalIncome = Number(currentIncomeRow.total.toFixed(2));
  const totalExpense = Number(currentExpenseRow.total.toFixed(2));
  const netBalance = Number((totalIncome - totalExpense).toFixed(2));
  const savingsRate = totalIncome > 0 ? Number(((netBalance / totalIncome) * 100).toFixed(1)) : 0;

  // Expense by category
  const categoryExpenses = db.prepare(`
    SELECT 
      c.id,
      COALESCE(c.name, 'Outros') as name,
      COALESCE(c.icon, 'MoreHorizontal') as icon,
      COALESCE(c.color, '#94a3b8') as color,
      COALESCE(SUM(t.amount), 0) as amount,
      COUNT(t.id) as count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY amount DESC
  `).all(userId, start, end) as any[];

  const categoryExpensesWithPercent = categoryExpenses.map(c => ({
    ...c,
    amount: Number(c.amount.toFixed(2)),
    percentage: totalExpense > 0 ? Number(((c.amount / totalExpense) * 100).toFixed(1)) : 0,
  }));

  // Income by category
  const categoryIncomes = db.prepare(`
    SELECT 
      c.id,
      COALESCE(c.name, 'Outros') as name,
      COALESCE(c.icon, 'PlusCircle') as icon,
      COALESCE(c.color, '#10b981') as color,
      COALESCE(SUM(t.amount), 0) as amount,
      COUNT(t.id) as count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'income' AND t.date >= ? AND t.date <= ?
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY amount DESC
  `).all(userId, start, end) as any[];

  // Monthly timeline for the last 6 months
  const monthlyTimeline = [];
  const now = new Date();
  const monthNamesPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mLabel = `${monthNamesPt[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    const mStart = `${mStr}-01`;
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

    const inc = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?
    `).get(userId, mStart, mEnd) as { total: number };

    const exp = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
    `).get(userId, mStart, mEnd) as { total: number };

    monthlyTimeline.push({
      monthKey: mStr,
      label: mLabel,
      income: Number(inc.total.toFixed(2)),
      expense: Number(exp.total.toFixed(2)),
      net: Number((inc.total - exp.total).toFixed(2)),
    });
  }

  // Recent 5 transactions for dashboard widget
  const recentTransactions = db.prepare(`
    SELECT 
      t.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      a.name as account_name,
      da.name as destination_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts da ON t.destination_account_id = da.id
    WHERE t.user_id = ?
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 6
  `).all(userId);

  return res.json({
    period,
    range: { start, end },
    totalBalance: Number(totalBalance.toFixed(2)),
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate,
    comparison: {
      prevIncome: Number(prevIncomeRow.total.toFixed(2)),
      prevExpense: Number(prevExpenseRow.total.toFixed(2)),
      incomeDiff: Number((totalIncome - prevIncomeRow.total).toFixed(2)),
      expenseDiff: Number((totalExpense - prevExpenseRow.total).toFixed(2)),
    },
    categoryExpenses: categoryExpensesWithPercent,
    categoryIncomes,
    monthlyTimeline,
    recentTransactions,
  });
});

// CSV Export
router.get('/export/csv', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const transactions = db.prepare(`
    SELECT 
      t.date,
      t.type,
      t.description,
      t.amount,
      c.name as category,
      a.name as account,
      da.name as destination_account,
      t.notes
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts da ON t.destination_account_id = da.id
    WHERE t.user_id = ?
    ORDER BY t.date DESC, t.created_at DESC
  `).all(userId) as any[];

  const typeLabels: Record<string, string> = {
    income: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência',
  };

  const rows = [
    ['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Categoria', 'Conta', 'Conta Destino', 'Observações'].join(';')
  ];

  for (const t of transactions) {
    const [y, m, d] = t.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const formattedAmount = t.amount.toFixed(2).replace('.', ',');
    const typeLabel = typeLabels[t.type] || t.type;
    const dest = t.destination_account || '-';
    const cat = t.category || '-';
    const notes = (t.notes || '').replace(/;/g, ' ');

    rows.push([
      formattedDate,
      typeLabel,
      `"${t.description.replace(/"/g, '""')}"`,
      formattedAmount,
      `"${cat}"`,
      `"${t.account}"`,
      `"${dest}"`,
      `"${notes}"`
    ].join(';'));
  }

  const csvContent = '\uFEFF' + rows.join('\r\n'); // Add BOM for Excel UTF-8 compatibility
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="coinvy_movimentacoes.csv"');
  return res.send(csvContent);
});

// JSON Backup Export
router.get('/export/json', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const user = db.prepare('SELECT id, name, email, currency, date_format, theme FROM users WHERE id = ?').get(userId);
  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
  const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(userId);
  const recurring = db.prepare('SELECT * FROM recurring_rules WHERE user_id = ?').all(userId);
  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(userId);
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);

  return res.json({
    exportDate: new Date().toISOString(),
    version: '1.0',
    data: {
      user,
      accounts,
      categories,
      transactions,
      recurring,
      budgets,
      goals,
    },
  });
});

// Clear all demo/user transactions to start fresh from zero
router.post('/reset-data', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const reset = db.transaction(() => {
      db.prepare('DELETE FROM goal_contributions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM recurring_rules WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
      
      // Reset account balances to initial balance
      db.prepare('UPDATE accounts SET current_balance = initial_balance WHERE user_id = ?').run(userId);
    });

    reset();

    return res.json({ success: true, message: 'Todos os lançamentos foram limpos. Pronto para começar do zero!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Load demonstration data
router.post('/load-demo', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    seedDemoTransactions(userId);
    return res.json({ success: true, message: 'Dados de demonstração carregados com sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
