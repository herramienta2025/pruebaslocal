import { Router } from 'express';
import { TransactionController } from './transaction.controller.js';
import { requireAuthSession } from '../session/session.middleware.js';

export const transactionRouter = Router();

// Todos los endpoints requieren sesión válida
transactionRouter.use(requireAuthSession);
transactionRouter.post('/', TransactionController.create);
transactionRouter.get('/', TransactionController.list);
