import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { MorePage } from './pages/MorePage';
import { TransactionModal } from './components/TransactionModal';
import { AuthPage } from './pages/AuthPage';
import { CoinvyLogo } from './components/CoinvyLogo';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('inicio');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <CoinvyLogo variant="full" size="xl" showSlogan={true} className="animate-pulse" />
        <p className="text-xs text-emerald-400/80 mt-4 font-medium tracking-wide">
          Carregando suas finanças com inteligência...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 transition-colors">
      <Navbar currentTab={currentTab} onNavigateTab={setCurrentTab} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-2 sm:p-4 animate-in fade-in duration-150">
        {currentTab === 'inicio' && <DashboardPage onNavigateTab={setCurrentTab} />}
        {currentTab === 'movimentacoes' && <TransactionsPage />}
        {currentTab === 'relatorios' && <ReportsPage />}
        {currentTab === 'perfil' && <MorePage />}
      </main>

      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      <TransactionModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainApp />
      </FinanceProvider>
    </AuthProvider>
  );
}
