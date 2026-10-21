import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { Logger } from '../../utils/logger.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;
      const result = await AuthService.register({ email, password, name });
      res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error interno al registrar usuario';
      Logger.error('Error en controlador de registro', { error: message });
      res.status(400).json({ error: message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error interno al iniciar sesión';
      Logger.warn('Error en controlador de login', { error: message });
      res.status(401).json({ error: message });
    }
  }
}
