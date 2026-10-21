import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  CheckCircle2, 
  Bell
} from 'lucide-react';
import { User, Transaction } from '../../types';
import { Navbar } from '../Layout/Navbar';
import { TransactionList } from '../Transactions/TransactionList';
import { TransactionModal } from '../Transactions/TransactionModal';
import { CreateTransactionData } from '../../services/TransactionService';

interface DashboardScreenProps {
  user: User | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onLogout: () => void;
  onCreateTransaction: (data: CreateTransactionData) => Promise<Transaction>;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  transactions,
  isLoading,
  error,
  onRefresh,
  onLogout,
  onCreateTransaction
}) => {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCreate = async (data: CreateTransactionData) => {
    await onCreateTransaction(data);
    setFeedbackMessage('¡Transacción registrada exitosamente!');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Cálculos de resumen
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="dashboard-layout">
      <Navbar user={user} onLogout={onLogout} />

      <main className="dashboard-main">
        {feedbackMessage && (
          <div className="alert-info" role="status">
            <CheckCircle2 size={18} />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Header de bienvenida */}
        <section className="welcome-banner">
          <div>
            <h1 className="welcome-title">
              Hola, <span className="text-emerald">{user?.name || 'Usuario'}</span> 👋
            </h1>
            <p className="welcome-subtitle">
              Este es tu resumen financiero en tiempo real.
            </p>
          </div>

          <div className="welcome-actions">
            <button
              type="button"
              onClick={handleOpenModal}
              className="btn-primary"
              id="btn-nuevo-movimiento"
            >
              <Plus size={18} />
              <span>Nuevo Movimiento</span>
            </button>
          </div>
        </section>

        {/* Tarjetas de Balance / KPIs */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Balance Disponible</span>
              <div className="stat-icon-wrap bg-emerald-light">
                <Wallet size={20} className="icon-emerald" />
              </div>
            </div>
            <div className="stat-value">{formatCurrency(balance)}</div>
            <div className="stat-footer">
              <span className="stat-badge neutral">
                {transactions.length === 0 ? 'Sin movimientos aún' : `${transactions.length} movimientos`}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Ingresos del Mes</span>
              <div className="stat-icon-wrap bg-blue-light">
                <TrendingUp size={20} className="icon-blue" />
              </div>
            </div>
            <div className="stat-value text-blue">{formatCurrency(totalIncome)}</div>
            <div className="stat-footer">
              <span className="stat-badge neutral">
                {transactions.filter((t) => t.type === 'income').length} ingresos registrados
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Gastos del Mes</span>
              <div className="stat-icon-wrap bg-rose-light">
                <TrendingDown size={20} className="icon-rose" />
              </div>
            </div>
            <div className="stat-value text-rose">{formatCurrency(totalExpense)}</div>
            <div className="stat-footer">
              <span className="stat-badge neutral">
                {transactions.filter((t) => t.type === 'expense').length} gastos registrados
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Alertas de Presupuesto</span>
              <div className="stat-icon-wrap bg-amber-light">
                <Bell size={20} className="icon-amber" />
              </div>
            </div>
            <div className="stat-value text-amber">0 activas</div>
            <div className="stat-footer">
              <span className="stat-badge success">Presupuesto al día</span>
            </div>
          </div>
        </section>

        {/* Listado de Transacciones */}
        <TransactionList
          transactions={transactions}
          isLoading={isLoading}
          error={error}
          onRefresh={onRefresh}
          onAddTransaction={handleOpenModal}
        />
      </main>

      {/* Modal para crear transacción */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreate}
      />
    </div>
  );
};
