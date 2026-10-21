import { randomUUID } from 'node:crypto';
import { Budget } from './budget.model.js';

/**
 * Repositorio en memoria de presupuestos (scaffold).
 * Permite almacenar y consultar presupuestos localmente, útil para
 * fallback, testing y funcionamiento desacoplado del microservicio.
 */
const budgetStore: Map<string, Budget> = new Map();

function buildKey(userId: string, category: string): string {
  return `${userId}:${category.trim().toLowerCase()}`;
}

export class BudgetRepository {
  static async findByUserAndCategory(userId: string, category: string): Promise<Budget | undefined> {
    return budgetStore.get(buildKey(userId, category));
  }

  static async setBudget(data: {
    userId: string;
    category: string;
    limit: number;
    spent?: number;
    period?: 'monthly' | 'weekly' | 'annual';
    warningThreshold?: number;
  }): Promise<Budget> {
    const key = buildKey(data.userId, data.category);
    const existing = budgetStore.get(key);
    const now = new Date().toISOString();

    const budget: Budget = {
      id: existing?.id ?? `bgt_${randomUUID()}`,
      userId: data.userId,
      category: data.category.trim(),
      limit: data.limit,
      spent: data.spent ?? existing?.spent ?? 0,
      period: data.period ?? existing?.period ?? 'monthly',
      warningThreshold: data.warningThreshold ?? existing?.warningThreshold ?? 0.8,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    budgetStore.set(key, budget);
    return budget;
  }

  static async updateSpent(userId: string, category: string, additionalAmount: number): Promise<Budget | undefined> {
    const key = buildKey(userId, category);
    const budget = budgetStore.get(key);
    if (!budget) return undefined;

    budget.spent = Math.round((budget.spent + additionalAmount) * 100) / 100;
    budget.updatedAt = new Date().toISOString();
    budgetStore.set(key, budget);
    return budget;
  }

  static async listByUser(userId: string): Promise<Budget[]> {
    return Array.from(budgetStore.values()).filter((b) => b.userId === userId);
  }

  static async clear(): Promise<void> {
    budgetStore.clear();
  }
}
