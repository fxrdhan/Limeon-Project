/**
 * Test Helper Utilities
 *
 * Common utilities for writing cleaner and more maintainable tests
 */

import { vi, beforeEach, afterEach, expect } from 'vitest';

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wait for the next tick
 */
export const waitForNextTick = () => wait(0);

/**
 * Flush all pending promises
 */
export const flushPromises = () => {
  return new Promise(resolve => setImmediate(resolve));
};

/**
 * Mock console methods to avoid cluttering test output
 */
export const mockConsole = () => {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.info = vi.fn();
    console.debug = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });
};

/**
 * Create a spy that can be used to assert function calls
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSpy = <T extends (...args: any[]) => any>(
  implementation?: T
): ReturnType<typeof vi.fn<T>> => {
  return vi.fn(implementation);
};

/**
 * Assert that a function was called with specific arguments
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const assertCalledWith = <T extends any[]>(
  spy: ReturnType<typeof vi.fn>,
  ...expectedArgs: T
) => {
  expect(spy).toHaveBeenCalledWith(...expectedArgs);
};

/**
 * Mock local storage
 */
export const mockLocalStorage = () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn((index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
      get length() {
        return Object.keys(store).length;
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
};

/**
 * Mock session storage
 */
export const mockSessionStorage = () => {
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn((index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
      get length() {
        return Object.keys(store).length;
      },
    };
  })();

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });

  return sessionStorageMock;
};

/**
 * Create a date string in ISO format for testing
 */
export const createTestDate = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

/**
 * Generate a random ID for testing
 */
export const generateTestId = (prefix = 'test'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};
