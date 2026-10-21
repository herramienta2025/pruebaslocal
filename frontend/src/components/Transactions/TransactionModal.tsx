import React, { useState } from 'react';
import { X, DollarSign, Tag, Calendar, FileText, Loader2 } from 'lucide-react';
import { CreateTransactionData } from '../../services/TransactionService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionData) => Promise<void>;
}

const CATEGORIES = [
  'Comida',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Otros'
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Comida');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(today);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    if (!category.trim()) {
      setError('Por favor selecciona una categoría');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        amount: numericAmount,
        category: category.trim(),
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
        type
      });
      // Limpiar formulario y cerrar
      setAmount('');
      setDescription('');
      setDate(today);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Registrar Movimiento</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="alert-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {/* Tipo de movimiento */}
          <div className="form-group">
            <label className="form-label">Tipo de movimiento</label>
            <div className="type-toggle-group">
              <button
                type="button"
                className={`type-toggle-btn ${type === 'expense' ? 'active expense' : ''}`}
                onClick={() => setType('expense')}
              >
                Gasto
              </button>
              <button
                type="button"
                className={`type-toggle-btn ${type === 'income' ? 'active income' : ''}`}
                onClick={() => setType('income')}
              >
                Ingreso
              </button>
            </div>
          </div>

          {/* Monto */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-amount">
              Monto ($)
            </label>
            <div className="input-wrapper">
              <DollarSign size={18} className="input-icon" />
              <input
                id="tx-amount"
                type="number"
                step="any"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="form-input"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-category">
              Categoría
            </label>
            <div className="input-wrapper">
              <Tag size={18} className="input-icon" />
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input form-select"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-description">
              Descripción (opcional)
            </label>
            <div className="input-wrapper">
              <FileText size={18} className="input-icon" />
              <input
                id="tx-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Almuerzo restaurante"
                className="form-input"
              />
            </div>
          </div>

          {/* Fecha */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-date">
              Fecha
            </label>
            <div className="input-wrapper">
              <Calendar size={18} className="input-icon" />
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Movimiento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
