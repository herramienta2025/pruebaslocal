import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { requireAuthSession, optionalAuthSession } from '../session/session.middleware.js';

export const notificationRouter = Router();

// Endpoint que recibe evento de nueva transacción y determina alerta contra presupuesto
notificationRouter.post('/events/transaction-created', optionalAuthSession, NotificationController.processTransaction);
notificationRouter.post('/events', optionalAuthSession, NotificationController.processTransaction);

// Gestión de presupuestos local/fallback
notificationRouter.post('/budgets', optionalAuthSession, NotificationController.setBudget);
notificationRouter.get('/budgets', optionalAuthSession, NotificationController.listBudgets);

// Endpoints de usuario autenticado para consultar y gestionar sus notificaciones
notificationRouter.get('/', requireAuthSession, NotificationController.list);
notificationRouter.patch('/:id/read', requireAuthSession, NotificationController.markAsRead);
notificationRouter.delete('/:id', requireAuthSession, NotificationController.delete);
