import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

const cancelQueries = vi.fn();
const clearQueries = vi.fn();
const removeAllChannels = vi.fn();
const resetPharmacyQueryPersistence = vi.fn();
const resetImageCache = vi.fn();

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    cancelQueries,
    clear: clearQueries,
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    removeAllChannels,
  },
}));

vi.mock('@/lib/indexedDBPersistence', () => ({
  resetPharmacyQueryPersistence,
}));

vi.mock('@/utils/imageCache', () => ({
  resetImageCache,
}));

const createDeleteRequest = () => {
  const request: Partial<IDBOpenDBRequest> = {};

  queueMicrotask(() => {
    request.onsuccess?.call(request as IDBOpenDBRequest, new Event('success'));
  });

  return request as IDBOpenDBRequest;
};

describe('clearClientBrowserState', () => {
  let deleteDatabase: ReturnType<typeof vi.fn>;
  let listDatabases: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cancelQueries.mockResolvedValue(undefined);
    removeAllChannels.mockResolvedValue(undefined);
    resetPharmacyQueryPersistence.mockResolvedValue(undefined);
    resetImageCache.mockResolvedValue(undefined);
    clearQueries.mockClear();

    deleteDatabase = vi.fn(() => createDeleteRequest());
    listDatabases = vi.fn().mockResolvedValue([{ name: 'runtime-cache' }]);

    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        databases: listDatabases,
        deleteDatabase,
      },
    });

    window.localStorage.setItem('persisted', 'value');
    window.sessionStorage.setItem('session', 'value');
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('runs registered cleanup contributors and deletes known browser storage', async () => {
    const { registerBrowserLogoutCleanupContributor } =
      await import('./browserLogoutCleanupRegistry');
    const { clearClientBrowserState } = await import('./browserLogoutCleanup');
    const resetRuntimeState = vi.fn();
    const resetPersistentState = vi.fn().mockResolvedValue(undefined);

    const unregister = registerBrowserLogoutCleanupContributor({
      id: 'feature-runtime',
      indexedDbNames: ['feature-runtime-cache'],
      resetRuntimeState,
      resetPersistentState,
    });

    await clearClientBrowserState();
    unregister();

    expect(resetRuntimeState).toHaveBeenCalledTimes(1);
    expect(cancelQueries).toHaveBeenCalledTimes(1);
    expect(removeAllChannels).toHaveBeenCalledTimes(1);
    expect(clearQueries).toHaveBeenCalledTimes(1);
    expect(resetImageCache).toHaveBeenCalledTimes(1);
    expect(resetPharmacyQueryPersistence).toHaveBeenCalledTimes(1);
    expect(resetPersistentState).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('persisted')).toBeNull();
    expect(window.sessionStorage.getItem('session')).toBeNull();
    expect(deleteDatabase).toHaveBeenCalledWith('pharmasys-cache');
    expect(deleteDatabase).toHaveBeenCalledWith('runtime-cache');
    expect(deleteDatabase).toHaveBeenCalledWith('feature-runtime-cache');
  });
});
