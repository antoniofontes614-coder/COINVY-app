import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CoinvyLogo } from '../components/CoinvyLogo';
import { SupabaseModal } from '../components/SupabaseModal';
import { isSupabaseConfigured } from '../services/supabase';

export const AuthPage: React.FC = () => {
  const { login, register, demoLogin } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const isSupabaseActive = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Por favor, informe seu nome.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await register({ name: name.trim(), email: email.trim(), password });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await demoLogin();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao acessar modo demonstração.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-8 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Brand Header with official Logo & Slogan */}
      <div className="text-center mb-6 space-y-1 max-w-sm">
        <CoinvyLogo variant="full" size="xl" showSlogan={true} />
      </div>

      {/* Auth Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl w-full max-w-md space-y-5">
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Seu Nome
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: Ana Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              'Aguarde...'
            ) : mode === 'login' ? (
              <>
                <span>Acessar DIM+</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <span>Criar Minha Conta DIM+</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center py-2">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
          <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider relative">
            ou teste agora
          </span>
        </div>

        {/* 1-Click Demo Button */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-2xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
        >
          <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>Experimentar Conta de Demonstração (1 Clique)</span>
        </button>

        {/* Supabase Cloud Connection Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-2">
              <Database size={15} className={isSupabaseActive ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Conexão Supabase</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isSupabaseActive
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isSupabaseActive ? 'Conectado' : 'Configurar'}
            </span>
          </button>
        </div>

      </div>

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* Feature highlights footer */}
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm text-center text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-1">
            <ShieldCheck size={16} />
          </div>
          <span>Dados Seguros</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-1">
            <TrendingUp size={16} />
          </div>
          <span>Cálculos Exatos</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-1">
            <PieChart size={16} />
          </div>
          <span>Padrão Brasileiro</span>
        </div>
      </div>

    </div>
  );
};
