import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, ExternalLink, Copy, Check, X, Shield, KeyRound } from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  isSupabaseConfigured,
  getSupabase,
} from '../services/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const current = getSupabaseCredentials();
  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setStatusMessage({ type: 'error', text: 'Preencha a URL e a Chave Anon do Supabase.' });
      return;
    }

    if (!cleanUrl.startsWith('https://')) {
      setStatusMessage({ type: 'error', text: 'A URL do Supabase deve começar com https://' });
      return;
    }

    setIsTesting(true);
    try {
      // Temporarily save to test
      saveSupabaseCredentials(cleanUrl, cleanKey);
      const client = getSupabase();
      if (!client) throw new Error('Não foi possível inicializar o cliente do Supabase.');

      // Ping Supabase
      const { error } = await client.from('accounts').select('id').limit(1);
      // Even if table doesn't exist yet, if auth works or response arrives, connection is alive!
      if (error && !error.message.includes('relation "public.accounts" does not exist') && !error.message.includes('permission denied')) {
        // Test auth health
        const { error: authErr } = await client.auth.getSession();
        if (authErr) throw authErr;
      }

      setStatusMessage({ type: 'success', text: 'Conexão com o Supabase estabelecida com sucesso!' });
      setTimeout(() => {
        if (onConfigSaved) onConfigSaved();
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Falha ao conectar com o Supabase. Verifique as credenciais.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setStatusMessage({ type: 'success', text: 'Supabase desconectado. Usando armazenamento local.' });
    setTimeout(() => {
      if (onConfigSaved) onConfigSaved();
      onClose();
      window.location.reload();
    }, 800);
  };

  const handleCopySqlInstructions = () => {
    const text = `-- Execute o conteúdo do arquivo supabase-schema.sql no SQL Editor do Supabase para criar as tabelas e políticas de segurança.`;
    navigator.clipboard.writeText(text);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Conectar com Supabase
                {isConfigured && (
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold rounded-full">
                    Ativo
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Banco de dados em nuvem e autenticação em tempo real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Instructions card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Como obter suas credenciais gratuitas:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                Acesse o site oficial{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink size={11} />
                </a>{' '}
                e crie um projeto gratuito chamado <strong>COINVY</strong>.
              </li>
              <li>
                No painel do projeto, acesse <strong>Project Settings → API</strong>.
              </li>
              <li>
                Copie a <strong>Project URL</strong> e a chave <strong>anon (public)</strong> e cole nos campos abaixo.
              </li>
              <li>
                No menu <strong>SQL Editor</strong> do Supabase, cole e execute o script <code>supabase-schema.sql</code> que já preparamos no projeto.
              </li>
            </ol>
          </div>

          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Project URL (URL do Projeto)
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://exemplo.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Anon / Public API Key (Chave Anônima Pública)
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="eyJhbGciOi..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={isTesting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {isTesting ? 'Verificando conexão...' : 'Salvar e Conectar Supabase'}
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-3 border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-bold text-xs rounded-xl transition-all"
                >
                  Desconectar
                </button>
              )}
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
