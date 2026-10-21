import { describe, it, beforeEach, after, before } from 'node:test';
import assert from 'node:assert';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { app } from '../app.js';
import { NotificationService, ValidationError } from '../modules/notifications/notification.service.js';
import { NotificationRepository } from '../modules/notifications/notification.repository.js';
import { BudgetRepository } from '../modules/budgets/budget.repository.js';
import { sanitizeData } from '../security/sanitize.js';

describe('notifications-service', () => {
  let server: Server;
  let baseUrl: string;
  const originalFetch = globalThis.fetch;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    await NotificationRepository.clear();
    await BudgetRepository.clear();

    // Mock por defecto para auth-service /api/auth/verify
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/api/auth/verify')) {
        const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
        if (authHeader && authHeader === 'Bearer valid-token') {
          return new Response(
            JSON.stringify({
              valid: true,
              user: { id: 'usr_test_1', email: 'tester@centavo.app', name: 'Tester' }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ valid: false, error: 'Token inválido' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    };
  });

  describe('Capa de Servicio (NotificationService) y Lógica de Alertas', () => {
    it('valida campos requeridos del evento de transacción', () => {
      assert.throws(
        () => NotificationService.validateEvent({ amount: -10, category: 'Comida' }),
        ValidationError
      );
      assert.throws(
        () => NotificationService.validateEvent({ amount: 10, category: '   ' }),
        ValidationError
      );
      assert.throws(
        () => NotificationService.validateEvent({ amount: 10, category: 'Comida', type: 'invalido' }),
        ValidationError
      );
    });

    it('genera alerta crítica de sobregasto cuando la transacción excede el presupuesto', async () => {
      // Presupuesto de 100 con 80 ya gastado; nueva transacción de 30 (total 110 > 100)
      const result = await NotificationService.processTransactionEvent('usr_1', {
        amount: 30,
        category: 'Restaurantes',
        budgetLimit: 100,
        currentSpent: 80
      });

      assert.strictEqual(result.alertGenerated, true);
      assert.ok(result.notification);
      assert.strictEqual(result.notification.type, 'budget_exceeded');
      assert.strictEqual(result.notification.severity, 'critical');
      assert.strictEqual(result.notification.limit, 100);
      assert.strictEqual(result.notification.spent, 110);
      assert.strictEqual(result.budgetEvaluation?.isOverBudget, true);
      assert.strictEqual(result.budgetEvaluation?.percentage, 110);
    });

    it('genera alerta de advertencia cuando la transacción alcanza o supera el umbral (80%)', async () => {
      // Presupuesto de 200 con 100 gastado; nueva transacción de 70 (total 170 / 200 = 85%)
      const result = await NotificationService.processTransactionEvent('usr_1', {
        amount: 70,
        category: 'Supermercado',
        budgetLimit: 200,
        currentSpent: 100
      });

      assert.strictEqual(result.alertGenerated, true);
      assert.ok(result.notification);
      assert.strictEqual(result.notification.type, 'budget_warning');
      assert.strictEqual(result.notification.severity, 'warning');
      assert.strictEqual(result.budgetEvaluation?.isNearLimit, true);
      assert.strictEqual(result.budgetEvaluation?.isOverBudget, false);
      assert.strictEqual(result.budgetEvaluation?.percentage, 85);
    });

    it('no genera alerta cuando el gasto está dentro de límites seguros', async () => {
      // Presupuesto de 500 con 50 gastado; nueva transacción de 50 (total 100 / 500 = 20%)
      const result = await NotificationService.processTransactionEvent('usr_1', {
        amount: 50,
        category: 'Educación',
        budgetLimit: 500,
        currentSpent: 50
      });

      assert.strictEqual(result.alertGenerated, false);
      assert.strictEqual(result.notification, undefined);
      assert.strictEqual(result.budgetEvaluation?.isOverBudget, false);
      assert.strictEqual(result.budgetEvaluation?.isNearLimit, false);
    });

    it('no genera alerta si la transacción es un ingreso (income)', async () => {
      const result = await NotificationService.processTransactionEvent('usr_1', {
        amount: 1500,
        category: 'Salario',
        type: 'income',
        budgetLimit: 500
      });

      assert.strictEqual(result.alertGenerated, false);
      assert.ok(result.reason?.includes('income'));
    });

    it('evalúa contra el presupuesto configurado en el repositorio cuando no se pasa inline', async () => {
      // Configurar presupuesto local
      await BudgetRepository.setBudget({
        userId: 'usr_2',
        category: 'Transporte',
        limit: 100,
        spent: 60,
        warningThreshold: 0.8
      });

      // Transacción de 50 -> total 110 > 100 -> alerta
      const result = await NotificationService.processTransactionEvent('usr_2', {
        amount: 50,
        category: 'Transporte'
      });

      assert.strictEqual(result.alertGenerated, true);
      assert.strictEqual(result.notification?.type, 'budget_exceeded');
      assert.strictEqual(result.notification?.spent, 110);
    });

    it('acumula transacciones sucesivas en el repositorio de presupuesto', async () => {
      await BudgetRepository.setBudget({
        userId: 'usr_3',
        category: 'Servicios',
        limit: 100,
        spent: 0
      });

      // Transacción 1: 50/100 (50%) -> Sin alerta
      const res1 = await NotificationService.processTransactionEvent('usr_3', {
        amount: 50,
        category: 'Servicios'
      });
      assert.strictEqual(res1.alertGenerated, false);

      // Transacción 2: 35 más -> 85/100 (85%) -> Advertencia
      const res2 = await NotificationService.processTransactionEvent('usr_3', {
        amount: 35,
        category: 'Servicios'
      });
      assert.strictEqual(res2.alertGenerated, true);
      assert.strictEqual(res2.notification?.type, 'budget_warning');

      // Transacción 3: 20 más -> 105/100 (105%) -> Excedido
      const res3 = await NotificationService.processTransactionEvent('usr_3', {
        amount: 20,
        category: 'Servicios'
      });
      assert.strictEqual(res3.alertGenerated, true);
      assert.strictEqual(res3.notification?.type, 'budget_exceeded');
    });
  });

  describe('Sanitización de Datos y Seguridad (AGENTS.MD)', () => {
    it('redacta tokens de autorización y campos sensibles en logs', () => {
      const data = {
        authorization: 'Bearer super-secret-jwt-token',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
        password: 'my-password',
        amount: 150
      };
      const sanitized = sanitizeData(data) as Record<string, unknown>;
      assert.strictEqual(sanitized.authorization, '[REDACTED]');
      assert.strictEqual(sanitized.token, '[REDACTED]');
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.amount, 150);
    });
  });

  describe('Endpoints HTTP (/api/notifications)', () => {
    it('GET /health debe retornar 200 con status ok', async () => {
      const res = await originalFetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as { status: string; service: string };
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.service, 'notifications-service');
    });

    it('POST /api/notifications/events/transaction-created genera alerta (201) cuando supera límite', async () => {
      const res = await originalFetch(`${baseUrl}/api/notifications/events/transaction-created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_test_1',
          transactionId: 'txn_999',
          amount: 150,
          category: 'Entretenimiento',
          type: 'expense',
          budgetLimit: 100,
          currentSpent: 0
        })
      });

      assert.strictEqual(res.status, 201);
      const body = (await res.json()) as { alertGenerated: boolean; notification: { type: string } };
      assert.strictEqual(body.alertGenerated, true);
      assert.strictEqual(body.notification.type, 'budget_exceeded');
    });

    it('POST /api/notifications/events/transaction-created retorna 200 cuando no genera alerta', async () => {
      const res = await originalFetch(`${baseUrl}/api/notifications/events/transaction-created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_test_1',
          transactionId: 'txn_1000',
          amount: 20,
          category: 'Salud',
          type: 'expense',
          budgetLimit: 200,
          currentSpent: 10
        })
      });

      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { alertGenerated: boolean };
      assert.strictEqual(body.alertGenerated, false);
    });

    it('POST /api/notifications/events/transaction-created valida campos requeridos (400)', async () => {
      const res = await originalFetch(`${baseUrl}/api/notifications/events/transaction-created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: -50, category: '' })
      });

      assert.strictEqual(res.status, 400);
      const body = (await res.json()) as { error: string };
      assert.ok(body.error);
    });

    it('GET /api/notifications rechaza peticiones sin token de sesión (401)', async () => {
      const res = await originalFetch(`${baseUrl}/api/notifications`);
      assert.strictEqual(res.status, 401);
    });

    it('GET /api/notifications lista alertas del usuario autenticado (200)', async () => {
      // Disparar una alerta para el usuario tester
      await originalFetch(`${baseUrl}/api/notifications/events/transaction-created`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token'
        },
        body: JSON.stringify({
          amount: 150,
          category: 'Viajes',
          budgetLimit: 100,
          currentSpent: 0
        })
      });

      const res = await originalFetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: 'Bearer valid-token' }
      });
      assert.strictEqual(res.status, 200);
      const list = (await res.json()) as Array<{ id: string; category: string; read: boolean }>;
      assert.ok(Array.isArray(list));
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].category, 'Viajes');
      assert.strictEqual(list[0].read, false);

      // Probar PATCH para marcar como leída
      const patchRes = await originalFetch(`${baseUrl}/api/notifications/${list[0].id}/read`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-token' }
      });
      assert.strictEqual(patchRes.status, 200);
      const updated = (await patchRes.json()) as { read: boolean };
      assert.strictEqual(updated.read, true);
    });
  });
});
