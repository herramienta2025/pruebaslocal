import { app } from './app.js';
import { config } from './config/env.js';
import { Logger } from './utils/logger.js';
import { UserRepository } from './modules/users/user.repository.js';

async function bootstrap() {
  try {
    // Inicializar semillas seguras
    await UserRepository.initSeed();

    app.listen(config.port, () => {
      Logger.info(`auth-service iniciado exitosamente en el puerto ${config.port}`);
      Logger.info(`Ambiente: ${config.nodeEnv}`);
      Logger.info(`Rutas disponibles:`);
      Logger.info(` - POST http://localhost:${config.port}/api/auth/register`);
      Logger.info(` - POST http://localhost:${config.port}/api/auth/login`);
      Logger.info(` - GET  http://localhost:${config.port}/api/auth/verify`);
      Logger.info(` - GET  http://localhost:${config.port}/api/auth/session`);
      Logger.info(` - GET  http://localhost:${config.port}/api/auth/me`);
    });
  } catch (error) {
    Logger.error('Error fatal al iniciar auth-service', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

bootstrap();
