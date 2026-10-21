import {
  Notification,
  ProcessTransactionResult,
  TransactionEventInput
} from './notification.model.js';
import { NotificationRepository } from './notification.repository.js';
import { BudgetClient } from '../budgets/budget.client.js';
import { BudgetRepository } from '../budgets/budget.repository.js';

export class ValidationError extends Error {}

export class NotificationService {
  static validateEvent(input: unknown): Required<Pick<TransactionEventInput, 'amount' | 'category'>> &
    Omit<TransactionEventInput, 'amount' | 'category'> {
    const body = (input ?? {}) as Record<string, unknown>;

    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
      throw new ValidationError('El monto de la transacción debe ser un número mayor a 0');
    }

    if (typeof body.category !== 'string' || !body.category.trim()) {
      throw new ValidationError('La categoría de la transacción es obligatoria');
    }

    if (body.type !== undefined && body.type !== 'expense' && body.type !== 'income') {
      throw new ValidationError("El tipo de transacción debe ser 'expense' o 'income'");
    }

    if (body.budgetLimit !== undefined) {
      if (typeof body.budgetLimit !== 'number' || !Number.isFinite(body.budgetLimit) || body.budgetLimit <= 0) {
        throw new ValidationError('El límite de presupuesto debe ser un número mayor a 0');
      }
    }

    if (body.currentSpent !== undefined) {
      if (typeof body.currentSpent !== 'number' || !Number.isFinite(body.currentSpent) || body.currentSpent < 0) {
        throw new ValidationError('El gasto actual debe ser un número mayor o igual a 0');
      }
    }

    if (body.warningThreshold !== undefined) {
      if (
        typeof body.warningThreshold !== 'number' ||
        body.warningThreshold <= 0 ||
        body.warningThreshold > 1
      ) {
        throw new ValidationError('El umbral de advertencia debe ser un valor decimal entre 0 y 1 (ej. 0.8 para 80%)');
      }
    }

    return {
      amount: body.amount,
      category: body.category.trim(),
      userId: typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : undefined,
      transactionId: typeof body.transactionId === 'string' ? body.transactionId : undefined,
      type: (body.type as TransactionEventInput['type']) ?? 'expense',
      date: typeof body.date === 'string' ? body.date : new Date().toISOString(),
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      budgetLimit: typeof body.budgetLimit === 'number' ? body.budgetLimit : undefined,
      currentSpent: typeof body.currentSpent === 'number' ? body.currentSpent : undefined,
      warningThreshold: typeof body.warningThreshold === 'number' ? body.warningThreshold : undefined
    };
  }

  static async processTransactionEvent(
    userId: string,
    input: unknown,
    authHeader?: string
  ): Promise<ProcessTransactionResult> {
    const event = this.validateEvent(input);
    const targetUserId = event.userId || userId;

    if (!targetUserId) {
      throw new ValidationError('El identificador de usuario (userId) es obligatorio');
    }

    // Los ingresos no generan alertas de sobregasto
    if (event.type === 'income') {
      return {
        alertGenerated: false,
        reason: "Las transacciones de tipo 'income' (ingreso) no generan alertas de sobregasto"
      };
    }

    // Obtener presupuesto correspondiente:
    // 1. Si viene especificado inline en el evento (prioritario)
    // 2. Si no, consultar a budgets-service o repositorio local
    let budgetLimit: number | undefined = event.budgetLimit;
    let previousSpent: number = event.currentSpent ?? 0;
    let warningThreshold: number = event.warningThreshold ?? 0.8;

    if (budgetLimit === undefined) {
      const budget = await BudgetClient.getBudgetForCategory(targetUserId, event.category, authHeader);
      if (budget) {
        budgetLimit = budget.limit;
        previousSpent = budget.spent;
        warningThreshold = budget.warningThreshold ?? 0.8;
      }
    }

    if (budgetLimit === undefined) {
      return {
        alertGenerated: false,
        reason: `No existe un presupuesto configurado para la categoría '${event.category}'`
      };
    }

    const newTotalSpent = Math.round((previousSpent + event.amount) * 100) / 100;
    const percentage = Math.round((newTotalSpent / budgetLimit) * 10000) / 100;
    const isOverBudget = newTotalSpent > budgetLimit;
    const isNearLimit = !isOverBudget && newTotalSpent >= budgetLimit * warningThreshold;

    const evaluation = {
      category: event.category,
      limit: budgetLimit,
      previousSpent,
      transactionAmount: event.amount,
      newTotalSpent,
      percentage,
      isOverBudget,
      isNearLimit
    };

    // Actualizar el acumulado en el repositorio local para transacciones sucesivas
    await BudgetRepository.updateSpent(targetUserId, event.category, event.amount);

    if (isOverBudget) {
      const notification = await NotificationRepository.create({
        userId: targetUserId,
        type: 'budget_exceeded',
        severity: 'critical',
        title: `Presupuesto excedido en ${event.category}`,
        message: `¡Alerta de sobregasto! El gasto de $${event.amount.toFixed(2)} en '${event.category}' superó el límite asignado de $${budgetLimit.toFixed(2)}. Gasto acumulado: $${newTotalSpent.toFixed(2)} (${percentage.toFixed(1)}%).`,
        category: event.category,
        transactionId: event.transactionId,
        amount: event.amount,
        spent: newTotalSpent,
        limit: budgetLimit,
        percentage,
        read: false
      });

      return {
        alertGenerated: true,
        notification,
        budgetEvaluation: evaluation
      };
    }

    if (isNearLimit) {
      const notification = await NotificationRepository.create({
        userId: targetUserId,
        type: 'budget_warning',
        severity: 'warning',
        title: `Presupuesto cerca del límite en ${event.category}`,
        message: `Advertencia de presupuesto: El gasto acumulado en '${event.category}' alcanzó $${newTotalSpent.toFixed(2)} de un límite de $${budgetLimit.toFixed(2)} (${percentage.toFixed(1)}%).`,
        category: event.category,
        transactionId: event.transactionId,
        amount: event.amount,
        spent: newTotalSpent,
        limit: budgetLimit,
        percentage,
        read: false
      });

      return {
        alertGenerated: true,
        notification,
        budgetEvaluation: evaluation
      };
    }

    return {
      alertGenerated: false,
      reason: 'El gasto se encuentra dentro de los márgenes normales del presupuesto',
      budgetEvaluation: evaluation
    };
  }

  static async list(
    userId: string,
    options?: { unreadOnly?: boolean; category?: string }
  ): Promise<Notification[]> {
    return NotificationRepository.findByUser(userId, options);
  }

  static async markAsRead(id: string, userId: string): Promise<Notification> {
    const notif = await NotificationRepository.markAsRead(id, userId);
    if (!notif) {
      throw new ValidationError('Notificación no encontrada');
    }
    return notif;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await NotificationRepository.delete(id, userId);
    if (!deleted) {
      throw new ValidationError('Notificación no encontrada');
    }
    return true;
  }
}
