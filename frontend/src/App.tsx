import React from 'react';
import { useAuth } from './hooks/useAuth';
import { useTransactions } from './hooks/useTransactions';
import { LoginScreen } from './components/Auth/LoginScreen';
import { DashboardScreen } from './components/Dashboard/DashboardScreen';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading: isAuthLoading,
    error: authError,
    login,
    register,
    logout,
    clearError
  } = useAuth();

  const {
    transactions,
    isLoading: isTxLoading,
    error: txError,
    refreshTransactions,
    createTransaction
  } = useTransactions(token);

  if (isAuthLoading) {
    return (
      <div className="fullscreen-loader">
        <Loader2 size={36} className="spinner icon-emerald" />
        <p>Cargando Centavo...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={login}
        onRegister={register}
        isLoading={isAuthLoading}
        error={authError}
        onClearError={clearError}
      />
    );
  }

  return (
    <DashboardScreen
      user={user}
      transactions={transactions}
      isLoading={isTxLoading}
      error={txError}
      onRefresh={refreshTransactions}
      onLogout={logout}
      onCreateTransaction={createTransaction}
    />
  );
};

export default App;
