import { app } from './app.js';
import { config } from './config/env.js';
import { Logger } from './utils/logger.js';

function bootstrap() {
  try {
    app.listen(config.port, () => {
      Logger.info(`notifications-service iniciado exitosamente en el puerto ${config.port}`);
      Logger.info(`Ambiente: ${config.nodeEnv}`);
      Logger.info(`Rutas disponibles:`);
      Logger.info(` - POST http://localhost:${config.port}/api/notifications/events/transaction-created`);
      Logger.info(` - GET  http://localhost:${config.port}/api/notifications`);
      Logger.info(` - GET  http://localhost:${config.port}/health`);
    });
  } catch (error) {
    Logger.error('Error fatal al iniciar notifications-service', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

bootstrap();
