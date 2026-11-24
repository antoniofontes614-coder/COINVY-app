import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db, recalculateAccountBalance } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const recurringSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('O valor deve ser maior que zero'),
  description: z.string().min(1, 'A descrição é obrigatória'),
  category_id: z.string().nullable().optional(),
  account_id: z.string().min(1, 'Selecione a conta'),
  destination_account_id: z.string().nullable().optional(),
  frequency: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().nullable().optional(),
});

function calculateNextDueDate(currentDue: string, frequency: 'weekly' | 'monthly' | 'yearly'): string {
  const d = new Date(currentDue + 'T12:00:00Z');
  if (frequency === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (frequency === 'monthly') {
    d.setUTCMonth(d.getUTCMonth() + 1);
  } else if (frequency === 'yearly') {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
  return d.toISOString().split('T')[0];
}

// List recurring rules
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const rules = db.prepare(`
    SELECT 
      r.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      a.name as account_name,
      da.name as destination_account_name
    FROM recurring_rules r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    LEFT JOIN accounts da ON r.destination_account_id = da.id
    WHERE r.user_id = ?
    ORDER BY r.next_due_date ASC
  `).all(userId);

  return res.json({ recurring_rules: rules });
});

// Create recurring rule
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = recurringSchema.parse(req.body);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO recurring_rules (
        id, user_id, type, amount, description, category_id,
        account_id, destination_account_id, frequency, start_date,
        end_date, next_due_date, is_active, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      userId,
      parsed.type,
      parsed.amount,
      parsed.description.trim(),
      parsed.category_id || null,
      parsed.account_id,
      parsed.destination_account_id || null,
      parsed.frequency,
      parsed.start_date,
      parsed.end_date || null,
      parsed.start_date,
      parsed.notes ? parsed.notes.trim() : null,
      now
    );

    const created = db.prepare('SELECT * FROM recurring_rules WHERE id = ?').get(id);
    return res.status(201).json({ recurring_rule: created });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Toggle active status
router.patch('/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM recurring_rules WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Regra recorrente não encontrada.' });
    }

    const newStatus = existing.is_active ? 0 : 1;
    db.prepare('UPDATE recurring_rules SET is_active = ? WHERE id = ?').run(newStatus, id);

    return res.json({ success: true, is_active: newStatus });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete recurring rule
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    db.prepare('DELETE FROM recurring_rules WHERE id = ? AND user_id = ?').run(id, userId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Process pending due recurring rules automatically without duplicating
router.post('/process', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const today = new Date().toISOString().split('T')[0];

    const dueRules = db.prepare(`
      SELECT * FROM recurring_rules
      WHERE user_id = ? AND is_active = 1 AND next_due_date <= ?
    `).all(userId, today) as any[];

    const processedIds: string[] = [];
    const accountsToRecalc = new Set<string>();

    const processBatch = db.transaction(() => {
      for (const rule of dueRules) {
        // Prevent duplicate generation if transaction already exists for this rule and date
        const existingTx = db.prepare(`
          SELECT id FROM transactions 
          WHERE user_id = ? AND recurring_rule_id = ? AND date = ?
        `).get(userId, rule.id, rule.next_due_date);

        if (!existingTx) {
          const txId = crypto.randomUUID();
          const now = new Date().toISOString();

          db.prepare(`
            INSERT INTO transactions (
              id, user_id, type, amount, description, category_id,
              account_id, destination_account_id, date, notes,
              is_recurring, recurring_rule_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          `).run(
            txId,
            userId,
            rule.type,
            rule.amount,
            rule.description,
            rule.category_id,
            rule.account_id,
            rule.destination_account_id,
            rule.next_due_date,
            `Lançamento automático de recorrência (${rule.frequency})`,
            rule.id,
            now
          );

          accountsToRecalc.add(rule.account_id);
          if (rule.destination_account_id) accountsToRecalc.add(rule.destination_account_id);
        }

        // Advance next_due_date
        const nextDue = calculateNextDueDate(rule.next_due_date, rule.frequency);
        let shouldDeactivate = 0;
        if (rule.end_date && nextDue > rule.end_date) {
          shouldDeactivate = 1;
        }

        db.prepare(`
          UPDATE recurring_rules SET
            last_processed_date = ?,
            next_due_date = ?,
            is_active = CASE WHEN ? = 1 THEN 0 ELSE is_active END
          WHERE id = ?
        `).run(today, nextDue, shouldDeactivate, rule.id);

        processedIds.push(rule.id);
      }

      for (const accId of accountsToRecalc) {
        recalculateAccountBalance(accId);
      }
    });

    processBatch();

    return res.json({ processedCount: processedIds.length, processedIds });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
