import { config } from '../../config/env.js';
import { Logger } from '../../utils/logger.js';

export interface BudgetItem {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent?: number;
  period?: 'monthly' | 'weekly' | 'annual';
  warningThreshold?: number;
}

export class BudgetsClient {
  private static localFallbackBudgets: Map<string, BudgetItem[]> = new Map();

  /**
   * Permite inyectar presupuestos de prueba o fallback para un usuario.
   */
  static setFallbackBudgets(userId: string, budgets: BudgetItem[]): void {
    this.localFallbackBudgets.set(userId, [...budgets]);
  }

  static clearFallback(): void {
    this.localFallbackBudgets.clear();
  }

  /**
   * Obtiene la lista de presupuestos configurados para el usuario.
   * Si budgets-service no está disponible, utiliza fallback local.
   */
  static async getBudgets(userId: string, authHeader?: string): Promise<BudgetItem[]> {
    if (authHeader) {
      try {
        const url = `${config.budgetsServiceUrl}/api/budgets?userId=${encodeURIComponent(userId)}`;
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'Authorization': authHeader
        };

        const response = await fetch(url, { headers, signal: AbortSignal.timeout(2000) });

        if (response.ok) {
          const data = (await response.json()) as BudgetItem[] | { budgets?: BudgetItem[] };
          if (Array.isArray(data)) {
            return data;
          }
          if (data && typeof data === 'object' && Array.isArray((data as { budgets?: BudgetItem[] }).budgets)) {
            return (data as { budgets: BudgetItem[] }).budgets;
          }
        } else {
          Logger.warn(`budgets-service respondió con status ${response.status}`);
        }
      } catch (err: unknown) {
        Logger.debug(`budgets-service no disponible en ${config.budgetsServiceUrl}, evaluando fallback`);
      }
    }

    // Fallback local en memoria
    return this.localFallbackBudgets.get(userId) || [];
  }
}
