import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { TransactionService, CreateTransactionData } from '../services/TransactionService';

export function useTransactions(token?: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await TransactionService.getTransactions(token ?? undefined);
      setTransactions(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al obtener transacciones';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const createTransaction = useCallback(async (data: CreateTransactionData): Promise<Transaction> => {
    const newTx = await TransactionService.createTransaction(data, token ?? undefined);
    setTransactions((prev) => [newTx, ...prev]);
    return newTx;
  }, [token]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    error,
    refreshTransactions: fetchTransactions,
    createTransaction
  };
}
