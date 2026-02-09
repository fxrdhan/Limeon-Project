import { beforeEach, describe, expect, it, vi } from 'vitest';

type PersistedRecord = {
  key: string;
  queryKey: unknown[];
  data: unknown;
  dataUpdatedAt: number;
  staleTime: number;
  timestamp: number;
};

type MockConfig = {
  storeExistsOnOpen?: boolean[];
  callUpgradeOnOpen?: boolean[];
  openErrorAtCall?: number;
  initialRecords?: PersistedRecord[];
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createIndexedDbMock = (config: MockConfig = {}) => {
  const records = new Map<string, PersistedRecord>();
  (config.initialRecords || []).forEach(record => {
    records.set(record.key, record);
  });

  const openCalls: number[] = [];
  const deleteCalls: number[] = [];
  let storeExists = true;

  const makeRequest = <T>(initialResult: T) => {
    return {
      result: initialResult,
      error: null as Error | null,
      onsuccess: null as ((event?: unknown) => void) | null,
      onerror: null as ((event?: unknown) => void) | null,
      onupgradeneeded: null as ((event?: unknown) => void) | null,
    };
  };

  const createStore = () => ({
    put: vi.fn((payload: PersistedRecord) => {
      records.set(payload.key, payload);
    }),
    get: vi.fn((key: string) => {
      const request = makeRequest<PersistedRecord | undefined>(undefined);
      queueMicrotask(() => {
        request.result = records.get(key);
        request.onsuccess?.({ target: request });
      });
      return request;
    }),
    delete: vi.fn((key: string) => {
      records.delete(key);
    }),
    clear: vi.fn(() => {
      records.clear();
    }),
    getAll: vi.fn(() => {
      const request = makeRequest<PersistedRecord[]>([]);
      queueMicrotask(() => {
        request.result = Array.from(records.values());
        request.onsuccess?.({ target: request });
      });
      return request;
    }),
    index: vi.fn(() => ({
      openCursor: vi.fn((range: { upper: number }) => {
        const request = makeRequest<unknown>(null);
        const keys = Array.from(records.values())
          .filter(record => record.timestamp <= range.upper)
          .map(record => record.key);
        let pointer = 0;

        const pump = () => {
          if (pointer >= keys.length) {
            request.result = null;
            request.onsuccess?.({ target: request });
            return;
          }

          const currentKey = keys[pointer];
          request.result = {
            delete: () => {
              records.delete(currentKey);
            },
            continue: () => {
              pointer += 1;
              queueMicrotask(pump);
            },
          };
          request.onsuccess?.({ target: request });
        };

        queueMicrotask(pump);
        return request;
      }),
    })),
  });

  const store = createStore();

  const db = {
    objectStoreNames: {
      contains: vi.fn(() => storeExists),
    },
    close: vi.fn(),
    createObjectStore: vi.fn(() => {
      storeExists = true;
      return {
        createIndex: vi.fn(),
      };
    }),
    deleteObjectStore: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => store),
    })),
  };

  const indexedDBMock = {
    open: vi.fn(() => {
      const request = makeRequest<typeof db | null>(null);
      const callNumber = openCalls.push(1);
      const shouldError = config.openErrorAtCall === callNumber;

      const storeExistsOnOpen = config.storeExistsOnOpen || [true];
      const callUpgradeOnOpen = config.callUpgradeOnOpen || [true];
      storeExists =
        storeExistsOnOpen[
          Math.min(callNumber - 1, storeExistsOnOpen.length - 1)
        ] ?? true;
      const shouldUpgrade =
        callUpgradeOnOpen[
          Math.min(callNumber - 1, callUpgradeOnOpen.length - 1)
        ] ?? true;

      queueMicrotask(() => {
        if (shouldError) {
          request.error = new Error('open failed');
          request.onerror?.({ target: request });
          return;
        }

        request.result = db;
        if (shouldUpgrade) {
          request.onupgradeneeded?.({ target: request });
        }
        request.onsuccess?.({ target: request });
      });

      return request;
    }),
    deleteDatabase: vi.fn(() => {
      const request = makeRequest<null>(null);
      deleteCalls.push(1);
      queueMicrotask(() => {
        request.onsuccess?.({ target: request });
      });
      return request;
    }),
  };

  return { indexedDBMock, records, openCalls, deleteCalls };
};

