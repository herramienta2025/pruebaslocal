export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO 8601
  createdAt: string;
}

export interface CreateTransactionInput {
  amount: number;
  category: string;
  date: string;
  description?: string;
  type?: TransactionType;
}

/** Vista pública de una transacción (sin userId interno). */
export type PublicTransaction = Omit<Transaction, 'userId'>;

export function toPublicTransaction(tx: Transaction): PublicTransaction {
  const { userId: _userId, ...rest } = tx;
  return rest;
}
