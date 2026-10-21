import { Router } from 'express';
import { AuthController } from './auth.controller.js';

export const authRouter = Router();

// Endpoints públicos de autenticación
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
