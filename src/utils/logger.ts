/**
 * Application Logger Utility
 *
 * Centralized logging solution that:
 * - Provides consistent logging interface
 * - Can be configured per environment
 * - Supports structured logging
 * - Easy to integrate with external services (Sentry, LogRocket, etc.)
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;
  private allowDebugInProd: boolean;

  constructor() {
    const devOverride = (globalThis as { __LOG_DEV__?: boolean }).__LOG_DEV__;
    this.isDevelopment = devOverride ?? import.meta.env.DEV;
    const envLogLevel =
      (globalThis as { __LOG_LEVEL__?: string }).__LOG_LEVEL__ ??
      import.meta.env.VITE_LOG_LEVEL;
    const configuredLevel = String(envLogLevel || '').toUpperCase();
    const levelMap: Record<string, LogLevel> = {
      DEBUG: LogLevel.DEBUG,
      INFO: LogLevel.INFO,
      WARN: LogLevel.WARN,
      ERROR: LogLevel.ERROR,
      NONE: LogLevel.NONE,
    };
    const resolvedLevel =
      configuredLevel && levelMap[configuredLevel] !== undefined
        ? levelMap[configuredLevel]
        : undefined;

    this.allowDebugInProd = Boolean(resolvedLevel === LogLevel.DEBUG);
    this.level =
      resolvedLevel ?? (this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN);
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  /**
   * Debug level logging - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (
      this.level <= LogLevel.DEBUG &&
      (this.isDevelopment || this.allowDebugInProd)
    ) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.level <= LogLevel.ERROR) {
      const errorContext = {
        ...context,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      };
      console.error(this.formatMessage('ERROR', message, errorContext));
    }
  }

  /**
   * Performance timing helper
   */
  time(label: string): void {
    if (this.isDevelopment || this.allowDebugInProd) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment || this.allowDebugInProd) {
      console.timeEnd(label);
    }
  }

  /**
   * Group related logs
   */
  group(label: string): void {
    if (this.isDevelopment || this.allowDebugInProd) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment || this.allowDebugInProd) {
      console.groupEnd();
    }
  }

  /**
   * Table display for structured data
   */
  table(data: unknown): void {
    if (this.isDevelopment || this.allowDebugInProd) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogContext };
