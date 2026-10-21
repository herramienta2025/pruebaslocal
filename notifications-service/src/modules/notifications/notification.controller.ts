import { Request, Response } from 'express';
import { NotificationService, ValidationError } from './notification.service.js';
import { BudgetRepository } from '../budgets/budget.repository.js';
import { Logger } from '../../utils/logger.js';

export class NotificationController {
  /**
   * Endpoint principal para recibir el evento de una nueva transacción
   * y determinar, contra el presupuesto correspondiente, si genera una alerta.
   */
  static async processTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.body?.userId as string) || '';
      const authHeader = req.headers.authorization;

      const result = await NotificationService.processTransactionEvent(userId, req.body, authHeader);
      const statusCode = result.alertGenerated ? 201 : 200;
      res.status(statusCode).json(result);
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      Logger.error('Error al procesar evento de transacción para alertas', {
        error: err instanceof Error ? err.message : String(err)
      });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Lista las notificaciones del usuario autenticado.
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const unreadOnly = req.query.unreadOnly === 'true';
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;

      const items = await NotificationService.list(userId, { unreadOnly, category });
      res.status(200).json(items);
    } catch (err: unknown) {
      Logger.error('Error al listar notificaciones', {
        error: err instanceof Error ? err.message : String(err)
      });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Marca una notificación como leída.
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const notification = await NotificationService.markAsRead(id, userId);
      res.status(200).json(notification);
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(404).json({ error: err.message });
        return;
      }
      Logger.error('Error al marcar notificación como leída', {
        error: err instanceof Error ? err.message : String(err)
      });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Elimina una notificación.
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await NotificationService.delete(id, userId);
      res.status(200).json({ message: 'Notificación eliminada exitosamente' });
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(404).json({ error: err.message });
        return;
      }
      Logger.error('Error al eliminar notificación', {
        error: err instanceof Error ? err.message : String(err)
      });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Configura o actualiza un presupuesto en el repositorio de presupuestos (útil para pruebas o standalone).
   */
  static async setBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.body?.userId as string) || '';
      const { category, limit, spent, warningThreshold, period } = req.body ?? {};

      if (!userId) {
        res.status(400).json({ error: 'userId es obligatorio' });
        return;
      }
      if (!category || typeof category !== 'string') {
        res.status(400).json({ error: 'category es obligatoria' });
        return;
      }
      if (typeof limit !== 'number' || limit <= 0) {
        res.status(400).json({ error: 'limit debe ser un número mayor a 0' });
        return;
      }

      const budget = await BudgetRepository.setBudget({
        userId,
        category,
        limit,
        spent: typeof spent === 'number' ? spent : 0,
        warningThreshold: typeof warningThreshold === 'number' ? warningThreshold : 0.8,
        period
      });

      res.status(200).json(budget);
    } catch (err: unknown) {
      Logger.error('Error al configurar presupuesto', {
        error: err instanceof Error ? err.message : String(err)
      });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Lista presupuestos configurados para el usuario.
   */
  static async listBudgets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.query?.userId as string) || '';
      if (!userId) {
        res.status(400).json({ error: 'userId es obligatorio' });
        return;
      }
      const budgets = await BudgetRepository.listByUser(userId);
      res.status(200).json(budgets);
    } catch (err: unknown) {
      Logger.error('Error al listar presupuestos', {
        error: err instanceof Error ? err.message : String(err)
      });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
