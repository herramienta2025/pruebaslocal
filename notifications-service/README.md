# notifications-service (Microservicio de Alertas y Notificaciones de Centavo)

Microservicio independiente responsable de procesar eventos de transacciones, evaluar el consumo financiero frente al presupuesto correspondiente y generar alertas oportunas de sobregasto o proximidad al límite presupuestario.

Almacenamiento en memoria (scaffold desacoplado); el repositorio es reemplazable por una base de datos persistente.

---

## Directivas

1. **Sin tokens en logs:** El logger sanitiza automáticamente credenciales y encabezados de autorización (`[REDACTED]`).
2. **Sesión delegada a auth-service:** Las rutas de usuario delegan la validación de sesión en `GET {AUTH_SERVICE_URL}/api/auth/verify`. No se verifican tokens JWT localmente.
3. **Aislamiento por usuario:** Cada usuario solo puede consultar y gestionar sus propias notificaciones y presupuestos.
4. **Evaluación de alertas determinista:**
   - Si el gasto acumulado supera el límite del presupuesto (`spent > limit`), se emite una alerta crítica de sobregasto (`budget_exceeded`).
   - Si el gasto acumulado alcanza o supera el umbral de advertencia (`spent >= limit * warningThreshold`, por defecto 80%), se emite una alerta de advertencia (`budget_warning`).
   - Si no se supera el umbral o la transacción es de tipo ingreso (`income`), no se genera alerta.

---

## Endpoints (puerto por defecto `3004`)

### `POST /api/notifications/events/transaction-created` (o `/api/notifications/events`)
Recibe el evento de una nueva transacción y evalúa contra el presupuesto si corresponde generar una alerta.
Puede invocarse tanto con encabezado `Authorization: Bearer <token>` como de servicio a servicio enviando `userId` en el payload.

**Body de ejemplo:**
```json
{
  "userId": "usr_123",
  "transactionId": "txn_abc",
  "amount": 75.0,
  "category": "Comida",
  "type": "expense",
  "date": "2026-10-21T12:00:00.000Z",
  "budgetLimit": 100.0,
  "currentSpent": 50.0
}
```
*Nota:* Si `budgetLimit` no se provee en el body, el servicio consulta a `budgets-service` (o a su repositorio local de presupuestos si está offline).

**Respuesta cuando genera alerta (`201 Created`):**
```json
{
  "alertGenerated": true,
  "notification": {
    "id": "notif_uuid",
    "userId": "usr_123",
    "type": "budget_exceeded",
    "severity": "critical",
    "title": "Presupuesto excedido en Comida",
    "message": "¡Alerta de sobregasto! El gasto de $75.00 en 'Comida' superó el límite asignado de $100.00. Gasto acumulado: $125.00 (125.0%).",
    "category": "Comida",
    "transactionId": "txn_abc",
    "amount": 75,
    "spent": 125,
    "limit": 100,
    "percentage": 125,
    "read": false,
    "createdAt": "2026-10-21T12:00:01.000Z"
  },
  "budgetEvaluation": {
    "category": "Comida",
    "limit": 100,
    "previousSpent": 50,
    "transactionAmount": 75,
    "newTotalSpent": 125,
    "percentage": 125,
    "isOverBudget": true,
    "isNearLimit": false
  }
}
```

**Respuesta cuando NO genera alerta (`200 OK`):**
```json
{
  "alertGenerated": false,
  "reason": "El gasto se encuentra dentro de los márgenes normales del presupuesto",
  "budgetEvaluation": {
    "category": "Comida",
    "limit": 100,
    "previousSpent": 10,
    "transactionAmount": 20,
    "newTotalSpent": 30,
    "percentage": 30,
    "isOverBudget": false,
    "isNearLimit": false
  }
}
```

---

### `GET /api/notifications[?unreadOnly=true&category=Comida]`
Requiere `Authorization: Bearer <token>`. Retorna las alertas del usuario ordenadas de más reciente a más antigua.

### `PATCH /api/notifications/:id/read`
Requiere `Authorization: Bearer <token>`. Marca la alerta como leída.

### `DELETE /api/notifications/:id`
Requiere `Authorization: Bearer <token>`. Elimina una alerta del usuario.

### `POST /api/notifications/budgets`
Configura un presupuesto en el almacén local del microservicio (útil para pruebas y operación desacoplada).
```json
{
  "userId": "usr_123",
  "category": "Comida",
  "limit": 200,
  "spent": 50,
  "warningThreshold": 0.8
}
```

### `GET /health` o `GET /api/notifications/health`
Retorna estado del servicio:
```json
{
  "status": "ok",
  "service": "notifications-service"
}
```

---

## Estructura

```text
notifications-service/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── config/
│   │   └── env.ts
│   ├── modules/
│   │   ├── budgets/
│   │   │   ├── budget.client.ts
│   │   │   ├── budget.model.ts
│   │   │   └── budget.repository.ts
│   │   ├── notifications/
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.model.ts
│   │   │   ├── notification.repository.ts
│   │   │   ├── notification.routes.ts
│   │   │   └── notification.service.ts
│   │   └── session/
│   │       └── session.middleware.ts
│   ├── security/
│   │   └── sanitize.ts
│   ├── utils/
│   │   └── logger.ts
│   └── test/
│       └── notifications.test.ts
├── .env.example
├── AGENTS.MD
├── package.json
├── README.md
└── tsconfig.json
```

---

## Scripts

- `npm run dev`: Inicia el servicio en modo desarrollo con recarga en vivo (`tsx watch`).
- `npm run build`: Compila TypeScript a JavaScript en `./dist`.
- `npm start`: Inicia la aplicación compilada desde `./dist`.
- `npm test`: Ejecuta la suite de pruebas unitarias y de integración (`node --test`).
