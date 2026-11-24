-- ==============================================================================
-- COINVY - ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE (PostgreSQL)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuário (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  currency TEXT DEFAULT 'BRL',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  hide_balances BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Contas Bancárias / Carteiras
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'cash', 'savings', 'credit_card', 'investment')),
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  initial_balance NUMERIC(14,2) DEFAULT 0.00,
  current_balance NUMERIC(14,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Categorias Financeiras
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Regras Recorrentes
CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(14,2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  last_processed_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Transações / Movimentações
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(14,2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Orçamentos Mensais
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_limit NUMERIC(14,2) NOT NULL,
  month TEXT NOT NULL, -- 'YYYY-MM' ou 'global'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Metas Financeiras
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) DEFAULT 0.00,
  deadline DATE,
  icon TEXT NOT NULL DEFAULT 'Target',
  color TEXT NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- Garante que cada usuário veja e modifique EXCLUSIVAMENTE seus próprios dados.
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas de acesso para ACCOUNTS
CREATE POLICY "Users can manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para CATEGORIES
CREATE POLICY "Users can manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para TRANSACTIONS
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para RECURRING_RULES
CREATE POLICY "Users can manage own recurring rules" ON public.recurring_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para BUDGETS
CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para GOALS
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGER AUTOMÁTICO: CRIAÇÃO DE PERFIL E DADOS PADRÃO AO CADASTRAR USUÁRIO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID := NEW.id;
  user_full_name TEXT := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
  -- 1. Cria o perfil do usuário
  INSERT INTO public.profiles (id, name, email)
  VALUES (new_user_id, user_full_name, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Cria as contas padrão
  INSERT INTO public.accounts (user_id, name, type, color, icon, initial_balance, current_balance)
  VALUES
    (new_user_id, 'Conta Principal', 'checking', '#059669', 'Building2', 0, 0),
    (new_user_id, 'Carteira (Dinheiro)', 'cash', '#10b981', 'Wallet', 0, 0),
    (new_user_id, 'Cartão de Crédito', 'credit_card', '#6366f1', 'CreditCard', 0, 0),
    (new_user_id, 'Reserva Financeira', 'savings', '#f59e0b', 'PiggyBank', 0, 0);

  -- 3. Cria as categorias padrão de Despesa
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
  VALUES
    (new_user_id, 'Alimentação', 'expense', 'Utensils', '#f97316', TRUE),
    (new_user_id, 'Mercado', 'expense', 'ShoppingCart', '#06b6d4', TRUE),
    (new_user_id, 'Moradia', 'expense', 'Home', '#8b5cf6', TRUE),
    (new_user_id, 'Transporte', 'expense', 'Car', '#3b82f6', TRUE),
    (new_user_id, 'Saúde', 'expense', 'HeartPulse', '#ec4899', TRUE),
    (new_user_id, 'Educação', 'expense', 'GraduationCap', '#14b8a6', TRUE),
    (new_user_id, 'Lazer', 'expense', 'Gamepad2', '#eab308', TRUE),
    (new_user_id, 'Compras', 'expense', 'ShoppingBag', '#f43f5e', TRUE),
    (new_user_id, 'Assinaturas', 'expense', 'Repeat', '#6366f1', TRUE),
    (new_user_id, 'Contas domésticas', 'expense', 'Receipt', '#64748b', TRUE),
    (new_user_id, 'Cartão de crédito', 'expense', 'CreditCard', '#dc2626', TRUE),
    (new_user_id, 'Outros', 'expense', 'MoreHorizontal', '#94a3b8', TRUE);

  -- 4. Cria as categorias padrão de Receita
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
  VALUES
    (new_user_id, 'Salário', 'income', 'Briefcase', '#10b981', TRUE),
    (new_user_id, 'Trabalho extra', 'income', 'TrendingUp', '#059669', TRUE),
    (new_user_id, 'Vendas', 'income', 'Tag', '#0d9488', TRUE),
    (new_user_id, 'Investimentos', 'income', 'LineChart', '#2563eb', TRUE),
    (new_user_id, 'Benefícios', 'income', 'Gift', '#8b5cf6', TRUE),
    (new_user_id, 'Outros', 'income', 'PlusCircle', '#64748b', TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir e recria
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
