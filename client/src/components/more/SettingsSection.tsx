import React, { useState, useRef } from 'react';
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
  Database,
  AlertTriangle,
  RotateCcw,
  X,
  Camera,
  Upload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { api } from '../../services/api';
import { localDb } from '../../services/storage';
import { exportTransactionsCSV, downloadFile } from '../../utils/export';
import { SupabaseModal } from '../SupabaseModal';
import { isSupabaseConfigured } from '../../services/supabase';

export const SettingsSection: React.FC = () => {
  const { user, updateUser, updateAvatar, theme, toggleTheme, setThemeMode, hideBalances, toggleHideBalances, logout } = useAuth();
  const { refreshData } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false);
  const [dataMessage, setDataMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const isSupabaseActive = isSupabaseConfigured();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          updateAvatar(dataUrl);
          setNameSavedSuccess(true);
          setTimeout(() => setNameSavedSuccess(false), 3000);
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (window.confirm('Deseja remover sua foto de perfil e voltar para a inicial do seu nome?')) {
      updateAvatar(null);
    }
  };

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
        a.download = `dim_movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`;
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
        a.download = `dim_backup_${new Date().toISOString().slice(0, 10)}.json`;
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

  const handleConfirmResetData = async () => {
    setIsResetting(true);
    try {
      const res = await api.reports.resetData();
      setDataMessage({ text: res.message || 'Todos os dados foram zerados com sucesso!', type: 'success' });
      setShowResetModal(false);
      await refreshData();
    } catch (err: any) {
      setDataMessage({ text: err.message || 'Erro ao zerar dados.', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetData = () => {
    setShowResetModal(true);
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
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Perfil do Usuário
        </h3>

        {/* Avatar / Photo Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-800 dark:text-emerald-200 font-extrabold text-2xl select-none">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(user?.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Alterar foto de perfil"
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-transform active:scale-90"
            >
              <Camera size={14} />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Foto de Perfil
              </h4>
              <p className="text-xs text-slate-400">
                Adicione sua foto para personalizar seu perfil no DIM+
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Upload size={13} />
                <span>{user?.avatar_url ? 'Trocar Foto' : 'Adicionar Foto'}</span>
              </button>

              {user?.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 size={13} />
                  <span>Remover Foto</span>
                </button>
              )}
            </div>
          </div>
        </div>

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
                placeholder="Seu nome"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <CheckCircle2 size={14} /> Dados atualizados com sucesso!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={isUpdatingName}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {isUpdatingName ? 'Salvando...' : 'Salvar Nome'}
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
          {/* Theme Switcher Segmented */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-slate-800 text-amber-600 flex items-center justify-center shrink-0">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Modo de Exibição
                </p>
                <span className="text-[11px] text-slate-400">
                  {theme === 'dark' ? 'Modo Escuro ativado' : 'Modo Claro ativado'}
                </span>
              </div>
            </div>

            {/* Segmented Light / Dark Toggle Buttons */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  theme === 'light'
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-500/40'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun size={14} className={theme === 'light' ? 'text-amber-500' : ''} />
                <span>Modo Claro</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-emerald-400 shadow-sm border border-emerald-500/40'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon size={14} className={theme === 'dark' ? 'text-emerald-400' : ''} />
                <span>Modo Escuro</span>
              </button>
            </div>
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

      {/* Supabase Cloud Database Integration */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Sincronização em Nuvem (Supabase)
              </h3>
              <p className="text-[11px] text-slate-400">
                {isSupabaseActive
                  ? 'Conectado: Seus dados estão sincronizados na nuvem em tempo real.'
                  : 'Desconectado: Seus dados estão salvos apenas neste navegador.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isSupabaseActive
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {isSupabaseActive ? 'Configurado' : 'Conectar Nuvem'}
          </button>
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
            onClick={() => setShowResetModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            <span>Zerar Todos os Lançamentos</span>
          </button>
        </div>
      </div>

      {/* Zona de Gerenciamento & Segurança: Zerar Dados e Sair */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
          <AlertTriangle size={15} />
          Gerenciamento da Conta & Dados
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Opções para zerar o aplicativo e começar do início ou desconectar sua conta com segurança.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Zerar Dados */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-left transition-all group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <RotateCcw size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Zerar o Aplicativo
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Apaga movimentações e zera saldos para recomeçar
              </p>
            </div>
          </button>

          {/* Sair do App */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <LogOut size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Sair do Aplicativo
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Desconectar com segurança deste dispositivo
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Brand footer */}
      <div className="pt-2 flex flex-col items-center justify-center space-y-4">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="px-6 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <LogOut size={16} />
          <span>Sair da Minha Conta</span>
        </button>

        <div className="pt-4 text-center select-none opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-center gap-2">
            <img src="/dim-logo.png" alt="DIM+" className="w-6 h-6 rounded-lg object-cover" />
            <span className="font-extrabold text-xs tracking-tight text-slate-800 dark:text-slate-200">
              DIM<span className="text-emerald-500">+</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Seu dinheiro, sob controle. • Versão 2.0
          </p>
        </div>
      </div>

      {/* Modal de Confirmação para Zerar Dados */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Zerar Dados do Aplicativo?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ação definitiva de limpeza
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl space-y-2 text-xs text-rose-800 dark:text-rose-200">
              <p className="font-semibold">Esta ação irá apagar com segurança:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-700 dark:text-rose-300">
                <li>Todas as movimentações (receitas, despesas e transferências)</li>
                <li>Os saldos de todas as contas voltarão para R$ 0,00</li>
                <li>Orçamentos e metas financeiras serão reiniciados</li>
              </ul>
              <p className="text-[11px] font-bold pt-1">
                Suas contas e categorias continuarão cadastradas para você começar a usar do zero.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetData}
                disabled={isResetting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Trash2 size={15} />
                <span>{isResetting ? 'Zerando dados...' : 'Sim, Zerar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Sair do App */}
      {showLogoutModal && (
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
                  Desconectar sua sessão atual
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você será desconectado com segurança do <strong>DIM+</strong>. Todos os seus dados continuarão salvos na sua conta e você poderá entrar novamente a qualquer momento com seu e-mail e senha.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
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

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigSaved={refreshData}
      />

    </div>
  );
};
