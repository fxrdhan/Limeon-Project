import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from './logger';

const originalDev = import.meta.env.DEV;
const originalLogLevel = import.meta.env.VITE_LOG_LEVEL;

const setEnvValue = (key: string, value: unknown) => {
  try {
    Object.defineProperty(import.meta.env, key, {
      value,
      configurable: true,
    });
  } catch {
    (import.meta.env as Record<string, unknown>)[key] = value;
  }
};

const restoreEnv = () => {
  setEnvValue('DEV', originalDev);
  setEnvValue('VITE_LOG_LEVEL', originalLogLevel);
};

const createLoggerWithEnv = (overrides: {
  DEV?: boolean;
  VITE_LOG_LEVEL?: string;
}) => {
  if (overrides.DEV !== undefined) setEnvValue('DEV', overrides.DEV);
  if (overrides.VITE_LOG_LEVEL !== undefined)
    setEnvValue('VITE_LOG_LEVEL', overrides.VITE_LOG_LEVEL);

  const LoggerClass = (
    logger as unknown as { constructor: new () => typeof logger }
  ).constructor;
  const instance = new LoggerClass();
  restoreEnv();
  return instance;
};

const createLoggerWithState = (state: {
  level: LogLevel;
  isDevelopment: boolean;
  allowDebugInProd: boolean;
}) => {
  const LoggerClass = (
    logger as unknown as { constructor: new () => typeof logger }
  ).constructor;
  const instance = new LoggerClass();
  (instance as unknown as { level: LogLevel }).level = state.level;
  (instance as unknown as { isDevelopment: boolean }).isDevelopment =
    state.isDevelopment;
  (instance as unknown as { allowDebugInProd: boolean }).allowDebugInProd =
    state.allowDebugInProd;
  return instance;
};

describe('Logger', () => {
  // Save original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
    time: console.time,
    timeEnd: console.timeEnd,
    group: console.group,
    groupEnd: console.groupEnd,
    table: console.table,
  };

  beforeEach(() => {
    // Mock console methods
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.time = vi.fn();
    console.timeEnd = vi.fn();
    console.group = vi.fn();
    console.groupEnd = vi.fn();
    console.table = vi.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.time = originalConsole.time;
    console.timeEnd = originalConsole.timeEnd;
    console.group = originalConsole.group;
    console.groupEnd = originalConsole.groupEnd;
    console.table = originalConsole.table;
    delete (globalThis as { __LOG_DEV__?: boolean }).__LOG_DEV__;
    delete (globalThis as { __LOG_LEVEL__?: string }).__LOG_LEVEL__;
    restoreEnv();
  });

  describe('setLevel', () => {
    it('should allow setting log level', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.info('This should not log');

      expect(console.info).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Test info message');

      expect(console.info).toHaveBeenCalled();
    });

    it('should include context in log message', () => {
      logger.setLevel(LogLevel.INFO);
      const context = { userId: '123', action: 'login' };
      logger.info('User action', context);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('User action')
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(context))
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('Test warning');

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('Test error');

      expect(console.error).toHaveBeenCalled();
    });

    it('should handle Error objects', () => {
      logger.setLevel(LogLevel.ERROR);
      const error = new Error('Test error message');
      logger.error('An error occurred', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred')
      );
    });

    it('should handle unknown error types', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('An error occurred', 'string error');

      expect(console.error).toHaveBeenCalled();
    });

    it('should not log when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.error('Error should be suppressed');

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('debug and tooling utilities', () => {
    it('should log debug and timing utilities when allowed in prod', () => {
      const prodDebugLogger = createLoggerWithState({
        level: LogLevel.DEBUG,
        isDevelopment: false,
        allowDebugInProd: true,
      });

      prodDebugLogger.debug('Debug message');
      prodDebugLogger.time('timer');
      prodDebugLogger.timeEnd('timer');
      prodDebugLogger.group('group');
      prodDebugLogger.groupEnd();
      prodDebugLogger.table([{ id: 1 }]);

      expect(console.debug).toHaveBeenCalled();
      expect(console.time).toHaveBeenCalledWith('timer');
      expect(console.timeEnd).toHaveBeenCalledWith('timer');
      expect(console.group).toHaveBeenCalledWith('group');
      expect(console.groupEnd).toHaveBeenCalled();
      expect(console.table).toHaveBeenCalled();
    });

    it('should not log debug or tooling utilities when disabled in prod', () => {
      const prodLogger = createLoggerWithState({
        level: LogLevel.INFO,
        isDevelopment: false,
        allowDebugInProd: false,
      });

      prodLogger.debug('Debug message');
      prodLogger.time('timer');
      prodLogger.timeEnd('timer');
      prodLogger.group('group');
      prodLogger.groupEnd();
      prodLogger.table([{ id: 1 }]);

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.time).not.toHaveBeenCalled();
      expect(console.timeEnd).not.toHaveBeenCalled();
      expect(console.group).not.toHaveBeenCalled();
      expect(console.groupEnd).not.toHaveBeenCalled();
      expect(console.table).not.toHaveBeenCalled();
    });

    it('should respect configured DEBUG level from env', () => {
      const prodLogger = createLoggerWithEnv({
        DEV: false,
        VITE_LOG_LEVEL: 'DEBUG',
      });

      prodLogger.debug('Debug message');

      expect(console.debug).toHaveBeenCalled();
    });

    it('should fall back when VITE_LOG_LEVEL is invalid', () => {
      (globalThis as { __LOG_LEVEL__?: string }).__LOG_LEVEL__ = 'INVALID';
      (globalThis as { __LOG_DEV__?: boolean }).__LOG_DEV__ = false;
      const LoggerClass = (
        logger as unknown as { constructor: new () => typeof logger }
      ).constructor;
      const fallbackLogger = new LoggerClass();

      expect(
        (fallbackLogger as unknown as { allowDebugInProd: boolean })
          .allowDebugInProd
      ).toBe(false);
      expect((fallbackLogger as unknown as { level: LogLevel }).level).toBe(
        LogLevel.WARN
      );
    });
  });

  describe('log level filtering', () => {
    it('should not log messages below the set level', () => {
      logger.setLevel(LogLevel.ERROR);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log messages at or above the set level', () => {
      logger.setLevel(LogLevel.WARN);

      logger.warn('Warn message');
      logger.error('Error message');

      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
