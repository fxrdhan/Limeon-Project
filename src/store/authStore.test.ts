import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const {
  authServiceMock,
  clearClientBrowserStateForLogoutMock,
  loadAuthServiceMock,
  loadUserProfileByIdMock,
  markUserOfflineForLogoutMock,
  syncRealtimeAuthTokenMock,
} = vi.hoisted(() => ({
  authServiceMock: {
    signInWithEmailPassword: vi.fn(),
    signOut: vi.fn(),
  },
  clearClientBrowserStateForLogoutMock: vi.fn(),
  loadAuthServiceMock: vi.fn(),
  loadUserProfileByIdMock: vi.fn(),
  markUserOfflineForLogoutMock: vi.fn(),
  syncRealtimeAuthTokenMock: vi.fn(),
}));

vi.mock('./authStoreServices', () => ({
  clearClientBrowserStateForLogout: clearClientBrowserStateForLogoutMock,
  ensureAuthStateSubscription: vi.fn(),
  loadAuthService: loadAuthServiceMock,
  loadUserProfileById: loadUserProfileByIdMock,
  markUserOfflineForLogout: markUserOfflineForLogoutMock,
  syncRealtimeAuthToken: syncRealtimeAuthTokenMock,
}));

const createDeferred = <T>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    reject: (reason?: unknown) => {
      rejectPromise?.(reason);
    },
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const importFreshAuthStore = async () => {
  vi.resetModules();
  loadAuthServiceMock.mockResolvedValue(authServiceMock);
  const { useAuthStore } = await import('./authStore');
  useAuthStore.setState({
    error: null,
    loading: false,
    session: { access_token: 'token' },
    user: {
      email: 'apoteker@example.com',
      id: 'user-1',
      name: 'Apoteker',
      profilephoto: null,
      profilephoto_path: null,
      profilephoto_thumb: null,
      role: 'admin',
    },
  } as never);
  return useAuthStore;
};

describe('authStore logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authServiceMock.signOut.mockReset();
    authServiceMock.signInWithEmailPassword.mockReset();
    clearClientBrowserStateForLogoutMock.mockResolvedValue(undefined);
    loadUserProfileByIdMock.mockResolvedValue({
      email: 'apoteker@example.com',
      id: 'user-1',
      name: 'Apoteker',
      profilephoto: null,
      profilephoto_path: null,
      profilephoto_thumb: null,
      role: 'admin',
    });
    markUserOfflineForLogoutMock.mockResolvedValue(undefined);
  });

  it('ignores duplicate logout calls while sign out is pending', async () => {
    const signOut = createDeferred<void>();
    authServiceMock.signOut.mockReturnValue(signOut.promise);
    const useAuthStore = await importFreshAuthStore();

    const firstLogout = useAuthStore.getState().logout();
    const secondLogout = useAuthStore.getState().logout();
    await Promise.resolve();
    await Promise.resolve();

    expect(markUserOfflineForLogoutMock).toHaveBeenCalledOnce();
    expect(loadAuthServiceMock).toHaveBeenCalledOnce();
    expect(authServiceMock.signOut).toHaveBeenCalledOnce();

    signOut.reject(new Error('network down'));
    await Promise.all([firstLogout, secondLogout]);
  });

  it('allows logout retry after a failed logout releases the in-flight guard', async () => {
    authServiceMock.signOut
      .mockRejectedValueOnce(new Error('first failure'))
      .mockRejectedValueOnce(new Error('second failure'));
    const useAuthStore = await importFreshAuthStore();

    await useAuthStore.getState().logout();
    await useAuthStore.getState().logout();

    expect(authServiceMock.signOut).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().error).toBe('second failure');
  });
});

describe('authStore login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authServiceMock.signInWithEmailPassword.mockReset();
    loadUserProfileByIdMock.mockReset();
    loadAuthServiceMock.mockReset();
    loadUserProfileByIdMock.mockResolvedValue({
      email: 'apoteker@example.com',
      id: 'user-1',
      name: 'Apoteker',
      profilephoto: null,
      profilephoto_path: null,
      profilephoto_thumb: null,
      role: 'admin',
    });
  });

  it('ignores duplicate login calls while sign in is pending', async () => {
    const signIn = createDeferred<{
      session: { access_token: string; user: { id: string } };
    }>();
    authServiceMock.signInWithEmailPassword.mockReturnValue(signIn.promise);
    const useAuthStore = await importFreshAuthStore();
    useAuthStore.setState({
      error: null,
      loading: false,
      session: null,
      user: null,
    } as never);

    const firstLogin = useAuthStore
      .getState()
      .login('apoteker@example.com', 'secret');
    const secondLogin = useAuthStore
      .getState()
      .login('apoteker@example.com', 'secret');
    await Promise.resolve();
    await Promise.resolve();

    expect(loadAuthServiceMock).toHaveBeenCalledOnce();
    expect(authServiceMock.signInWithEmailPassword).toHaveBeenCalledOnce();

    signIn.resolve({
      session: {
        access_token: 'token',
        user: { id: 'user-1' },
      },
    });
    await Promise.all([firstLogin, secondLogin]);

    expect(loadUserProfileByIdMock).toHaveBeenCalledOnce();
    expect(syncRealtimeAuthTokenMock).toHaveBeenCalledWith('token');
    expect(useAuthStore.getState().user?.id).toBe('user-1');
  });

  it('allows login retry after a failed login releases the in-flight guard', async () => {
    authServiceMock.signInWithEmailPassword
      .mockRejectedValueOnce(new Error('first failure'))
      .mockRejectedValueOnce(new Error('second failure'));
    const useAuthStore = await importFreshAuthStore();
    useAuthStore.setState({
      error: null,
      loading: false,
      session: null,
      user: null,
    } as never);

    await useAuthStore.getState().login('apoteker@example.com', 'secret');
    await useAuthStore.getState().login('apoteker@example.com', 'secret');

    expect(authServiceMock.signInWithEmailPassword).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().error).toBe('second failure');
  });
});
