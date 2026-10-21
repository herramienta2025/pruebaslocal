import { describe, it, beforeEach, after, before } from 'node:test';
import assert from 'node:assert';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { app } from '../app.js';
import { TransactionService, ValidationError } from '../modules/transactions/transaction.service.js';
import { TransactionRepository } from '../modules/transactions/transaction.repository.js';
import { sanitizeData } from '../security/sanitize.js';

describe('transactions-service', () => {
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
    await TransactionRepository.clear();

    // Mock por defecto para auth-service /api/auth/verify
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/api/auth/verify')) {
        const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
        if (authHeader && authHeader === 'Bearer valid-token') {
          return new Response(
            JSON.stringify({
              valid: true,
              user: { id: 'usr_test_1', email: 'test@centavo.app', name: 'Tester' }
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

  describe('Capa de Servicio (TransactionService)', () => {
    it('crea una transacción válida con defaults', async () => {
      const tx = await TransactionService.create('u1', {
        amount: 25.5,
        category: 'Comida',
        date: '2026-10-20'
      });
      assert.ok(tx.id.startsWith('txn_'));
      assert.strictEqual(tx.type, 'expense');
      assert.strictEqual(tx.category, 'Comida');
      assert.strictEqual(tx.amount, 25.5);
      assert.ok(!('userId' in tx));
    });

    it('rechaza monto inválido, categoría vacía y fecha inválida', async () => {
      await assert.rejects(() => TransactionService.create('u1', { amount: -1, category: 'x', date: '2026-10-20' }), ValidationError);
      await assert.rejects(() => TransactionService.create('u1', { amount: 0, category: 'x', date: '2026-10-20' }), ValidationError);
      await assert.rejects(() => TransactionService.create('u1', { amount: 1, category: '   ', date: '2026-10-20' }), ValidationError);
      await assert.rejects(() => TransactionService.create('u1', { amount: 1, category: 'x', date: 'fecha-invalida' }), ValidationError);
    });

    it('lista solo las transacciones del usuario, filtrables por categoría', async () => {
      await TransactionService.create('u1', { amount: 1, category: 'A', date: '2026-10-01' });
      await TransactionService.create('u1', { amount: 2, category: 'B', date: '2026-10-02' });
      await TransactionService.create('u2', { amount: 3, category: 'A', date: '2026-10-03' });

      assert.strictEqual((await TransactionService.list('u1')).length, 2);
      assert.strictEqual((await TransactionService.list('u1', 'A')).length, 1);
      assert.strictEqual((await TransactionService.list('u3')).length, 0);
    });
  });

  describe('Sanitización de Datos y Seguridad (AGENTS.MD)', () => {
    it('redacta tokens y campos sensibles en logs', () => {
      const sensitive = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
        authorization: 'Bearer token-secreto',
        amount: 100
      };
      const sanitized = sanitizeData(sensitive) as Record<string, unknown>;
      assert.strictEqual(sanitized.token, '[REDACTED]');
      assert.strictEqual(sanitized.authorization, '[REDACTED]');
      assert.strictEqual(sanitized.amount, 100);
    });
  });

  describe('Endpoints HTTP (/api/transactions)', () => {
    it('GET /health debe retornar 200 con status ok', async () => {
      const res = await originalFetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as { status: string; service: string };
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.service, 'transactions-service');
    });

    it('POST /api/transactions rechaza requests sin token (401)', async () => {
      const res = await originalFetch(`${baseUrl}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10, category: 'Comida', date: '2026-10-20' })
      });
      assert.strictEqual(res.status, 401);
    });

    it('POST /api/transactions crea una transacción con monto, categoría y fecha (201)', async () => {
      const res = await originalFetch(`${baseUrl}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token'
        },
        body: JSON.stringify({
          amount: 45.5,
          category: 'Transporte',
          date: '2026-10-21T10:00:00.000Z',
          description: 'Gasolina'
        })
      });

      assert.strictEqual(res.status, 201);
      const body = (await res.json()) as Record<string, unknown>;
      assert.ok(typeof body.id === 'string');
      assert.strictEqual(body.amount, 45.5);
      assert.strictEqual(body.category, 'Transporte');
      assert.strictEqual(body.type, 'expense');
      assert.strictEqual(body.description, 'Gasolina');
    });

    it('POST /api/transactions valida campos requeridos (400)', async () => {
      const res = await originalFetch(`${baseUrl}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token'
        },
        body: JSON.stringify({ amount: -5, category: '', date: 'invalido' })
      });
      assert.strictEqual(res.status, 400);
      const body = (await res.json()) as { error: string };
      assert.ok(body.error);
    });

    it('GET /api/transactions lista las transacciones creadas para el usuario (200)', async () => {
      // Crear 1 transacción primero
      await originalFetch(`${baseUrl}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token'
        },
        body: JSON.stringify({
          amount: 99.9,
          category: 'Servicios',
          date: '2026-10-21T08:00:00.000Z'
        })
      });

      const res = await originalFetch(`${baseUrl}/api/transactions`, {
        headers: { Authorization: 'Bearer valid-token' }
      });
      assert.strictEqual(res.status, 200);
      const list = (await res.json()) as Array<Record<string, unknown>>;
      assert.ok(Array.isArray(list));
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].category, 'Servicios');
      assert.strictEqual(list[0].amount, 99.9);
    });
  });
});
