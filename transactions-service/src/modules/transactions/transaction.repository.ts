import { randomUUID } from 'node:crypto';
import { Transaction } from './transaction.model.js';

/**
 * Repositorio en memoria (scaffold). Reemplazable por una base de datos
 * sin modificar el servicio ni el controlador.
 */
const store: Transaction[] = [];

export class TransactionRepository {
  static async create(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const tx: Transaction = {
      ...data,
      id: `txn_${randomUUID()}`,
      createdAt: new Date().toISOString()
    };
    store.push(tx);
    return tx;
  }

  static async findByUser(userId: string, category?: string): Promise<Transaction[]> {
    return store
      .filter((t) => t.userId === userId && (!category || t.category === category))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  static async clear(): Promise<void> {
    store.length = 0;
  }
}
