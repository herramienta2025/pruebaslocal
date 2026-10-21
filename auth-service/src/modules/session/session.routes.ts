import { Router, Request, Response } from 'express';
import { SessionValidator } from './session.validator.js';

export const sessionRouter = Router();

/**
 * GET /verify (y /session)
 * Valida el token de sesión enviado en Authorization: Bearer <token>
 * Cumple con la directiva de centralización de AGENTS.MD
 */
sessionRouter.get('/verify', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const result = await SessionValidator.validateSessionToken(authHeader);

  if (!result.isValid || !result.user) {
    res.status(401).json({
      valid: false,
      error: result.error || 'Token inválido o expirado'
    });
    return;
  }

  res.status(200).json({
    valid: true,
    user: result.user
  });
});

// Alias conveniente
sessionRouter.get('/session', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const result = await SessionValidator.validateSessionToken(authHeader);

  if (!result.isValid || !result.user) {
    res.status(401).json({
      valid: false,
      error: result.error || 'Token inválido o expirado'
    });
    return;
  }

  res.status(200).json({
    valid: true,
    user: result.user
  });
});
