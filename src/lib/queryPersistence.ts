/**
 * Pharmacy Cache with IndexedDB Persistence
 */

import { QueryClient } from '@tanstack/react-query';
import { setupIndexedDBPersistence } from './indexedDBPersistence';

/**
 * Configure IndexedDB persistence for pharmacy data
 */
export const configurePersistence = async (queryClient: QueryClient) => {
  // Only enable in browser environment
  if (typeof window === 'undefined') {
    return queryClient;
  }

  try {
    // Setup custom IndexedDB persistence AND wait for preloading to complete
    await setupIndexedDBPersistence(queryClient);
    return queryClient;
  } catch (error) {
    console.warn('IndexedDB not available, using in-memory cache only:', error);
    return queryClient;
  }
};
