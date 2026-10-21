import React from 'react';
import { Receipt, PlusCircle, Sparkles } from 'lucide-react';

interface EmptyTransactionsProps {
  onAddTransaction?: () => void;
}

export const EmptyTransactions: React.FC<EmptyTransactionsProps> = ({ onAddTransaction }) => {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon-container">
        <Receipt size={40} className="icon-emerald" />
        <div className="empty-state-sparkle">
          <Sparkles size={16} />
        </div>
      </div>

      <h3 className="empty-state-title">No hay transacciones registradas</h3>
      
      <p className="empty-state-description">
        Tu historial de gastos e ingresos está vacío por ahora. Registra tu primer movimiento para comenzar a controlar tus presupuestos y recibir alertas tempranas.
      </p>

      <div className="empty-state-actions">
        <button
          type="button"
          onClick={onAddTransaction}
          className="btn-secondary"
        >
          <PlusCircle size={18} />
          <span>Registrar primer gasto</span>
        </button>
      </div>

      <div className="empty-state-hint">
        <span>💡 Consejo: Las transacciones se vincularán automáticamente con tus presupuestos mensuales.</span>
      </div>
    </div>
  );
};
