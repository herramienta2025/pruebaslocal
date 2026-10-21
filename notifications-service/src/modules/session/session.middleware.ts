import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/env.js';
import { Logger } from '../../utils/logger.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware que delega la validación de sesión en auth-service
 * (GET /api/auth/verify). Este servicio nunca verifica ni decodifica
 * tokens por su cuenta, y nunca los loguea.
 */
export async function requireAuthSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'No autorizado: sesión no provista' });
    return;
  }

  try {
    const response = await fetch(`${config.authServiceUrl}/api/auth/verify`, {
      headers: { Authorization: authHeader }
    });

    if (!response.ok) {
      res.status(401).json({ error: 'No autorizado: sesión inválida o expirada' });
      return;
    }

    const data = (await response.json()) as { valid?: boolean; user?: AuthenticatedUser };
    if (!data.valid || !data.user) {
      res.status(401).json({ error: 'No autorizado: sesión inválida' });
      return;
    }

    req.user = data.user;
    next();
  } catch (err: unknown) {
    Logger.error('auth-service no disponible para validar sesión', {
      error: err instanceof Error ? err.message : String(err)
    });
    res.status(503).json({ error: 'Servicio de autenticación no disponible' });
  }
}

/**
 * Middleware de autenticación opcional: si se envía header Authorization,
 * valida contra auth-service y puebla req.user. Si no se envía header,
 * continúa para permitir eventos internos de servicio a servicio.
 */
export async function optionalAuthSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  try {
    const response = await fetch(`${config.authServiceUrl}/api/auth/verify`, {
      headers: { Authorization: authHeader }
    });

    if (!response.ok) {
      res.status(401).json({ error: 'No autorizado: sesión inválida o expirada' });
      return;
    }

    const data = (await response.json()) as { valid?: boolean; user?: AuthenticatedUser };
    if (!data.valid || !data.user) {
      res.status(401).json({ error: 'No autorizado: sesión inválida' });
      return;
    }

    req.user = data.user;
    next();
  } catch (err: unknown) {
    Logger.error('auth-service no disponible para validar sesión opcional', {
      error: err instanceof Error ? err.message : String(err)
    });
    res.status(503).json({ error: 'Servicio de autenticación no disponible' });
  }
}
