import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db, recalculateAccountBalance } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const accountSchema = z.object({
  name: z.string().min(1, 'O nome da conta é obrigatório'),
  type: z.enum(['checking', 'cash', 'savings', 'credit_card', 'investment']),
  color: z.string().default('#059669'),
  icon: z.string().default('Wallet'),
  initial_balance: z.number().default(0),
});

// List Accounts
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const accounts = db.prepare(`
    SELECT * FROM accounts 
    WHERE user_id = ? AND is_active = 1 
    ORDER BY created_at ASC
  `).all(userId) as any[];

  // Ensure balances are freshly synced
  const accountsWithRecalc = accounts.map(acc => {
    const bal = recalculateAccountBalance(acc.id);
    return { ...acc, current_balance: bal };
  });

  return res.json({ accounts: accountsWithRecalc });
});

// Create Account
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = accountSchema.parse(req.body);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO accounts (id, user_id, name, type, color, icon, initial_balance, current_balance, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, userId, parsed.name, parsed.type, parsed.color, parsed.icon, parsed.initial_balance, parsed.initial_balance, now);

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return res.status(201).json({ account });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Update Account
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, type, color, icon, initial_balance } = req.body;

    const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Conta não encontrada.' });
    }

    if (name) db.prepare('UPDATE accounts SET name = ? WHERE id = ?').run(name, id);
    if (type) db.prepare('UPDATE accounts SET type = ? WHERE id = ?').run(type, id);
    if (color) db.prepare('UPDATE accounts SET color = ? WHERE id = ?').run(color, id);
    if (icon) db.prepare('UPDATE accounts SET icon = ? WHERE id = ?').run(icon, id);
    if (initial_balance !== undefined) {
      db.prepare('UPDATE accounts SET initial_balance = ? WHERE id = ?').run(initial_balance, id);
    }

    const updatedBal = recalculateAccountBalance(id);
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
    return res.json({ account: { ...updated, current_balance: updatedBal } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete Account
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Conta não encontrada.' });
    }

    // Check if account has transactions
    const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR destination_account_id = ?').get(id, id) as { count: number };
    
    // Soft delete or cascade delete
    db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(id, userId);

    return res.json({ success: true, message: 'Conta excluída com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
