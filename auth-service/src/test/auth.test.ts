import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { PasswordHasher } from '../security/password.hasher.js';
import { SessionValidator } from '../modules/session/session.validator.js';
import { sanitizeData } from '../security/sanitize.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { UserRepository } from '../modules/users/user.repository.js';

describe('Auth Service Tests & AGENTS.MD Compliance', () => {
  before(async () => {
    await UserRepository.initSeed();
  });

  describe('Lógica de Hashing de Contraseñas (bcrypt 10 rondas)', () => {
    it('debe generar un hash seguro diferente al texto plano', async () => {
      const rawPassword = 'MiPasswordSeguro123!';
      const hash = await PasswordHasher.hash(rawPassword);

      assert.notStrictEqual(hash, rawPassword);
      assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
    });

    it('debe validar contraseñas correctas e invalidar contraseñas erróneas', async () => {
      const rawPassword = 'MiPasswordSeguro123!';
      const hash = await PasswordHasher.hash(rawPassword);

      const isValid = await PasswordHasher.compare(rawPassword, hash);
      const isInvalid = await PasswordHasher.compare('PasswordEquivocado', hash);

      assert.strictEqual(isValid, true);
      assert.strictEqual(isInvalid, false);
    });
  });

  describe('Sanitización de Logs y Credenciales (AGENTS.MD)', () => {
    it('debe redactor contraseñas y tokens en texto plano de cualquier objeto', () => {
      const sensitivePayload = {
        email: 'test@centavo.app',
        password: 'SuperSecretPassword',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
        authorization: 'Bearer secret-bearer-token'
      };

      const sanitized = sanitizeData(sensitivePayload) as Record<string, string>;

      assert.strictEqual(sanitized.email, 'test@centavo.app');
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.token, '[REDACTED]');
      assert.strictEqual(sanitized.authorization, '[REDACTED]');
    });

    it('debe redactar strings que contengan tokens Bearer', () => {
      const bearerHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc';
      const sanitized = sanitizeData(bearerHeader);
      assert.strictEqual(sanitized, 'Bearer [REDACTED_TOKEN]');
    });
  });

  describe('Módulo Central Único de Sesión (SessionValidator)', () => {
    it('debe emitir y validar un token de sesión legítimo', async () => {
      const safeUser = {
        id: 'usr_01',
        email: 'usuario@centavo.app',
        name: 'Usuario Demo',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const token = SessionValidator.generateSessionToken(safeUser);
      assert.ok(typeof token === 'string' && token.length > 20);

      // Validación a través del módulo central
      const validation = await SessionValidator.validateSessionToken(`Bearer ${token}`);
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.user?.id, safeUser.id);
      assert.strictEqual(validation.user?.email, safeUser.email);
    });

    it('debe rechazar tokens corruptos o manipulados', async () => {
      const corruptedToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalido.firma_falsa';
      const validation = await SessionValidator.validateSessionToken(corruptedToken);

      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.error?.includes('Sesión inválida o expirada'));
    });

    it('debe rechazar llamadas sin token', async () => {
      const validation = await SessionValidator.validateSessionToken(null);
      assert.strictEqual(validation.isValid, false);
    });
  });

  describe('Flujos de Registro y Login (AuthService)', () => {
    it('debe autenticar al usuario seed demo con credenciales correctas', async () => {
      const session = await AuthService.login({
        email: 'usuario@centavo.app',
        password: 'centavo123'
      });

      assert.ok(session.token);
      assert.strictEqual(session.user.email, 'usuario@centavo.app');
    });

    it('debe rechazar contraseñas incorrectas en login', async () => {
      await assert.rejects(
        async () => {
          await AuthService.login({
            email: 'usuario@centavo.app',
            password: 'password_incorrecto'
          });
        },
        {
          message: 'Credenciales inválidas.'
        }
      );
    });

    it('debe registrar un nuevo usuario y permitir login posterior', async () => {
      const newEmail = `nuevo_${Date.now()}@centavo.app`;
      const newPassword = 'PasswordFuerte456!';

      // 1. Registro
      const registerSession = await AuthService.register({
        email: newEmail,
        password: newPassword,
        name: 'Ana Centavo'
      });

      assert.ok(registerSession.token);
      assert.strictEqual(registerSession.user.email, newEmail);
      assert.strictEqual(registerSession.user.name, 'Ana Centavo');

      // 2. Validación de sesión con el token devuelto
      const sessionValidation = await SessionValidator.validateSessionToken(registerSession.token);
      assert.strictEqual(sessionValidation.isValid, true);
      assert.strictEqual(sessionValidation.user?.email, newEmail);

      // 3. Login posterior
      const loginSession = await AuthService.login({
        email: newEmail,
        password: newPassword
      });

      assert.ok(loginSession.token);
      assert.strictEqual(loginSession.user.id, registerSession.user.id);
    });

    it('debe rechazar registro duplicado con el mismo email', async () => {
      await assert.rejects(
        async () => {
          await AuthService.register({
            email: 'usuario@centavo.app',
            password: 'centavo123_otro'
          });
        },
        {
          message: 'Ya existe una cuenta registrada con este correo electrónico.'
        }
      );
    });
  });
});
