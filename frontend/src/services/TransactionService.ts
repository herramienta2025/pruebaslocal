import { Transaction } from '../types';

const API_BASE_URL = import.meta.env.VITE_TRANSACTIONS_API_URL || 'http://localhost:3002/api/transactions';

export interface CreateTransactionData {
  amount: number;
  category: string;
  description?: string;
  date: string;
  type?: 'expense' | 'income';
}

export class TransactionService {
  /**
   * Obtiene la lista de transacciones del usuario.
   * Inicialmente retorna un listado vacío cumpliendo los requerimientos del scaffold.
   */
  static async getTransactions(token?: string): Promise<Transaction[]> {
    try {
      const response = await fetch(API_BASE_URL, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Si el servicio de transacciones no responde aún, retornar lista vacía
      console.info('Transactions service not reachable, returning initial empty list.');
    }

    // Lista vacía inicial para el scaffold
    return [];
  }

  /**
   * Crea una nueva transacción (gasto o ingreso) en el microservicio de transacciones.
   */
  static async createTransaction(data: CreateTransactionData, token?: string): Promise<Transaction> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar la transacción');
    }

    return await response.json();
  }
}
