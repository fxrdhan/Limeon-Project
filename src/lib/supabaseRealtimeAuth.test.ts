import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

type SessionLike = { access_token: string };
type SessionResponse = { data: { session: SessionLike | null } };
type AuthStateCallback = (event: string, session: SessionLike | null) => void;

const { getSessionMock, onAuthStateChangeMock, setAuthMock } = vi.hoisted(
  () => ({
    getSessionMock: vi.fn(),
    onAuthStateChangeMock: vi.fn(),
    setAuthMock: vi.fn(),
  })
);

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
    realtime: {
      setAuth: setAuthMock,
    },
  },
}));

const createDeferred = <T>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const importFreshRealtimeAuth = async () => {
  vi.resetModules();
  return import('./supabaseRealtimeAuth');
};

describe('supabaseRealtimeAuth', () => {
  let authStateCallback: AuthStateCallback | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    onAuthStateChangeMock.mockImplementation((callback: AuthStateCallback) => {
      authStateCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  it('hydrates the realtime auth token from the current session', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: { access_token: 'initial-token' },
      },
    });
    const { initializeSupabaseRealtimeAuthSync } =
      await importFreshRealtimeAuth();

    initializeSupabaseRealtimeAuthSync();
    await Promise.resolve();
    await Promise.resolve();

    expect(setAuthMock).toHaveBeenCalledWith('initial-token');
  });

  it('does not let initial hydration overwrite a newer auth state change', async () => {
    const session = createDeferred<SessionResponse>();
    getSessionMock.mockReturnValue(session.promise);
    const { initializeSupabaseRealtimeAuthSync } =
      await importFreshRealtimeAuth();

    initializeSupabaseRealtimeAuthSync();
    authStateCallback?.('SIGNED_OUT', null);

    session.resolve({
      data: {
        session: { access_token: 'stale-token' },
      },
    });
    await session.promise;
    await Promise.resolve();

    expect(setAuthMock).toHaveBeenCalledOnce();
    expect(setAuthMock).toHaveBeenCalledWith(null);
    expect(setAuthMock).not.toHaveBeenCalledWith('stale-token');
  });

  it('does not let initial hydration overwrite a newer direct token sync', async () => {
    const session = createDeferred<SessionResponse>();
    getSessionMock.mockReturnValue(session.promise);
    const {
      initializeSupabaseRealtimeAuthSync,
      syncSupabaseRealtimeAuthToken,
    } = await importFreshRealtimeAuth();

    initializeSupabaseRealtimeAuthSync();
    syncSupabaseRealtimeAuthToken('fresh-token');

    session.resolve({
      data: {
        session: { access_token: 'stale-token' },
      },
    });
    await session.promise;
    await Promise.resolve();

    expect(setAuthMock).toHaveBeenCalledOnce();
    expect(setAuthMock).toHaveBeenCalledWith('fresh-token');
    expect(setAuthMock).not.toHaveBeenCalledWith('stale-token');
  });
});
