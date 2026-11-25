import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Sun,
  Moon,
  Calendar,
  ChevronDown,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { CoinvyLogo } from './CoinvyLogo';

interface NavbarProps {
  currentTab: string;
  onNavigateTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigateTab }) => {
  const { user, hideBalances, toggleHideBalances, theme, toggleTheme, logout } = useAuth();
  const { period, setPeriod, customDateRange, setCustomDateRange } = useFinance();
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [tempStart, setTempStart] = useState(customDateRange.start);
  const [tempEnd, setTempEnd] = useState(customDateRange.end);

  const periodLabels: Record<string, string> = {
    today: 'Hoje',
    this_week: 'Esta semana',
    this_month: 'Este mês',
    last_month: 'Mês anterior',
    custom: 'Personalizado',
  };

  const handleSelectPeriod = (p: 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom') => {
    if (p === 'custom') {
      setShowCustomRangeModal(true);
    } else {
      setPeriod(p);
    }
    setIsPeriodMenuOpen(false);
  };

  const handleApplyCustomRange = () => {
    setCustomDateRange({ start: tempStart, end: tempEnd });
    setPeriod('custom');
    setShowCustomRangeModal(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          
          {/* Logo & Brand */}
          <CoinvyLogo variant="horizontal" size="md" showSlogan={true} />

          {/* Center: Period Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700/60"
            >
              <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>{periodLabels[period]}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Dropdown menu */}
            {isPeriodMenuOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                {(['today', 'this_week', 'this_month', 'last_month', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSelectPeriod(p)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      period === p
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{periodLabels[p]}</span>
                    {period === p && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Actions: Privacy Eye & Theme Toggle */}
          <div className="flex items-center gap-1.5">
            {/* Privacy Eye Toggle */}
            <button
              onClick={toggleHideBalances}
              title={hideBalances ? 'Mostrar saldos' : 'Ocultar saldos (Privacidade)'}
              className={`p-2 rounded-xl transition-all ${
                hideBalances
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {hideBalances ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* User initial avatar or uploaded photo - Click opens Perfil */}
            {user && (
              <button
                type="button"
                onClick={() => onNavigateTab?.('perfil')}
                title="Acessar Meu Perfil e Configurações"
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border-2 border-emerald-400 select-none ml-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs shrink-0 hover:scale-110 active:scale-95 transition-all shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                )}
              </button>
            )}

            {/* Sair do App Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sair do aplicativo"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all ml-0.5"
            >
              <LogOut size={17} />
            </button>
          </div>

        </div>
      </header>

      {/* Modal de Confirmação para Sair do App */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <LogOut size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Deseja Sair do Aplicativo?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Desconectar sua sessão com segurança
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você será desconectado com segurança do <strong>DIM+</strong>. Todos os seus dados continuam salvos na nuvem e você poderá entrar novamente a qualquer momento com seu e-mail e senha.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <LogOut size={15} />
                <span>Sim, Sair do App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Date Range Modal */}
      {showCustomRangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Período Personalizado
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Data Final</label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCustomRangeModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyCustomRange}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
              >
                Aplicar Período
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
