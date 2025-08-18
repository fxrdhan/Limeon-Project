/**
 * IndexedDB Persistence for PharmaSys
 */

import { QueryClient } from '@tanstack/react-query';

interface PersistedQuery {
  queryKey: unknown[];
  data: unknown;
  dataUpdatedAt: number;
  staleTime: number;
}

class PharmacyIndexedDB {
  private dbName = 'pharmasys-cache';
  private version = 1;
  private storeName = 'queries';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create queries store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'key',
          });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  async saveQuery(
    queryKey: unknown[],
    data: unknown,
    dataUpdatedAt: number,
    staleTime: number
  ): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const queryData: PersistedQuery & { key: string; timestamp: number } = {
      key: JSON.stringify(queryKey),
      queryKey,
      data,
      dataUpdatedAt,
      staleTime,
      timestamp: Date.now(),
    };

    try {
      await store.put(queryData);
    } catch (error) {
      console.warn('Failed to save query to IndexedDB:', error);
    }
  }

  async getQuery(queryKey: unknown[]): Promise<PersistedQuery | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise(resolve => {
      const request = store.get(JSON.stringify(queryKey));
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Check if data is still fresh
          const now = Date.now();
          const age = now - result.dataUpdatedAt;

          if (age < result.staleTime) {
            resolve({
              queryKey: result.queryKey,
              data: result.data,
              dataUpdatedAt: result.dataUpdatedAt,
              staleTime: result.staleTime,
            });
            return;
          }
        }
        resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  }

  async removeQuery(queryKey: unknown[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    try {
      await store.delete(JSON.stringify(queryKey));
    } catch (error) {
      console.warn('Failed to remove query from IndexedDB:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    try {
      await store.clear();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const timestampIndex = store.index('timestamp');

    // Remove entries older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldEntriesRequest = timestampIndex.openCursor(
      IDBKeyRange.upperBound(sevenDaysAgo)
    );

    oldEntriesRequest.onsuccess = event => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  async getStats(): Promise<{ count: number; size: string }> {
    if (!this.db) await this.init();
    if (!this.db) return { count: 0, size: '0 B' };

    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise(resolve => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        const size = JSON.stringify(results).length;
        resolve({
          count: results.length,
          size: this.formatBytes(size),
        });
      };
      request.onerror = () => resolve({ count: 0, size: '0 B' });
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Global instance
const pharmacyDB = new PharmacyIndexedDB();

/**
 * Setup IndexedDB persistence hooks for React Query
 */
export const setupIndexedDBPersistence = (queryClient: QueryClient) => {
  // Initialize IndexedDB
  pharmacyDB.init();

  // Cleanup old entries on startup
  pharmacyDB.cleanup();

  // Hook into React Query cache changes
  const queryCache = queryClient.getQueryCache();

  // Save to IndexedDB when queries are successful
  queryCache.subscribe(event => {
    if (event?.type === 'added' || event?.type === 'updated') {
      const query = event.query;
      if (query.state.status === 'success' && query.state.data) {
        // Only persist stable master data queries
        const queryKey = query.queryKey;
        const firstKey = queryKey[0] as string;

        if (shouldPersistQuery(firstKey)) {
          pharmacyDB.saveQuery(
            [...queryKey], // Convert readonly array to mutable
            query.state.data,
            query.state.dataUpdatedAt,
            (query.options as { staleTime?: number }).staleTime || 300000 // Default 5 minutes
          );
        }
      }
    }
  });

  // Load from IndexedDB on app start
  setTimeout(async () => {
    await loadPersistedQueries(queryClient);
  }, 100);

  return pharmacyDB;
};

/**
 * Determine which queries should be persisted
 */
function shouldPersistQuery(queryKey: string): boolean {
  return [
    'masterData', // All master data (categories, types, packages, dosages, manufacturers)
    'items', // Items list
    'item_units', // Item units (units tab)
  ].includes(queryKey);
}

/**
 * Load persisted queries back into React Query cache
 */
async function loadPersistedQueries(queryClient: QueryClient): Promise<void> {
  const queryCache = queryClient.getQueryCache();
  const allQueries = queryCache.getAll();

  for (const query of allQueries) {
    try {
      const persistedData = await pharmacyDB.getQuery([...query.queryKey]);

      if (persistedData && !query.state.data) {
        // Only load if query doesn't have data yet
        queryClient.setQueryData([...query.queryKey], persistedData.data);
      }
    } catch (error) {
      console.warn('Failed to load persisted query:', error);
    }
  }
}

// Private instance - no exports needed for production
