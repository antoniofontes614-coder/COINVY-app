import React, { useState } from 'react';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  PieChart,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CoinvyLogo } from '../components/CoinvyLogo';

export const AuthPage: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor, digite o mesmo e-mail que você utilizou na compra.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido (ex: seuemail@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: cleanEmail });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao acessar o aplicativo.');
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
        
        {/* Header Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Acessar DIM+
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Digite o mesmo e-mail utilizado na compra para entrar
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ACCESS FORM */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              E-mail da Compra
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="seuemail@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              'Entrando...'
            ) : (
              <>
                <span>Entrar no DIM+</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Notice: Use the purchase email / No password or registration needed */}
        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl flex items-start gap-2.5 text-left">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-emerald-700 dark:text-emerald-300">Importante:</strong> Acesse com o <strong>mesmo e-mail que você utilizou na compra</strong>. Não é necessário senha nem cadastro prévio: basta digitar seu e-mail e seu acesso é liberado imediatamente.
          </p>
        </div>

      </div>

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