describe('indexedDBPersistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('initializes persistence and persists successful query events', async () => {
    const { indexedDBMock, records } = createIndexedDbMock({
      initialRecords: [
        {
          key: JSON.stringify(['items', 'list', { filters: undefined }]),
          queryKey: ['items', 'list', { filters: undefined }],
          data: [{ id: 'seeded' }],
          dataUpdatedAt: Date.now(),
          staleTime: 60_000,
          timestamp: Date.now(),
        },
      ],
    });

    Object.defineProperty(globalThis, 'indexedDB', {
      value: indexedDBMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      value: { upperBound: (upper: number) => ({ upper }) },
      configurable: true,
    });

    const { setupIndexedDBPersistence } =
      await import('./indexedDBPersistence');

    const subscribers: Array<(event: Record<string, unknown>) => void> = [];
    const queryCache = {
      subscribe: vi.fn((callback: (event: Record<string, unknown>) => void) => {
        subscribers.push(callback);
      }),
      getAll: vi.fn(() => [
        {
          queryKey: ['items', 'list', { filters: undefined }],
          state: { data: null },
        },
      ]),
    };
    const setQueryDataMock = vi.fn();
    const queryClient = {
      getQueryCache: () => queryCache,
      setQueryData: setQueryDataMock,
    } as never;

    const db = await setupIndexedDBPersistence(queryClient);
    await flushMicrotasks();

    expect(db).not.toBeNull();
    expect(queryCache.subscribe).toHaveBeenCalledTimes(1);
    expect(setQueryDataMock).toHaveBeenCalledWith(
      ['items', 'list', { filters: undefined }],
      [{ id: 'seeded' }]
    );

    subscribers[0]?.({
      type: 'updated',
      query: {
        queryKey: ['items'],
        state: {
          status: 'success',
          data: [{ id: 'new-data' }],
          dataUpdatedAt: Date.now(),
        },
        options: {
          staleTime: 12_345,
        },
      },
    });
    await flushMicrotasks();

    const persisted = await db?.getQuery(['items']);
    expect(persisted?.data).toEqual([{ id: 'new-data' }]);

    records.set('very-old', {
      key: 'very-old',
      queryKey: ['stale'],
      data: { id: 'stale' },
      dataUpdatedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
      staleTime: 1,
      timestamp: Date.now() - 9 * 24 * 60 * 60 * 1000,
    });

    await db?.cleanup();
    await flushMicrotasks();

    expect(records.has('very-old')).toBe(false);

    const stats = await db?.getStats();
    expect(stats?.count).toBeGreaterThan(0);

    await db?.removeQuery(['items']);
    await flushMicrotasks();
    expect(await db?.getQuery(['items'])).toBeNull();

    await db?.clear();
    await flushMicrotasks();
    expect((await db?.getStats())?.count).toBe(0);
  });

  it('returns null when IndexedDB open fails', async () => {
    const { indexedDBMock } = createIndexedDbMock({
      openErrorAtCall: 1,
    });

    Object.defineProperty(globalThis, 'indexedDB', {
      value: indexedDBMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      value: { upperBound: (upper: number) => ({ upper }) },
      configurable: true,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { setupIndexedDBPersistence } =
      await import('./indexedDBPersistence');

    const result = await setupIndexedDBPersistence({
      getQueryCache: () => ({
        subscribe: vi.fn(),
        getAll: vi.fn(() => []),
      }),
      setQueryData: vi.fn(),
    } as never);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('recreates database when object store is missing', async () => {
    const { indexedDBMock, deleteCalls } = createIndexedDbMock({
      storeExistsOnOpen: [false, true],
      callUpgradeOnOpen: [false, true],
    });

    Object.defineProperty(globalThis, 'indexedDB', {
      value: indexedDBMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      value: { upperBound: (upper: number) => ({ upper }) },
      configurable: true,
    });

    const { setupIndexedDBPersistence } =
      await import('./indexedDBPersistence');
    const db = await setupIndexedDBPersistence({
      getQueryCache: () => ({
        subscribe: vi.fn(),
        getAll: vi.fn(() => []),
      }),
      setQueryData: vi.fn(),
    } as never);

    await flushMicrotasks();

    expect(db).not.toBeNull();
    expect(deleteCalls.length).toBeGreaterThan(0);
  });
});
