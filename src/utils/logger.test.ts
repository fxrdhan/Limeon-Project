import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from './logger';

describe('Logger', () => {
  // Save original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    // Mock console methods
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
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
