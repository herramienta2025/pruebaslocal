import { Request, Response } from 'express';
import { TransactionService, ValidationError } from './transaction.service.js';
import { Logger } from '../../utils/logger.js';

export class TransactionController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const tx = await TransactionService.create(req.user!.id, req.body);
      res.status(201).json(tx);
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      Logger.error('Error al crear transacción', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const items = await TransactionService.list(req.user!.id, category);
      res.status(200).json(items);
    } catch (err: unknown) {
      Logger.error('Error al listar transacciones', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
