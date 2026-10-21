import {
  CreateTransactionInput,
  PublicTransaction,
  toPublicTransaction
} from './transaction.model.js';
import { TransactionRepository } from './transaction.repository.js';

export class ValidationError extends Error {}

export class TransactionService {
  static validate(input: unknown): Required<Pick<CreateTransactionInput, 'amount' | 'category' | 'date'>> &
    Pick<CreateTransactionInput, 'description' | 'type'> {
    const body = (input ?? {}) as Record<string, unknown>;

    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
      throw new ValidationError('El monto debe ser un número mayor a 0');
    }
    if (typeof body.category !== 'string' || !body.category.trim()) {
      throw new ValidationError('La categoría es obligatoria');
    }
    if (typeof body.date !== 'string' || Number.isNaN(Date.parse(body.date))) {
      throw new ValidationError('La fecha es obligatoria y debe tener formato ISO 8601');
    }
    if (body.type !== undefined && body.type !== 'expense' && body.type !== 'income') {
      throw new ValidationError("El tipo debe ser 'expense' o 'income'");
    }
    if (body.description !== undefined && typeof body.description !== 'string') {
      throw new ValidationError('La descripción debe ser texto');
    }

    return {
      amount: body.amount,
      category: body.category.trim(),
      date: new Date(body.date).toISOString(),
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      type: body.type as CreateTransactionInput['type']
    };
  }

  static async create(userId: string, input: unknown): Promise<PublicTransaction> {
    const data = TransactionService.validate(input);
    const tx = await TransactionRepository.create({
      userId,
      amount: data.amount,
      category: data.category,
      date: data.date,
      description: data.description ?? '',
      type: data.type ?? 'expense'
    });
    return toPublicTransaction(tx);
  }

  static async list(userId: string, category?: string): Promise<PublicTransaction[]> {
    const items = await TransactionRepository.findByUser(userId, category);
    return items.map(toPublicTransaction);
  }
}
