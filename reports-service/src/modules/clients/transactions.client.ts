import { config } from '../../config/env.js';
import { Logger } from '../../utils/logger.js';

export interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  date: string; // ISO 8601
  createdAt?: string;
}

export class TransactionsClient {
  private static localFallbackTransactions: Map<string, TransactionItem[]> = new Map();

  /**
   * Permite inyectar transacciones de prueba o fallback para un usuario.
   */
  static setFallbackTransactions(userId: string, transactions: TransactionItem[]): void {
    this.localFallbackTransactions.set(userId, [...transactions]);
  }

  static clearFallback(): void {
    this.localFallbackTransactions.clear();
  }

  /**
   * Obtiene la lista de transacciones del usuario desde transactions-service.
   * Si transactions-service no está disponible o falla, utiliza fallback local.
   */
  static async getTransactions(userId: string, authHeader?: string): Promise<TransactionItem[]> {
    if (authHeader) {
      try {
        const url = `${config.transactionsServiceUrl}/api/transactions`;
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'Authorization': authHeader
        };

        const response = await fetch(url, { headers, signal: AbortSignal.timeout(2000) });

        if (response.ok) {
          const data = (await response.json()) as TransactionItem[];
          if (Array.isArray(data)) {
            return data;
          }
        } else {
          Logger.warn(`transactions-service respondió con status ${response.status}`);
        }
      } catch (err: unknown) {
        Logger.debug(`transactions-service no disponible en ${config.transactionsServiceUrl}, evaluando fallback`);
      }
    }

    // Fallback local en memoria
    return this.localFallbackTransactions.get(userId) || [];
  }
}
