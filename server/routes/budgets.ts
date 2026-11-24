import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const budgetSchema = z.object({
  category_id: z.string().nullable().optional(), // null means global budget
  monthly_limit: z.number().positive('O valor do orçamento deve ser maior que zero'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato AAAA-MM'),
});

// Get Budgets for a specific month with calculated actual spending
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  const budgets = db.prepare(`
    SELECT 
      b.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND (b.month = ? OR b.month = 'global')
  `).all(userId, month) as any[];

  // Compute spent amount for each budget in this month
  const startDate = `${month}-01`;
  // calculate last day of month
  const [yearStr, monthStr] = month.split('-');
  const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const budgetsWithSpending = budgets.map(b => {
    let spent = 0;
    if (b.category_id) {
      const row = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND category_id = ? AND type = 'expense'
          AND date >= ? AND date <= ?
      `).get(userId, b.category_id, startDate, endDate) as { total: number };
      spent = row.total;
    } else {
      // Global budget total expenses
      const row = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND type = 'expense'
          AND date >= ? AND date <= ?
      `).get(userId, startDate, endDate) as { total: number };
      spent = row.total;
    }

    const remaining = Math.max(0, Number((b.monthly_limit - spent).toFixed(2)));
    const percentage = Number(((spent / b.monthly_limit) * 100).toFixed(1));
    const isExceeded = spent > b.monthly_limit;
    const isNearLimit = percentage >= 80 && !isExceeded;

    return {
      ...b,
      spent: Number(spent.toFixed(2)),
      remaining,
      percentage,
      isExceeded,
      isNearLimit,
    };
  });

  return res.json({ month, budgets: budgetsWithSpending });
});

// Upsert Budget
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = budgetSchema.parse(req.body);

    // Check if budget exists for this category and month
    const existing = db.prepare(`
      SELECT id FROM budgets
      WHERE user_id = ? AND month = ? AND (
        (category_id IS NULL AND ? IS NULL) OR category_id = ?
      )
    `).get(userId, parsed.month, parsed.category_id || null, parsed.category_id || null) as any;

    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE budgets SET monthly_limit = ? WHERE id = ?
      `).run(parsed.monthly_limit, existing.id);

      const updated = db.prepare('SELECT * FROM budgets WHERE id = ?').get(existing.id);
      return res.json({ budget: updated });
    } else {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO budgets (id, user_id, category_id, monthly_limit, month, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userId, parsed.category_id || null, parsed.monthly_limit, parsed.month, now);

      const created = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
      return res.status(201).json({ budget: created });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Delete Budget
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, userId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
