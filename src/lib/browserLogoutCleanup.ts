import { resetChannelImageAssetCache } from '@/features/chat-sidebar/utils/channel-image-asset-cache';
import { chatRuntimeCache } from '@/features/chat-sidebar/utils/chatRuntimeCache';
import { resetPersistedPdfPreviewCache } from '@/features/chat-sidebar/utils/pdf-preview-persistence';
import { CHAT_RUNTIME_INDEXED_DB_NAME_LIST } from '@/features/chat-sidebar/utils/runtime-persistence';
import { resetPharmacyQueryPersistence } from '@/lib/indexedDBPersistence';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useInvoiceUploadStore } from '@/store/invoiceUploadStore';
import { resetImageCache } from '@/utils/imageCache';

const KNOWN_INDEXED_DB_NAMES = [
  'pharmasys-cache',
  ...CHAT_RUNTIME_INDEXED_DB_NAME_LIST,
];

const getIndexedDbFactory = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.indexedDB;
};

const listIndexedDbNames = async () => {
  const indexedDbFactory = getIndexedDbFactory() as
    | (IDBFactory & {
        databases?: () => Promise<Array<{ name?: string | null }>>;
      })
    | null;

  if (!indexedDbFactory?.databases) {
    return [];
  }

  try {
    const databases = await indexedDbFactory.databases();
    return databases
      .map(database => database.name?.trim() || '')
      .filter(Boolean);
  } catch {
    return [];
  }
};

const deleteIndexedDbDatabase = async (databaseName: string) => {
  const normalizedDatabaseName = databaseName.trim();
  const indexedDbFactory = getIndexedDbFactory();

  if (!indexedDbFactory || !normalizedDatabaseName) {
    return;
  }

  await new Promise<void>(resolve => {
    const request = indexedDbFactory.deleteDatabase(normalizedDatabaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
};

const clearCacheStorage = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheKeys = await window.caches.keys();
    await Promise.all(
      cacheKeys.map(cacheKey => window.caches.delete(cacheKey))
    );
  } catch {
    // ignore cache deletion failures during logout cleanup
  }
};

const resetRuntimeStores = () => {
  useInvoiceUploadStore.getState().clearCachedInvoiceFile();
  chatRuntimeCache.conversation.reset();
  chatRuntimeCache.readReceipts.reset();
  chatRuntimeCache.signedAssets.reset();
  chatRuntimeCache.pdfPreviews.reset();
};

export const clearClientBrowserState = async () => {
  resetRuntimeStores();

  if (typeof window === 'undefined') {
    queryClient.clear();
    return;
  }

  try {
    await queryClient.cancelQueries();
  } catch {
    // ignore query cancellation failures during logout cleanup
  }

  try {
    await supabase.removeAllChannels();
  } catch {
    // ignore realtime cleanup failures during logout cleanup
  }

  queryClient.clear();
  const indexedDbNames = new Set([
    ...KNOWN_INDEXED_DB_NAMES,
    ...(await listIndexedDbNames()),
  ]);

  try {
    window.sessionStorage.clear();
  } catch {
    // ignore storage cleanup failures during logout cleanup
  }

  try {
    window.localStorage.clear();
  } catch {
    // ignore storage cleanup failures during logout cleanup
  }

  await Promise.all([
    resetImageCache(),
    resetPharmacyQueryPersistence(),
    resetPersistedPdfPreviewCache(),
    resetChannelImageAssetCache(),
    clearCacheStorage(),
  ]);

  await Promise.all(
    [...indexedDbNames].map(databaseName =>
      deleteIndexedDbDatabase(databaseName)
    )
  );
};
