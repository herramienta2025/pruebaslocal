# transactions-service (Microservicio de Transacciones de Centavo)

Registra y categoriza los gastos (y opcionalmente ingresos) del usuario. Almacenamiento en memoria (scaffold); el repositorio es reemplazable por una base de datos.

## Directivas

1. **Sin tokens en logs:** el logger sanitiza automáticamente (`[REDACTED]`).
2. **Sesión delegada a auth-service:** `session.middleware.ts` llama a `GET {AUTH_SERVICE_URL}/api/auth/verify`. No se verifica JWT localmente.
3. **Aislamiento por usuario:** toda consulta se filtra por el `id` del usuario autenticado.

## Endpoints (puerto por defecto `3002`)

Todos requieren `Authorization: Bearer <token>` (excepto health).

### `POST /api/transactions`
```json
{ "amount": 25.5, "category": "Comida", "date": "2026-10-20", "description": "Almuerzo", "type": "expense" }
```
`amount` (> 0), `category` y `date` (ISO 8601) son obligatorios; `description` es opcional y `type` (`expense` | `income`) por defecto es `expense`.
Respuesta `201`: `{ id, description, amount, type, category, date, createdAt }`. Errores: `400` validación, `401` sesión, `503` auth-service caído.

### `GET /api/transactions[?category=Comida]`
Respuesta `200`: arreglo de transacciones del usuario, más recientes primero (compatible con `frontend/src/services/TransactionService.ts`).

### `GET /health` o `GET /api/transactions/health`
`{"status":"ok","service":"transactions-service"}`

## Estructura

```text
transactions-service/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── config/env.ts
│   ├── modules/
│   │   ├── transactions/   # model, repository, service, controller, routes
│   │   └── session/        # middleware que valida contra auth-service
│   ├── security/sanitize.ts
│   ├── utils/logger.ts
│   └── test/transactions.test.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Scripts

- `npm run dev` · `npm run build` · `npm start` · `npm test` (requiere build previo)
