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
  private version = 2; // Increment version to force upgrade
  private storeName = 'queries';
  private db: IDBDatabase | null = null;
  private recreationAttempts = 0;
  private maxRecreationAttempts = 2;

  async init(): Promise<void> {
    if (this.db) return; // Already initialized

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;

        // Verify the object store exists
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          if (this.recreationAttempts < this.maxRecreationAttempts) {
            console.warn(
              `Object store '${this.storeName}' not found, attempting to recreate database (attempt ${this.recreationAttempts + 1})...`
            );
            this.db.close();
            this.db = null;
            this.recreationAttempts++;
            this.recreateDatabase().then(resolve).catch(reject);
            return;
          } else {
            console.error(
              `Object store '${this.storeName}' not found after ${this.maxRecreationAttempts} recreation attempts`
            );
            reject(
              new Error(
                `Failed to create object store after ${this.maxRecreationAttempts} attempts`
              )
            );
            return;
          }
        }

        // IndexedDB initialized successfully
        this.recreationAttempts = 0; // Reset counter on success
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Delete existing store if it exists (clean slate)
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName);
        }

        // Create queries store
        const store = db.createObjectStore(this.storeName, {
          keyPath: 'key',
        });
        store.createIndex('timestamp', 'timestamp');
      };
    });
  }

  private async recreateDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);

      deleteRequest.onsuccess = () => {
        // Increment version to force a clean creation
        this.version += 1;
        this.init().then(resolve).catch(reject);
      };

      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };
    });
  }

  async saveQuery(
    queryKey: unknown[],
    data: unknown,
    dataUpdatedAt: number,
    staleTime: number
  ): Promise<void> {
    try {
      if (!this.db) await this.init();
      if (!this.db) return;

      // Double-check that the object store exists
      if (!this.db.objectStoreNames.contains(this.storeName)) {
        console.warn(
          `Object store '${this.storeName}' not available for saveQuery`
        );
        return;
      }

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

      await store.put(queryData);
    } catch (error) {
      console.warn('Failed to save query to IndexedDB:', error);
    }
  }

  async getQuery(queryKey: unknown[]): Promise<PersistedQuery | null> {
    try {
      if (!this.db) await this.init();
      if (!this.db) return null;

      if (!this.db.objectStoreNames.contains(this.storeName)) {
        console.warn(
          `Object store '${this.storeName}' not available for getQuery`
        );
        return null;
      }

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
    } catch (error) {
      console.warn('Failed to access IndexedDB for getQuery:', error);
      return null;
    }
  }

  async removeQuery(queryKey: unknown[]): Promise<void> {
    try {
      if (!this.db) await this.init();
      if (!this.db) return;

      if (!this.db.objectStoreNames.contains(this.storeName)) {
        console.warn(
          `Object store '${this.storeName}' not available for removeQuery`
        );
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await store.delete(JSON.stringify(queryKey));
    } catch (error) {
      console.warn('Failed to remove query from IndexedDB:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.db) await this.init();
      if (!this.db) return;

      if (!this.db.objectStoreNames.contains(this.storeName)) {
        console.warn(
          `Object store '${this.storeName}' not available for clear`
        );
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await store.clear();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (!this.db) await this.init();
      if (!this.db) return;

      if (!this.db.objectStoreNames.contains(this.storeName)) {
        console.warn(
          `Object store '${this.storeName}' not available for cleanup`
        );
        return;
      }

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
    } catch (error) {
      console.warn('Failed to cleanup IndexedDB:', error);
    }
  }

  async getStats(): Promise<{ count: number; size: string }> {
    try {
      if (!this.db) await this.init();
      if (!this.db) return { count: 0, size: '0 B' };

      if (!this.db.objectStoreNames.contains(this.storeName)) {
        console.warn(
          `Object store '${this.storeName}' not available for getStats`
        );
        return { count: 0, size: '0 B' };
      }

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
    } catch (error) {
      console.warn('Failed to get IndexedDB stats:', error);
      return { count: 0, size: '0 B' };
    }
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
export const setupIndexedDBPersistence = async (queryClient: QueryClient) => {
  try {
    // Initialize IndexedDB and wait for it to complete
    await pharmacyDB.init();

    // Cleanup old entries on startup
    await pharmacyDB.cleanup();
  } catch (error) {
    console.warn('Failed to initialize IndexedDB persistence:', error);
    return null; // Return null to indicate setup failed
  }

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

  // Load from IndexedDB and WAIT for completion before returning
  await loadPersistedQueries(queryClient);

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
  // Import QueryKeys for correct key structure
  const { QueryKeys } = await import('@/constants/queryKeys');

  // Load critical queries with CORRECT query keys
  const criticalQueries = [
    // Items - exact match with useItems hook
    QueryKeys.items.list(undefined), // ['items', 'list', { filters: undefined }]

    // Master Data - exact match with hooks
    QueryKeys.masterData.categories.list(undefined),
    QueryKeys.masterData.types.list(undefined),
    QueryKeys.masterData.packages.list(undefined),
    QueryKeys.masterData.dosages.list(undefined),
    QueryKeys.masterData.manufacturers.list(undefined),

    // Item Units
    QueryKeys.masterData.itemUnits.list(undefined),
  ];

  for (const queryKey of criticalQueries) {
    try {
      const persistedData = await pharmacyDB.getQuery([...queryKey]); // Convert readonly to mutable

      if (persistedData) {
        // Preload critical data into cache
        queryClient.setQueryData(queryKey, persistedData.data);
      }
    } catch {
      // Silent fail for preloading
    }
  }

  // Also load existing queries in cache
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
