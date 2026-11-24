import { db, initDatabase, recalculateAccountBalance } from '../server/db/database';
import { seedUserData, seedDemoTransactions } from '../server/db/seeds';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('--- INICIANDO TESTES DO COINVY ---');
  initDatabase();

  // Test 1: User Registration & Password Hashing
  console.log('1. Testando Cadastro e Autenticação...');
  const testEmail = `teste_${Date.now()}@nexofinance.com.br`;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('senhaForte123', salt);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, currency, date_format, hide_balances, theme, created_at)
    VALUES (?, 'Carlos Eduardo', ?, ?, 'BRL', 'DD/MM/YYYY', 0, 'light', ?)
  `).run(userId, testEmail, hash, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user || !(await bcrypt.compare('senhaForte123', user.password_hash))) {
    throw new Error('Falha no teste de autenticação');
  }
  console.log('✓ Usuário cadastrado e senha verificada com sucesso.');

  // Test 2 & 7: Seed Accounts & Categories
  console.log('2. Testando criação de Categorias e Contas padrão...');
  seedUserData(userId);
  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId) as any[];
  const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId) as any[];

  if (accounts.length < 4 || categories.length < 18) {
    throw new Error('Falha no seeding de contas ou categorias');
  }
  console.log(`✓ ${accounts.length} contas e ${categories.length} categorias geradas com sucesso.`);

  const contaCorrente = accounts.find(a => a.name.includes('Principal') || a.name.includes('Conta')) || accounts[0];
  const carteira = accounts.find(a => a.name.includes('Carteira') || a.name.includes('Dinheiro')) || accounts[1];
  const catSalario = categories.find(c => c.name === 'Salário' && c.type === 'income') || categories[0];
  const catAlimentacao = categories.find(c => c.name === 'Alimentação' && c.type === 'expense') || categories[1];

  // Test 3: Income Transaction
  console.log('3. Testando Registro de Receita...');
  const txIncomeId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, date, created_at)
    VALUES (?, ?, 'income', 5000.00, 'Salário Mensal', ?, ?, '2026-11-01', ?)
  `).run(txIncomeId, userId, catSalario.id, contaCorrente.id, now);

  let bal1 = recalculateAccountBalance(contaCorrente.id);
  if (bal1 !== 5000.00) {
    throw new Error(`Saldo esperado 5000.00, obtido: ${bal1}`);
  }
  console.log(`✓ Receita registrada. Saldo da conta atualizado para: R$ ${bal1.toFixed(2)}`);

  // Test 4: Expense Transaction
  console.log('4. Testando Registro de Despesa...');
  const txExpenseId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, date, created_at)
    VALUES (?, ?, 'expense', 150.50, 'Almoço Restaurante', ?, ?, '2026-11-02', ?)
  `).run(txExpenseId, userId, catAlimentacao.id, contaCorrente.id, now);

  let bal2 = recalculateAccountBalance(contaCorrente.id);
  if (bal2 !== 4849.50) {
    throw new Error(`Saldo esperado 4849.50, obtido: ${bal2}`);
  }
  console.log(`✓ Despesa registrada. Saldo da conta atualizado para: R$ ${bal2.toFixed(2)}`);

  // Test 5: Transfer between accounts
  console.log('5. Testando Transferência entre Contas...');
  const txTransferId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, description, account_id, destination_account_id, date, created_at)
    VALUES (?, ?, 'transfer', 300.00, 'Saque para Carteira', ?, ?, '2026-11-03', ?)
  `).run(txTransferId, userId, contaCorrente.id, carteira.id, now);

  let balSrc = recalculateAccountBalance(contaCorrente.id);
  let balDst = recalculateAccountBalance(carteira.id);

  if (balSrc !== 4549.50 || balDst !== 300.00) {
    throw new Error(`Transferência falhou: Origem=${balSrc}, Destino=${balDst}`);
  }
  console.log(`✓ Transferência realizada com perfeição! Origem: R$ ${balSrc.toFixed(2)}, Destino: R$ ${balDst.toFixed(2)}`);

  // Verify transfers are NOT counted in income or expenses total
  const incomeTotal = db.prepare("SELECT SUM(amount) as t FROM transactions WHERE user_id = ? AND type = 'income'").get(userId) as any;
  const expenseTotal = db.prepare("SELECT SUM(amount) as t FROM transactions WHERE user_id = ? AND type = 'expense'").get(userId) as any;
  if (incomeTotal.t !== 5000.00 || expenseTotal.t !== 150.50) {
    throw new Error('Transferência vazou para receitas ou despesas!');
  }
  console.log('✓ Regra Financeira: Transferência NÃO afeta totalizadores de receita/despesa.');

  // Test 6: Transaction Edit & Deletion
  console.log('6. Testando Edição e Exclusão de Movimentação...');
  // Update expense to 200.00
  db.prepare("UPDATE transactions SET amount = 200.00 WHERE id = ?").run(txExpenseId);
  let balAfterEdit = recalculateAccountBalance(contaCorrente.id);
  if (balAfterEdit !== 4500.00) {
    throw new Error(`Falha no recálculo pós-edição: esperado 4500.00, obtido ${balAfterEdit}`);
  }
  console.log(`✓ Edição recalcula saldo corretamente: R$ ${balAfterEdit.toFixed(2)}`);

  // Delete expense
  db.prepare("DELETE FROM transactions WHERE id = ?").run(txExpenseId);
  let balAfterDelete = recalculateAccountBalance(contaCorrente.id);
  if (balAfterDelete !== 4700.00) {
    throw new Error(`Falha no recálculo pós-exclusão: esperado 4700.00, obtido ${balAfterDelete}`);
  }
  console.log(`✓ Exclusão reverte saldo perfeitamente: R$ ${balAfterDelete.toFixed(2)}`);

  // Test 8: Budgets
  console.log('7. Testando Orçamentos Mensais...');
  const budgetId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO budgets (id, user_id, category_id, monthly_limit, month, created_at)
    VALUES (?, ?, ?, 500.00, '2026-11', ?)
  `).run(budgetId, userId, catAlimentacao.id, now);

  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId) as any;
  if (!budget || budget.monthly_limit !== 500.00) {
    throw new Error('Falha no teste de orçamentos');
  }
  console.log('✓ Orçamento mensal cadastrado e verificado com sucesso.');

  // Test 9: Goals (Metas Financeiras)
  console.log('8. Testando Metas Financeiras...');
  const goalId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, icon, color, created_at)
    VALUES (?, ?, 'Viagem Férias', 3000.00, 1000.00, '2026-12-31', 'Plane', '#3b82f6', ?)
  `).run(goalId, userId, now);

  // Aporte
  db.prepare('UPDATE goals SET current_amount = current_amount + 500.00 WHERE id = ?').run(goalId);
  const updatedGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as any;
  if (updatedGoal.current_amount !== 1500.00) {
    throw new Error('Falha no aporte da meta');
  }
  console.log(`✓ Meta criada e aporte de R$ 500 registrado (Total: R$ ${updatedGoal.current_amount.toFixed(2)} / 50%)`);

  // Test 10: Recurring Rules
  console.log('9. Testando Regras Recorrentes...');
  const ruleId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO recurring_rules (id, user_id, type, amount, description, category_id, account_id, frequency, start_date, next_due_date, is_active, created_at)
    VALUES (?, ?, 'expense', 49.90, 'Spotify Premium', ?, ?, 'monthly', '2026-11-01', '2026-11-01', 1, ?)
  `).run(ruleId, userId, catAlimentacao.id, contaCorrente.id, now);

  const rule = db.prepare('SELECT * FROM recurring_rules WHERE id = ?').get(ruleId) as any;
  if (!rule || rule.amount !== 49.90) {
    throw new Error('Falha na criação de recorrência');
  }
  console.log('✓ Regra recorrente cadastrada e ativa.');

  // Test 11: Demo seed verification
  console.log('10. Testando Carga e Limpeza de Dados de Demonstração...');
  seedDemoTransactions(userId);
  const txCount = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE user_id = ?').get(userId) as any;
  if (txCount.c <= 2) {
    throw new Error('Dados demonstrativos não foram populados');
  }
  console.log(`✓ Demonstração carregada: ${txCount.c} transações registradas.`);

  console.log('--- TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ---');
}

runTests().catch(err => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
