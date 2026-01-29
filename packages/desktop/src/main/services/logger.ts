/**
 * Logger service - centralized logging for desktop app
 * Replaces scattered console.log calls with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // In production, only log warnings and errors
    if (!this.isDev && (level === 'debug' || level === 'info')) {
      return;
    }

    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.log(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }

    // TODO Phase 8: Write to log file for production diagnostics
    // this.writeToFile(level, message, args);
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger();
