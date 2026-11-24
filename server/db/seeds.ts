import { db } from './database';
import crypto from 'crypto';

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
  { name: 'Conta Principal', type: 'checking', icon: 'Building2', color: '#059669', initial_balance: 0 },
  { name: 'Carteira (Dinheiro)', type: 'cash', icon: 'Wallet', color: '#10b981', initial_balance: 0 },
  { name: 'Cartão de Crédito', type: 'credit_card', icon: 'CreditCard', color: '#6366f1', initial_balance: 0 },
  { name: 'Reserva Financeira', type: 'savings', icon: 'PiggyBank', color: '#f59e0b', initial_balance: 0 },
];

export function seedUserData(userId: string) {
  const insertCat = db.prepare(`
    INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, user_id, name, type, color, icon, initial_balance, current_balance, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const now = new Date().toISOString();

  const insertMany = db.transaction(() => {
    // Seed expense categories
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      insertCat.run(crypto.randomUUID(), userId, cat.name, 'expense', cat.icon, cat.color, now);
    }
    // Seed income categories
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      insertCat.run(crypto.randomUUID(), userId, cat.name, 'income', cat.icon, cat.color, now);
    }
    // Seed accounts
    for (const acc of DEFAULT_ACCOUNTS) {
      insertAccount.run(
        crypto.randomUUID(),
        userId,
        acc.name,
        acc.type,
        acc.color,
        acc.icon,
        acc.initial_balance,
        acc.initial_balance,
        now
      );
    }
  });

  insertMany();
}

/**
 * Creates optional demonstration data for testing the UI
 * Clearly labeled and easy to remove anytime via the Settings panel.
 */
export function seedDemoTransactions(userId: string) {
  const accounts = db.prepare('SELECT id, name FROM accounts WHERE user_id = ?').all(userId) as { id: string; name: string }[];
  const categories = db.prepare('SELECT id, name, type FROM categories WHERE user_id = ?').all(userId) as { id: string; name: string; type: string }[];

  const mainAccount = accounts.find(a => a.name.includes('Conta') || a.name.includes('Principal')) || accounts[0];
  const cashAccount = accounts.find(a => a.name.includes('Carteira')) || accounts[1] || accounts[0];
  const savingsAccount = accounts.find(a => a.name.includes('Reserva')) || accounts[2] || accounts[0];

  const catMap = new Map(categories.map(c => [c.name, c.id]));

  const insertTx = db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, destination_account_id, date, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  const txs = [
    // Income
    { type: 'income', amount: 5500.00, desc: 'Salário Mensal', cat: 'Salário', acc: mainAccount.id, daysAgo: 16, notes: 'Salário do mês creditado' },
    { type: 'income', amount: 650.00, desc: 'Projeto Freelance', cat: 'Trabalho extra', acc: mainAccount.id, daysAgo: 8, notes: 'Design de Landing Page' },
    { type: 'income', amount: 142.50, desc: 'Rendimentos CDB', cat: 'Investimentos', acc: savingsAccount.id, daysAgo: 5, notes: 'Rendimento 100% CDI' },
    
    // Expenses
    { type: 'expense', amount: 1450.00, desc: 'Aluguel do Apartamento', cat: 'Moradia', acc: mainAccount.id, daysAgo: 15, notes: 'Pago via PIX' },
    { type: 'expense', amount: 580.40, desc: 'Supermercado Mensal', cat: 'Mercado', acc: mainAccount.id, daysAgo: 12, notes: 'Compras do mês' },
    { type: 'expense', amount: 220.00, desc: 'Conta de Energia (Enel)', cat: 'Contas domésticas', acc: mainAccount.id, daysAgo: 10, notes: 'Vencimento 10' },
    { type: 'expense', amount: 99.90, desc: 'Internet Fibra 500MB', cat: 'Contas domésticas', acc: mainAccount.id, daysAgo: 9, notes: 'Débito automático' },
    { type: 'expense', amount: 185.00, desc: 'Abastecimento Carro', cat: 'Transporte', acc: mainAccount.id, daysAgo: 7, notes: 'Gasolina aditivada' },
    { type: 'expense', amount: 84.50, desc: 'Almoço Restaurante', cat: 'Alimentação', acc: cashAccount.id, daysAgo: 4, notes: 'Self-service' },
    { type: 'expense', amount: 55.90, desc: 'Netflix & Spotify', cat: 'Assinaturas', acc: mainAccount.id, daysAgo: 3, notes: 'Planos mensais' },
    { type: 'expense', amount: 130.00, desc: 'Farmácia e Vitaminas', cat: 'Saúde', acc: mainAccount.id, daysAgo: 2, notes: 'Medicamentos' },
    { type: 'expense', amount: 62.00, desc: 'Café e Lanche da Tarde', cat: 'Alimentação', acc: cashAccount.id, daysAgo: 1, notes: 'Padaria' },
    { type: 'expense', amount: 110.00, desc: 'Cinema e Pipoca', cat: 'Lazer', acc: mainAccount.id, daysAgo: 0, notes: 'Sessão de fim de semana' },

    // Transfer
    { type: 'transfer', amount: 800.00, desc: 'Aporte para Reserva de Emergência', cat: null, acc: mainAccount.id, dest: savingsAccount.id, daysAgo: 14, notes: 'Aplicação mensal' },
    { type: 'transfer', amount: 150.00, desc: 'Saque para Dinheiro', cat: null, acc: mainAccount.id, dest: cashAccount.id, daysAgo: 11, notes: 'Saque caixa eletrônico' },
  ];

  const now = new Date().toISOString();

  const runSeeder = db.transaction(() => {
    for (const t of txs) {
      const d = new Date(today);
      d.setDate(d.getDate() - t.daysAgo);
      const catId = t.cat ? catMap.get(t.cat) || null : null;
      insertTx.run(
        crypto.randomUUID(),
        userId,
        t.type,
        t.amount,
        t.desc,
        catId,
        t.acc,
        (t as any).dest || null,
        formatYMD(d),
        t.notes,
        now
      );
    }

    // Set sample budgets
    const currMonth = today.toISOString().slice(0, 7); // e.g. '2026-11'
    const insertBudget = db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, monthly_limit, month, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Global budget
    insertBudget.run(crypto.randomUUID(), userId, null, 3500.00, currMonth, now);
    
    // Category budgets
    const foodCat = catMap.get('Alimentação');
    if (foodCat) insertBudget.run(crypto.randomUUID(), userId, foodCat, 600.00, currMonth, now);
    
    const marketCat = catMap.get('Mercado');
    if (marketCat) insertBudget.run(crypto.randomUUID(), userId, marketCat, 800.00, currMonth, now);

    const transportCat = catMap.get('Transporte');
    if (transportCat) insertBudget.run(crypto.randomUUID(), userId, transportCat, 350.00, currMonth, now);

    const leisureCat = catMap.get('Lazer');
    if (leisureCat) insertBudget.run(crypto.randomUUID(), userId, leisureCat, 300.00, currMonth, now);

    // Sample Financial Goals
    const insertGoal = db.prepare(`
      INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, icon, color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertGoal.run(
      crypto.randomUUID(),
      userId,
      'Reserva de Emergência (6 Meses)',
      15000.00,
      4800.00,
      '2027-06-30',
      'Shield',
      '#059669',
      now
    );

    insertGoal.run(
      crypto.randomUUID(),
      userId,
      'Viagem de Férias para Praia',
      4000.00,
      2650.00,
      '2026-12-20',
      'Plane',
      '#3b82f6',
      now
    );

    insertGoal.run(
      crypto.randomUUID(),
      userId,
      'Troca de Notebook de Trabalho',
      6000.00,
      1500.00,
      '2027-03-15',
      'Laptop',
      '#8b5cf6',
      now
    );

    // Sample Recurring Rule
    const insertRecurring = db.prepare(`
      INSERT INTO recurring_rules (id, user_id, type, amount, description, category_id, account_id, frequency, start_date, next_due_date, is_active, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    if (mainAccount && catMap.get('Assinaturas')) {
      insertRecurring.run(
        crypto.randomUUID(),
        userId,
        'expense',
        55.90,
        'Assinaturas Digitais (Netflix & Spotify)',
        catMap.get('Assinaturas'),
        mainAccount.id,
        'monthly',
        '2026-01-01',
        formatYMD(new Date(today.getFullYear(), today.getMonth() + 1, 5)),
        'Cobrança recorrente todo dia 05',
        now
      );
    }

    if (mainAccount && catMap.get('Moradia')) {
      insertRecurring.run(
        crypto.randomUUID(),
        userId,
        'expense',
        1450.00,
        'Aluguel do Apartamento',
        catMap.get('Moradia'),
        mainAccount.id,
        'monthly',
        '2026-01-01',
        formatYMD(new Date(today.getFullYear(), today.getMonth() + 1, 10)),
        'Vencimento dia 10 de cada mês',
        now
      );
    }
  });

  runSeeder();

  // Recalculate balances for all user accounts
  for (const acc of accounts) {
    const { recalculateAccountBalance } = require('./database');
    recalculateAccountBalance(acc.id);
  }
}
