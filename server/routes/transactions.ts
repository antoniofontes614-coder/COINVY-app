import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db, recalculateAccountBalance } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('O valor deve ser maior que zero'),
  description: z.string().min(1, 'A descrição é obrigatória'),
  category_id: z.string().nullable().optional(),
  account_id: z.string().min(1, 'Selecione a conta'),
  destination_account_id: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD'),
  notes: z.string().nullable().optional(),
  is_recurring: z.boolean().optional(),
  recurring_rule_id: z.string().nullable().optional(),
});

// List Transactions with rich filters and joined category & account data
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const {
    type,
    category_id,
    account_id,
    start_date,
    end_date,
    search,
    min_amount,
    max_amount,
    limit = 100,
    offset = 0
  } = req.query;

  let query = `
    SELECT 
      t.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      a.name as account_name,
      a.icon as account_icon,
      a.color as account_color,
      da.name as destination_account_name,
      da.icon as destination_account_icon,
      da.color as destination_account_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts da ON t.destination_account_id = da.id
    WHERE t.user_id = ?
  `;

  const params: any[] = [userId];

  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }

  if (category_id) {
    query += ' AND t.category_id = ?';
    params.push(category_id);
  }

  if (account_id) {
    query += ' AND (t.account_id = ? OR t.destination_account_id = ?)';
    params.push(account_id, account_id);
  }

  if (start_date) {
    query += ' AND t.date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND t.date <= ?';
    params.push(end_date);
  }

  if (search) {
    query += ' AND (t.description LIKE ? OR t.notes LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  if (min_amount) {
    query += ' AND t.amount >= ?';
    params.push(Number(min_amount));
  }

  if (max_amount) {
    query += ' AND t.amount <= ?';
    params.push(Number(max_amount));
  }

  query += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const transactions = db.prepare(query).all(...params);

  return res.json({ transactions });
});

// Get Single Transaction
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const transaction = db.prepare(`
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
    WHERE t.id = ? AND t.user_id = ?
  `).get(id, userId);

  if (!transaction) {
    return res.status(404).json({ error: 'Movimentação não encontrada.' });
  }

  return res.json({ transaction });
});

// Create Transaction
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = transactionSchema.parse(req.body);

    if (parsed.type === 'transfer') {
      if (!parsed.destination_account_id) {
        return res.status(400).json({ error: 'Transferência exige conta de destino.' });
      }
      if (parsed.account_id === parsed.destination_account_id) {
        return res.status(400).json({ error: 'A conta de origem e destino devem ser diferentes.' });
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertAndSync = db.transaction(() => {
      db.prepare(`
        INSERT INTO transactions (
          id, user_id, type, amount, description, category_id,
          account_id, destination_account_id, date, notes,
          is_recurring, recurring_rule_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        parsed.type,
        parsed.amount,
        parsed.description.trim(),
        parsed.category_id || null,
        parsed.account_id,
        parsed.destination_account_id || null,
        parsed.date,
        parsed.notes ? parsed.notes.trim() : null,
        parsed.is_recurring ? 1 : 0,
        parsed.recurring_rule_id || null,
        now
      );

      // Recalculate balance for impacted accounts
      recalculateAccountBalance(parsed.account_id);
      if (parsed.destination_account_id) {
        recalculateAccountBalance(parsed.destination_account_id);
      }
    });

    insertAndSync();

    const created = db.prepare(`
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
      WHERE t.id = ?
    `).get(id);

    return res.status(201).json({ transaction: created });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Update Transaction
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const parsed = transactionSchema.parse(req.body);

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Movimentação não encontrada.' });
    }

    if (parsed.type === 'transfer') {
      if (!parsed.destination_account_id) {
        return res.status(400).json({ error: 'Transferência exige conta de destino.' });
      }
      if (parsed.account_id === parsed.destination_account_id) {
        return res.status(400).json({ error: 'A conta de origem e destino devem ser diferentes.' });
      }
    }

    const previousAccounts = new Set<string>();
    previousAccounts.add(existing.account_id);
    if (existing.destination_account_id) previousAccounts.add(existing.destination_account_id);

    const updateAndSync = db.transaction(() => {
      db.prepare(`
        UPDATE transactions SET
          type = ?,
          amount = ?,
          description = ?,
          category_id = ?,
          account_id = ?,
          destination_account_id = ?,
          date = ?,
          notes = ?
        WHERE id = ? AND user_id = ?
      `).run(
        parsed.type,
        parsed.amount,
        parsed.description.trim(),
        parsed.category_id || null,
        parsed.account_id,
        parsed.destination_account_id || null,
        parsed.date,
        parsed.notes ? parsed.notes.trim() : null,
        id,
        userId
      );

      // Recalculate old accounts and new accounts
      previousAccounts.add(parsed.account_id);
      if (parsed.destination_account_id) previousAccounts.add(parsed.destination_account_id);

      for (const accId of previousAccounts) {
        recalculateAccountBalance(accId);
      }
    });

    updateAndSync();

    const updated = db.prepare(`
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
      WHERE t.id = ?
    `).get(id);

    return res.json({ transaction: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Delete Transaction
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Movimentação não encontrada.' });
    }

    const deleteAndSync = db.transaction(() => {
      db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);

      recalculateAccountBalance(existing.account_id);
      if (existing.destination_account_id) {
        recalculateAccountBalance(existing.destination_account_id);
      }
    });

    deleteAndSync();

    return res.json({ success: true, message: 'Movimentação excluída com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Duplicate Transaction
router.post('/:id/duplicate', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Movimentação não encontrada.' });
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const duplicateAndSync = db.transaction(() => {
      db.prepare(`
        INSERT INTO transactions (
          id, user_id, type, amount, description, category_id,
          account_id, destination_account_id, date, notes,
          is_recurring, recurring_rule_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)
      `).run(
        newId,
        userId,
        existing.type,
        existing.amount,
        `${existing.description} (Cópia)`,
        existing.category_id,
        existing.account_id,
        existing.destination_account_id,
        today,
        existing.notes,
        now
      );

      recalculateAccountBalance(existing.account_id);
      if (existing.destination_account_id) {
        recalculateAccountBalance(existing.destination_account_id);
      }
    });

    duplicateAndSync();

    const created = db.prepare(`
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
      WHERE t.id = ?
    `).get(newId);

    return res.status(201).json({ transaction: created });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
