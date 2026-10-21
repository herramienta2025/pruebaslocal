import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { sessionRouter } from './modules/session/session.routes.js';
import { requireAuthSession } from './modules/session/session.middleware.js';
import { Logger } from './utils/logger.js';

export const app = express();

// Middlewares estándar
app.use(cors({
  origin: config.corsOrigin === '*' ? true : config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de auditoría HTTP seguro (NUNCA loguea tokens ni contraseñas)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info(`HTTP ${req.method} ${req.path} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

app.get('/api/auth/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// Rutas de autenticación y sesión bajo /api/auth
app.use('/api/auth', authRouter);
app.use('/api/auth', sessionRouter);

// Endpoint protegido de ejemplo: perfil del usuario autenticado
app.get('/api/auth/me', requireAuthSession, (req: Request, res: Response) => {
  res.status(200).json({ user: req.user });
});

// Manejador 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador global de errores (Sanitizado)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  Logger.error('Error no controlado en la aplicación', { error: err.message });
  res.status(500).json({ error: 'Error interno del servidor' });
});
