import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';

import authRoutes from './routes/auth';
import accountsRoutes from './routes/accounts';
import categoriesRoutes from './routes/categories';
import transactionsRoutes from './routes/transactions';
import recurringRoutes from './routes/recurring';
import budgetsRoutes from './routes/budgets';
import goalsRoutes from './routes/goals';
import reportsRoutes from './routes/reports';

dotenv.config();

// Initialize SQLite database and tables
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'COINVY API', time: new Date().toISOString() });
});

// Serve frontend static build if exists
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback for SPA routing in Express 5
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint não encontrado.' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('COINVY API está online.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`[COINVY] Servidor rodando com sucesso em http://localhost:${PORT}`);
});
