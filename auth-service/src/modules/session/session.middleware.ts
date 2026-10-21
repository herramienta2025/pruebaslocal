import { Request, Response, NextFunction } from 'express';
import { SessionValidator } from './session.validator.js';
import { SafeUser } from '../users/user.model.js';

// Extendemos Request de Express para adjuntar el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

/**
 * Middleware Express para proteger rutas privadas.
 * Consume estrictamente el módulo central SessionValidator.
 */
export async function requireAuthSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  const result = await SessionValidator.validateSessionToken(authHeader);

  if (!result.isValid || !result.user) {
    res.status(401).json({
      success: false,
      error: result.error || 'No autorizado: sesión inválida o no provista'
    });
    return;
  }

  req.user = result.user;
  next();
}
