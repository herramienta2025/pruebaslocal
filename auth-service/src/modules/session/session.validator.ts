import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { UserRepository } from '../users/user.repository.js';
import { SafeUser, toSafeUser } from '../users/user.model.js';
import { Logger } from '../../utils/logger.js';

export interface JwtSessionPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface SessionValidationResult {
  isValid: boolean;
  user?: SafeUser;
  error?: string;
}

/**
 * ============================================================================
 * MÓDULO CENTRAL ÚNICO DE VALIDACIÓN DE SESIÓN (Requerimiento estricto AGENTS.MD)
 * ============================================================================
 * Regla: "Toda validación de sesión debe pasar por un solo módulo central."
 * 
 * Este módulo es la única autoridad dentro del servicio para:
 * 1. Generar tokens de sesión JWT.
 * 2. Verificar la validez criptográfica del token y su expiración.
 * 3. Validar la existencia y estado activo del usuario asociado a la sesión.
 * 
 * Cualquier middleware, controlador o ruta que requiera validar una sesión DEBE
 * invocar `SessionValidator.validateSessionToken()`.
 * ============================================================================
 */
export class SessionValidator {
  /**
   * Genera un nuevo token de sesión firmado para un usuario verificado.
   */
  static generateSessionToken(user: SafeUser): string {
    const payload: JwtSessionPayload = {
      userId: user.id,
      email: user.email
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn']
    });
  }

  /**
   * Valida un token de sesión de forma centralizada.
   * Regla de seguridad: Nunca loguea el token en texto plano.
   */
  static async validateSessionToken(token: string | undefined | null): Promise<SessionValidationResult> {
    if (!token || typeof token !== 'string') {
      return {
        isValid: false,
        error: 'Token no proporcionado o formato inválido'
      };
    }

    // Limpieza de prefijo 'Bearer ' si está presente
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();

    if (!cleanToken) {
      return {
        isValid: false,
        error: 'Token de sesión vacío'
      };
    }

    try {
      // Verificación criptográfica y de caducidad del JWT
      const decoded = jwt.verify(cleanToken, config.jwtSecret) as JwtSessionPayload;

      if (!decoded || !decoded.userId) {
        return {
          isValid: false,
          error: 'Payload del token de sesión inválido'
        };
      }

      // Verificación de la identidad del usuario en el repositorio
      const userRecord = await UserRepository.findById(decoded.userId);
      if (!userRecord) {
        Logger.warn('Intento de validación de sesión para usuario inexistente', {
          userId: decoded.userId
        });
        return {
          isValid: false,
          error: 'El usuario asociado a la sesión ya no existe'
        };
      }

      const safeUser = toSafeUser(userRecord);

      return {
        isValid: true,
        user: safeUser
      };
    } catch (err: unknown) {
      const jwtError = err instanceof Error ? err.message : 'Error al verificar token';
      Logger.debug('Fallo en la validación centralizada de sesión', { reason: jwtError });

      return {
        isValid: false,
        error: `Sesión inválida o expirada (${jwtError})`
      };
    }
  }
}
