import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setupIndexedDBPersistenceMock = vi.hoisted(() => vi.fn());

vi.mock('./indexedDBPersistence', () => ({
  setupIndexedDBPersistence: setupIndexedDBPersistenceMock,
}));

describe('configurePersistence', () => {
  beforeEach(() => {
    setupIndexedDBPersistenceMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('configures persistence in browser environment', async () => {
    const { configurePersistence } = await import('./queryPersistence');
    const queryClient = new QueryClient();
    setupIndexedDBPersistenceMock.mockResolvedValueOnce(undefined);

    const result = await configurePersistence(queryClient);

    expect(setupIndexedDBPersistenceMock).toHaveBeenCalledWith(queryClient);
    expect(result).toBe(queryClient);
  });

  it('falls back to in-memory cache when setup fails', async () => {
    const { configurePersistence } = await import('./queryPersistence');
    const queryClient = new QueryClient();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setupIndexedDBPersistenceMock.mockRejectedValueOnce(
      new Error('indexeddb down')
    );

    const result = await configurePersistence(queryClient);

    expect(result).toBe(queryClient);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns early when window is unavailable', async () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
    });

    const { configurePersistence } = await import('./queryPersistence');
    const queryClient = new QueryClient();
    const result = await configurePersistence(queryClient);

    expect(result).toBe(queryClient);
    expect(setupIndexedDBPersistenceMock).not.toHaveBeenCalled();

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
  });
});
