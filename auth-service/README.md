# auth-service (Microservicio de Autenticación de Centavo)

Este microservicio se encarga de la identidad del usuario, el registro seguro, el inicio de sesión y la emisión/validación centralizada de sesiones (JWT) dentro del ecosistema **Centavo**.

---

## Directivas y Reglas Obligatorias de Arquitectura

1. **Confidencialidad de Credenciales y Tokens:**
   - Queda estrictamente prohibido registrar o imprimir credenciales (contraseñas, hashes, claves secretas) o tokens de sesión en texto plano en logs de depuración, consola o auditorías.
   - Cualquier sistema de log debe aplicar sanitización automática (`[REDACTED]`).

2. **Módulo Central Único de Validación de Sesión:**
   - Toda validación de sesión y verificación de tokens en el servicio **debe pasar exclusivamente por el módulo central** (`src/modules/session/session.validator.ts`).
   - Ningún controlador, ruta o servicio auxiliar puede verificar o descodificar tokens de forma independiente o duplicada.

3. **Política de Hashing de Contraseñas:**
   - La lógica de hashing está centralizada en `src/security/password.hasher.ts`.
   - **Justificación criptográfica:** Se utiliza `bcrypt` con 10 rondas de sal (`saltRounds = 10`). Esta configuración proporciona un factor de coste computacional adaptativo que mitiga ataques de fuerza bruta masiva y ataques por diccionario o GPUs, a la vez que mantiene tiempos de respuesta rápidos (<100ms) para una experiencia de usuario fluida. Cada usuario recibe una sal criptográfica independiente para invalidar ataques con tablas rainbow.
   - **Regla estricta:** Cualquier modificación a este algoritmo o factor de coste requiere justificación explícita previa en el plan de cambios antes de ejecutarse.

---

## Endpoints de la API

Base URL por defecto: `http://localhost:3001` (prefijo `/api/auth`)

### 1. Registro de Usuario
- **Ruta:** `POST /api/auth/register`
- **Body (JSON):**
  ```json
  {
    "email": "usuario@centavo.app",
    "password": "PasswordSeguro123",
    "name": "Usuario Centavo" // opcional
  }
  ```
- **Respuesta Exitosa (201 Created):**
  ```json
  {
    "user": {
      "id": "usr_...",
      "email": "usuario@centavo.app",
      "name": "Usuario Centavo"
    },
    "token": "eyJhbGciOi..."
  }
  ```

### 2. Inicio de Sesión (Login)
- **Ruta:** `POST /api/auth/login`
- **Body (JSON):**
  ```json
  {
    "email": "usuario@centavo.app",
    "password": "PasswordSeguro123"
  }
  ```
- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "user": {
      "id": "usr_...",
      "email": "usuario@centavo.app",
      "name": "Usuario Centavo"
    },
    "token": "eyJhbGciOi..."
  }
  ```

### 3. Verificación de Sesión (Session Validation)
- **Ruta:** `GET /api/auth/verify` o `GET /api/auth/session`
- **Header:** `Authorization: Bearer <token>`
- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "valid": true,
    "user": {
      "id": "usr_...",
      "email": "usuario@centavo.app",
      "name": "Usuario Centavo"
    }
  }
  ```
- **Respuesta de Token Inválido o Expirado (401 Unauthorized):**
  ```json
  {
    "valid": false,
    "error": "Token inválido o expirado"
  }
  ```

### 4. Health Check
- **Ruta:** `GET /health` o `GET /api/auth/health`
- **Respuesta (200 OK):** `{"status":"ok","service":"auth-service"}`

---

## Estructura del Código

```text
auth-service/
├── src/
│   ├── app.ts                         # Configuración de Express, middlewares globales y rutas
│   ├── index.ts                       # Punto de arranque y escucha en el puerto
│   ├── config/
│   │   └── env.ts                     # Variables de entorno tipadas
│   ├── modules/
│   │   ├── auth/                      # Lógica de registro y login
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.service.ts
│   │   ├── session/                   # Único módulo central de validación de sesión
│   │   │   ├── session.validator.ts   # Validador central único (regla AGENTS.MD)
│   │   │   ├── session.routes.ts      # Endpoint /verify y /session
│   │   │   └── session.middleware.ts  # Middleware Express que consume session.validator
│   │   └── users/                     # Repositorio y modelo de usuarios
│   │       ├── user.model.ts
│   │       └── user.repository.ts
│   ├── security/
│   │   ├── password.hasher.ts         # Hashing con bcrypt y justificación criptográfica
│   │   └── sanitize.ts                # Redacción de datos confidenciales
│   └── utils/
│       └── logger.ts                  # Logger seguro que nunca imprime tokens ni credenciales
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Scripts Disponibles

- `npm run dev`: Inicia el servidor en modo desarrollo con recarga automática.
- `npm run build`: Compila TypeScript a JavaScript en `./dist`.
- `npm start`: Ejecuta el servidor compilado en producción.
