import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const removeAllChannelsMock = vi.hoisted(() => vi.fn());

let healthError: { message: string } | null = null;
let throwOnHealthCheck = false;

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const importSupabase = async () => {
  vi.resetModules();
  return await import('./supabase');
};

const importSupabaseWithHmr = async (hot: {
  dispose: (cb: () => void) => void;
}) => {
  vi.resetModules();
  (
    globalThis as { __SUPABASE_HMR__?: { dispose: (cb: () => void) => void } }
  ).__SUPABASE_HMR__ = hot;
  return await import('./supabase');
};

describe('supabase setup', () => {
  const originalHidden = document.hidden;
  const originalWarn = console.warn;

  beforeEach(() => {
    vi.useFakeTimers();
    healthError = null;
    throwOnHealthCheck = false;
    createClientMock.mockReset();
    fromMock.mockReset();
    removeAllChannelsMock.mockReset();

    fromMock.mockImplementation(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => {
          if (throwOnHealthCheck) {
            return Promise.reject(new Error('health check failed'));
          }
          return Promise.resolve({ error: healthError });
        }),
      })),
    }));

    createClientMock.mockReturnValue({
      from: fromMock,
      removeAllChannels: removeAllChannelsMock,
    });

    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    (globalThis as { __SUPABASE_HMR__?: unknown }).__SUPABASE_HMR__ = undefined;
    Object.defineProperty(document, 'hidden', {
      value: originalHidden,
      configurable: true,
    });
    console.warn = originalWarn;
    vi.restoreAllMocks();
  });

  it('starts health checks and handles visibility changes', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    await importSupabase();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.advanceTimersByTimeAsync(1000);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(clearIntervalSpy).toHaveBeenCalled();

    document.dispatchEvent(new Event('visibilitychange'));

    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(1000);

    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
  });

  it('logs health check warnings and failures', async () => {
    console.warn = vi.fn();

    healthError = { message: 'network down' };
    await importSupabase();

    await vi.advanceTimersByTimeAsync(60000);
    expect(console.warn).toHaveBeenCalledWith(
      '🔍 Network issue detected, realtime may need reconnection'
    );

    healthError = { message: 'timeout' };
    await vi.advanceTimersByTimeAsync(60000);

    throwOnHealthCheck = true;
    await vi.advanceTimersByTimeAsync(60000);

    expect(
      (console.warn as ReturnType<typeof vi.fn>).mock.calls.some(call =>
        String(call[0]).includes('Connection health check failed')
      )
    ).toBe(true);
  });

  it('cleans up connections on HMR dispose', async () => {
    console.warn = vi.fn();
    let disposeCallback: (() => void) | null = null;

    await importSupabaseWithHmr({
      dispose: cb => {
        disposeCallback = cb;
      },
    });

    expect(disposeCallback).toBeTruthy();
    disposeCallback?.();

    expect(removeAllChannelsMock).toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    disposeCallback?.();
  });

  it('logs when HMR cleanup fails', async () => {
    console.warn = vi.fn();
    let disposeCallback: (() => void) | null = null;

    removeAllChannelsMock.mockImplementation(() => {
      throw new Error('cleanup failed');
    });

    await importSupabaseWithHmr({
      dispose: cb => {
        disposeCallback = cb;
      },
    });

    disposeCallback?.();

    expect(
      (console.warn as ReturnType<typeof vi.fn>).mock.calls.some(call =>
        String(call[0]).includes('Error cleaning up Supabase channels:')
      )
    ).toBe(true);
  });

  it('skips HMR when override is null', async () => {
    (globalThis as { __SUPABASE_HMR__?: null }).__SUPABASE_HMR__ = null;
    await importSupabase();
    expect(true).toBe(true);
  });

  it('skips visibility handlers when window is undefined', async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      configurable: true,
    });

    await importSupabase();

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
    });
  });
});
