import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

export const JWT_SECRET = process.env.JWT_SECRET || 'nexo-finance-super-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    currency: string;
    date_format: string;
    hide_balances: number;
    theme: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token ausente.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.prepare('SELECT id, name, email, currency, date_format, hide_balances, theme FROM users WHERE id = ?').get(decoded.userId) as any;

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
  }
}
