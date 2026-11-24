import React, { useState } from 'react';
import {
  User,
  Sun,
  Moon,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download,
  Trash2,
  Sparkles,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { api } from '../../services/api';
import { localDb } from '../../services/storage';
import { exportTransactionsCSV, downloadFile } from '../../utils/export';

export const SettingsSection: React.FC = () => {
  const { user, updateUser, theme, toggleTheme, hideBalances, toggleHideBalances, logout } = useAuth();
  const { refreshData } = useFinance();

  const [name, setName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false);
  const [dataMessage, setDataMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsUpdatingName(true);
    try {
      await updateUser({ name: name.trim() });
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 3000);
    } catch (err: any) {
      alert('Erro ao atualizar nome: ' + err.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('coinvy_token') || localStorage.getItem('nexo_token');
      const res = await fetch('/api/reports/export/csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coinvy_movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch {}

    exportTransactionsCSV(localDb.listTransactions().transactions);
  };

  const handleExportJSON = async () => {
    try {
      const token = localStorage.getItem('coinvy_token') || localStorage.getItem('nexo_token');
      const res = await fetch('/api/reports/export/json', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coinvy_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch {}

    const backup = {
      exportDate: new Date().toISOString(),
      version: '2.0',
      data: {
        user,
        accounts: localDb.listAccounts().accounts,
        categories: localDb.listCategories().categories,
        transactions: localDb.listTransactions().transactions,
        budgets: localDb.listBudgets().budgets,
        goals: localDb.listGoals().goals,
      },
    };
    downloadFile(JSON.stringify(backup, null, 2), `coinvy_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleLoadDemo = async () => {
    if (window.confirm('Deseja carregar lançamentos de demonstração para testar o aplicativo? Você poderá limpá-los a qualquer momento.')) {
      try {
        const res = await api.reports.loadDemo();
        setDataMessage({ text: res.message, type: 'success' });
        await refreshData();
      } catch (err: any) {
        setDataMessage({ text: err.message, type: 'error' });
      }
    }
  };

  const handleResetData = async () => {
    if (window.confirm('ATENÇÃO: Deseja apagar todas as movimentações, metas e orçamentos para começar totalmente do zero? Esta ação não pode ser desfeita.')) {
      try {
        const res = await api.reports.resetData();
        setDataMessage({ text: res.message, type: 'success' });
        await refreshData();
      } catch (err: any) {
        setDataMessage({ text: err.message, type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Configurações e Perfil
        </h2>
        <p className="text-xs text-slate-400">
          Personalize preferências, exportações e privacidade
        </p>
      </div>

      {dataMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            dataMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{dataMessage.text}</span>
          <button onClick={() => setDataMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Perfil do Usuário
        </h3>

        <form onSubmit={handleUpdateName} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                E-mail (Login)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {nameSavedSuccess ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> Nome salvo com sucesso!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={isUpdatingName}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {isUpdatingName ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Preferences Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Preferências e Exibição
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* Theme */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-slate-800 text-amber-600 flex items-center justify-center">
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tema da Interface
                </p>
                <span className="text-[11px] text-slate-400">
                  Atualmente: {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </span>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Alternar Tema
            </button>
          </div>

          {/* Privacy */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Modo de Privacidade
                </p>
                <span className="text-[11px] text-slate-400">
                  Ocultar valores financeiros na tela principal
                </span>
              </div>
            </div>

            <button
              onClick={toggleHideBalances}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                hideBalances
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {hideBalances ? 'Oculto' : 'Visível'}
            </button>
          </div>

          {/* Currency format */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Moeda e Localização
              </p>
              <span className="text-[11px] text-slate-400">
                Padrão brasileiro: Real (R$) e datas DD/MM/AAAA
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
              pt-BR (BRL)
            </span>
          </div>
        </div>
      </div>

      {/* Data Management & Export Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Dados, Exportação e Backup
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportCSV}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 text-left flex items-center gap-3 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Exportar para Excel (CSV)
              </h4>
              <p className="text-[10px] text-slate-400">
                Planilha com todas as movimentações
              </p>
            </div>
          </button>

          <button
            onClick={handleExportJSON}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 text-left flex items-center gap-3 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
              <Download size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Backup Completo (JSON)
              </h4>
              <p className="text-[10px] text-slate-400">
                Cópia de segurança de todos os seus dados
              </p>
            </div>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <button
            onClick={handleLoadDemo}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={14} className="text-emerald-600" />
            <span>Carregar Dados Demonstrativos</span>
          </button>

          <button
            onClick={handleResetData}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            <span>Limpar Todos os Lançamentos</span>
          </button>
        </div>
      </div>

      {/* Logout button */}
      <div className="pt-2 flex flex-col items-center justify-center space-y-4">
        <button
          onClick={logout}
          className="px-6 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <LogOut size={16} />
          <span>Sair da Minha Conta</span>
        </button>

        <div className="pt-4 text-center select-none opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-center gap-2">
            <img src="/coinvy-logo.png" alt="COINVY" className="w-6 h-6 rounded-lg object-cover" />
            <span className="font-extrabold text-xs tracking-tight text-slate-800 dark:text-slate-200">
              COIN<span className="text-emerald-500">VY</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Inteligência para cuidar do seu dinheiro. • Versão 2.0
          </p>
        </div>
      </div>

    </div>
  );
};
