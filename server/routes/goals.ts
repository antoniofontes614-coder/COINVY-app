import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const goalSchema = z.object({
  name: z.string().min(1, 'Nome da meta é obrigatório'),
  target_amount: z.number().positive('O valor alvo deve ser positivo'),
  current_amount: z.number().min(0).default(0),
  deadline: z.string().nullable().optional(),
  icon: z.string().default('Target'),
  color: z.string().default('#059669'),
});

const contributionSchema = z.object({
  amount: z.number(), // positive to deposit, negative to withdraw
  notes: z.string().optional(),
});

// List Goals
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const goals = db.prepare(`
    SELECT * FROM goals 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(userId) as any[];

  const goalsWithProgress = goals.map(g => {
    const progress = Math.min(100, Number(((g.current_amount / g.target_amount) * 100).toFixed(1)));
    const remaining = Math.max(0, Number((g.target_amount - g.current_amount).toFixed(2)));
    return {
      ...g,
      progress,
      remaining,
      isCompleted: g.current_amount >= g.target_amount,
    };
  });

  return res.json({ goals: goalsWithProgress });
});

// Create Goal
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = goalSchema.parse(req.body);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, icon, color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      parsed.name.trim(),
      parsed.target_amount,
      parsed.current_amount,
      parsed.deadline || null,
      parsed.icon,
      parsed.color,
      now
    );

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    return res.status(201).json({ goal });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Contribute to or withdraw from goal
router.post('/:id/contribute', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { amount, notes } = contributionSchema.parse(req.body);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!goal) {
      return res.status(404).json({ error: 'Meta não encontrada.' });
    }

    const newAmount = Math.max(0, Number((goal.current_amount + amount).toFixed(2)));
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const contributeTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO goal_contributions (id, goal_id, user_id, amount, date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), id, userId, amount, today, notes || null, now);

      db.prepare('UPDATE goals SET current_amount = ? WHERE id = ?').run(newAmount, id);
    });

    contributeTx();

    const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as any;
    const progress = Math.min(100, Number(((updated.current_amount / updated.target_amount) * 100).toFixed(1)));

    return res.json({
      goal: {
        ...updated,
        progress,
        remaining: Math.max(0, Number((updated.target_amount - updated.current_amount).toFixed(2))),
        isCompleted: updated.current_amount >= updated.target_amount,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Update Goal
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const parsed = goalSchema.parse(req.body);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId);
    if (!goal) {
      return res.status(404).json({ error: 'Meta não encontrada.' });
    }

    db.prepare(`
      UPDATE goals SET
        name = ?,
        target_amount = ?,
        current_amount = ?,
        deadline = ?,
        icon = ?,
        color = ?
      WHERE id = ? AND user_id = ?
    `).run(
      parsed.name.trim(),
      parsed.target_amount,
      parsed.current_amount,
      parsed.deadline || null,
      parsed.icon,
      parsed.color,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    return res.json({ goal: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete Goal
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, userId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
