import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { seedUserData, seedDemoTransactions } from '../db/seeds';
import { authMiddleware, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

// Register
router.post('/register', async (req, res: Response) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, currency, date_format, hide_balances, theme, created_at)
      VALUES (?, ?, ?, ?, 'BRL', 'DD/MM/YYYY', 0, 'light', ?)
    `).run(userId, name, email.toLowerCase(), passwordHash, now);

    // Seed default categories & accounts for this new user
    seedUserData(userId);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    const user = {
      id: userId,
      name,
      email: email.toLowerCase(),
      currency: 'BRL',
      date_format: 'DD/MM/YYYY',
      hide_balances: 0,
      theme: 'light',
    };

    return res.status(201).json({ token, user });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: 'Erro ao cadastrar usuário: ' + error.message });
  }
});

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;
    if (!user) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    if (user && user.name.includes('Nexo')) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run('Demonstração COINVY', user.id);
      user.name = 'Demonstração COINVY';
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        date_format: user.date_format,
        hide_balances: user.hide_balances,
        theme: user.theme,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    return res.status(500).json({ error: 'Erro ao realizar login: ' + error.message });
  }
});

// Instant Demo Login (for quick evaluation or testing)
router.post('/demo', async (req, res: Response) => {
  try {
    const demoEmail = 'demo@coinvy.com.br';
    let user = db.prepare('SELECT * FROM users WHERE email = ? OR email = ?').get(demoEmail, 'demo@nexofinance.com.br') as any;

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('demo123456', salt);
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, currency, date_format, hide_balances, theme, created_at)
        VALUES (?, 'Demonstração COINVY', ?, ?, 'BRL', 'DD/MM/YYYY', 0, 'light', ?)
      `).run(userId, demoEmail, passwordHash, now);

      seedUserData(userId);
      seedDemoTransactions(userId);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }

    if (user && user.name.includes('Nexo')) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run('Demonstração COINVY', user.id);
      user.name = 'Demonstração COINVY';
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        date_format: user.date_format,
        hide_balances: user.hide_balances,
        theme: user.theme,
      },
      isDemo: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao carregar conta de demonstração: ' + error.message });
  }
});

// Current User Profile
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// Update Profile & Preferences
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, theme, hide_balances } = req.body;
    const userId = req.userId!;

    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), userId);
    }
    if (theme !== undefined) {
      db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, userId);
    }
    if (hide_balances !== undefined) {
      db.prepare('UPDATE users SET hide_balances = ? WHERE id = ?').run(hide_balances ? 1 : 0, userId);
    }

    const updatedUser = db.prepare('SELECT id, name, email, currency, date_format, hide_balances, theme FROM users WHERE id = ?').get(userId);
    return res.json({ user: updatedUser });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar configurações: ' + error.message });
  }
});

export default router;
