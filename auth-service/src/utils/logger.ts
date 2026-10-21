import { sanitizeData } from '../security/sanitize.js';

export class Logger {
  private static format(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta !== undefined ? ` | ${JSON.stringify(sanitizeData(meta))}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  static info(message: string, meta?: unknown): void {
    console.info(this.format('info', message, meta));
  }

  static warn(message: string, meta?: unknown): void {
    console.warn(this.format('warn', message, meta));
  }

  static error(message: string, meta?: unknown): void {
    console.error(this.format('error', message, meta));
  }

  static debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, meta));
    }
  }
}
