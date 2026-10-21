import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  transactionsServiceUrl: process.env.TRANSACTIONS_SERVICE_URL || 'http://localhost:3002',
  budgetsServiceUrl: process.env.BUDGETS_SERVICE_URL || 'http://localhost:3003',
  storageDir: path.resolve(process.cwd(), process.env.REPORTS_STORAGE_DIR || './storage/reports')
};
