import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const categorySchema = z.object({
  name: z.string().min(1, 'O nome da categoria é obrigatório'),
  type: z.enum(['income', 'expense']),
  icon: z.string().default('MoreHorizontal'),
  color: z.string().default('#059669'),
});

// List Categories
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { type } = req.query;

  let query = 'SELECT * FROM categories WHERE user_id = ?';
  const params: any[] = [userId];

  if (type === 'income' || type === 'expense') {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY is_default DESC, name ASC';

  const categories = db.prepare(query).all(...params);
  return res.json({ categories });
});

// Create Category
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = categorySchema.parse(req.body);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, userId, parsed.name, parsed.type, parsed.icon, parsed.color, now);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.status(201).json({ category });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Update Category
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, icon, color } = req.body;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    if (name) db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
    if (icon) db.prepare('UPDATE categories SET icon = ? WHERE id = ?').run(icon, id);
    if (color) db.prepare('UPDATE categories SET color = ? WHERE id = ?').run(color, id);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.json({ category: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete Category
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    // Set category_id = null on transactions
    db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?').run(id, userId);
    db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);

    return res.json({ success: true, message: 'Categoria excluída.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
