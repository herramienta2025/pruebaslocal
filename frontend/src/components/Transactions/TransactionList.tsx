import React from 'react';
import { ArrowDownUp, RefreshCw, AlertCircle } from 'lucide-react';
import { Transaction } from '../../types';
import { EmptyTransactions } from './EmptyTransactions';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAddTransaction?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  isLoading,
  error,
  onRefresh,
  onAddTransaction
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <section className="transaction-section">
      <div className="section-header">
        <div className="section-title-wrap">
          <div className="section-icon">
            <ArrowDownUp size={20} className="icon-emerald" />
          </div>
          <div>
            <h2 className="section-title">Últimas Transacciones</h2>
            <p className="section-subtitle">
              Movimientos recientes de ingresos y gastos personales
            </p>
          </div>
        </div>

        <div className="section-actions">
          <button
            type="button"
            onClick={onRefresh}
            className="btn-outline"
            disabled={isLoading}
            title="Refrescar lista"
          >
            <RefreshCw size={16} className={isLoading ? 'spinner' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <RefreshCw size={24} className="spinner icon-emerald" />
          <p>Cargando transacciones...</p>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyTransactions onAddTransaction={onAddTransaction} />
      ) : (
        <div className="transaction-table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} data-testid={`transaction-row-${tx.id}`}>
                  <td className="tx-desc">{tx.description || 'Gasto registrado'}</td>
                  <td>
                    <span className="tx-badge category-badge">{tx.category}</span>
                  </td>
                  <td className="tx-date">{formatDate(tx.date)}</td>
                  <td className={`tx-amount text-right ${tx.type === 'income' ? 'tx-income' : 'tx-expense'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
