import { config } from '../../config/env.js';
import { Logger } from '../../utils/logger.js';
import { Budget } from './budget.model.js';
import { BudgetRepository } from './budget.repository.js';

export class BudgetClient {
  /**
   * Obtiene el presupuesto aplicable para un usuario y categoría.
   * Primero intenta consultar a budgets-service vía HTTP; si no responde o falla,
   * recurre al repositorio local de presupuestos.
   */
  static async getBudgetForCategory(userId: string, category: string, authHeader?: string): Promise<Budget | undefined> {
    try {
      const url = `${config.budgetsServiceUrl}/api/budgets?category=${encodeURIComponent(category)}&userId=${encodeURIComponent(userId)}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(url, { headers, signal: AbortSignal.timeout(1500) });

      if (response.ok) {
        const data = (await response.json()) as { budget?: Budget } | Budget | Budget[];
        if (Array.isArray(data) && data.length > 0) {
          return data[0];
        }
        if (data && typeof data === 'object') {
          if ('budget' in data && data.budget) return data.budget;
          if ('limit' in data) return data as Budget;
        }
      }
    } catch {
      // Si budgets-service no está en línea o no está disponible, usamos el fallback local
      Logger.debug(`budgets-service no disponible en ${config.budgetsServiceUrl}, usando fallback local`);
    }

    // Fallback: repositorio local en memoria
    return BudgetRepository.findByUserAndCategory(userId, category);
  }
}
