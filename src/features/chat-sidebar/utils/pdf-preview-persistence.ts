import { PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES } from '../constants';
import type { PdfMessagePreviewCacheEntry } from './chatRuntimeCache';
import {
  CHAT_RUNTIME_INDEXED_DB_NAMES,
  closeRuntimeIndexedDb,
  deleteRuntimeIndexedDb,
  openRuntimeIndexedDb,
} from './runtime-persistence';

const PDF_PREVIEW_CACHE_DB_NAME = CHAT_RUNTIME_INDEXED_DB_NAMES.pdfPreviewCache;
const PDF_PREVIEW_CACHE_DB_VERSION = 1;
const PDF_PREVIEW_CACHE_STORE_NAME = 'pdf-previews';
const PDF_PREVIEW_CACHE_KEY_INDEX = 'cacheKey';
const PDF_PREVIEW_CACHE_UPDATED_AT_INDEX = 'updatedAt';
const PDF_PREVIEW_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface PersistedPdfPreviewRecord {
  messageId: string;
  cacheKey: string;
  coverDataUrl: string;
  pageCount: number;
  updatedAt: number;
}

export interface PersistedPdfPreviewEntry {
  messageId: string;
  preview: PdfMessagePreviewCacheEntry;
}

let pdfPreviewCacheDbPromise: Promise<IDBDatabase | null> | null = null;

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const isPersistedRecordFresh = (
  record: Pick<PersistedPdfPreviewRecord, 'updatedAt'>,
  now = Date.now()
) => now - record.updatedAt <= PDF_PREVIEW_CACHE_MAX_AGE_MS;

const mapPersistedRecordToEntry = (
  record: PersistedPdfPreviewRecord
): PersistedPdfPreviewEntry => ({
  messageId: record.messageId,
  preview: {
    cacheKey: record.cacheKey,
    coverDataUrl: record.coverDataUrl,
    pageCount: Math.max(record.pageCount, 1),
  },
});

const getPdfPreviewCacheDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!pdfPreviewCacheDbPromise) {
    pdfPreviewCacheDbPromise = openRuntimeIndexedDb({
      dbName: PDF_PREVIEW_CACHE_DB_NAME,
      version: PDF_PREVIEW_CACHE_DB_VERSION,
      onOpenError: () => {
        pdfPreviewCacheDbPromise = null;
      },
      onUpgrade: database => {
        if (!database.objectStoreNames.contains(PDF_PREVIEW_CACHE_STORE_NAME)) {
          const store = database.createObjectStore(
            PDF_PREVIEW_CACHE_STORE_NAME,
            {
              keyPath: 'messageId',
            }
          );
          store.createIndex(
            PDF_PREVIEW_CACHE_KEY_INDEX,
            PDF_PREVIEW_CACHE_KEY_INDEX,
            {
              unique: true,
            }
          );
          store.createIndex(
            PDF_PREVIEW_CACHE_UPDATED_AT_INDEX,
            PDF_PREVIEW_CACHE_UPDATED_AT_INDEX
          );
        }
      },
    });
  }

  return pdfPreviewCacheDbPromise;
};

const cleanupPersistedPdfPreviewEntries = async (
  database: IDBDatabase | null
) => {
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      PDF_PREVIEW_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(PDF_PREVIEW_CACHE_STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const now = Date.now();
      const records = (
        (getAllRequest.result || []) as PersistedPdfPreviewRecord[]
      )
        .filter(record => typeof record?.messageId === 'string')
        .sort(
          (leftRecord, rightRecord) =>
            rightRecord.updatedAt - leftRecord.updatedAt
        );

      records.forEach((record, index) => {
        if (
          isPersistedRecordFresh(record, now) &&
          index < PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES
        ) {
          return;
        }

        store.delete(record.messageId);
      });
    };

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      resolve();
    };
    transaction.onabort = () => {
      resolve();
    };
  });
};

export const loadPersistedPdfPreviewEntry = async (
  cacheKey: string
): Promise<PersistedPdfPreviewEntry | null> => {
  if (!cacheKey.trim()) {
    return null;
  }

  const database = await getPdfPreviewCacheDb();
  if (!database) {
    return null;
  }

  return new Promise(resolve => {
    const transaction = database.transaction(
      PDF_PREVIEW_CACHE_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(PDF_PREVIEW_CACHE_STORE_NAME);
    const index = store.index(PDF_PREVIEW_CACHE_KEY_INDEX);
    const request = index.get(cacheKey);

    request.onsuccess = () => {
      const record = request.result as PersistedPdfPreviewRecord | undefined;
      if (!record || !isPersistedRecordFresh(record)) {
        resolve(null);
        return;
      }

      resolve(mapPersistedRecordToEntry(record));
    };

    request.onerror = () => {
      resolve(null);
    };
  });
};

export const loadPersistedPdfPreviewEntries = async (
  limit = PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES
): Promise<PersistedPdfPreviewEntry[]> => {
  const database = await getPdfPreviewCacheDb();
  if (!database) {
    return [];
  }

  const records = await new Promise<PersistedPdfPreviewRecord[]>(resolve => {
    const transaction = database.transaction(
      PDF_PREVIEW_CACHE_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(PDF_PREVIEW_CACHE_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as PersistedPdfPreviewRecord[]);
    };
    request.onerror = () => {
      resolve([]);
    };
  });

  const now = Date.now();

  void cleanupPersistedPdfPreviewEntries(database);

  return records
    .filter(record => record?.messageId && isPersistedRecordFresh(record, now))
    .sort(
      (leftRecord, rightRecord) => rightRecord.updatedAt - leftRecord.updatedAt
    )
    .slice(0, Math.max(1, limit))
    .map(mapPersistedRecordToEntry);
};

export const persistPdfPreviewEntry = async (
  messageId: string,
  preview: PdfMessagePreviewCacheEntry
) => {
  const normalizedMessageId = messageId.trim();
  if (
    !normalizedMessageId ||
    normalizedMessageId.startsWith('temp_') ||
    !preview.cacheKey.trim() ||
    !preview.coverDataUrl.trim()
  ) {
    return;
  }

  const database = await getPdfPreviewCacheDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      PDF_PREVIEW_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(PDF_PREVIEW_CACHE_STORE_NAME);

    const record: PersistedPdfPreviewRecord = {
      messageId: normalizedMessageId,
      cacheKey: preview.cacheKey,
      coverDataUrl: preview.coverDataUrl,
      pageCount: Math.max(preview.pageCount, 1),
      updatedAt: Date.now(),
    };

    store.put(record);

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      resolve();
    };
    transaction.onabort = () => {
      resolve();
    };
  });

  void cleanupPersistedPdfPreviewEntries(database);
};

export const deletePersistedPdfPreviewEntriesByMessageIds = async (
  messageIds: Array<string | null | undefined>
) => {
  const normalizedMessageIds = [...new Set(messageIds)]
    .map(messageId => messageId?.trim() || '')
    .filter(messageId => messageId.length > 0);

  if (normalizedMessageIds.length === 0) {
    return;
  }

  const database = await getPdfPreviewCacheDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      PDF_PREVIEW_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(PDF_PREVIEW_CACHE_STORE_NAME);

    normalizedMessageIds.forEach(messageId => {
      store.delete(messageId);
    });

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      resolve();
    };
    transaction.onabort = () => {
      resolve();
    };
  });
};

export const resetPersistedPdfPreviewCache = async () => {
  if (!canUseIndexedDb()) {
    return;
  }

  await closeRuntimeIndexedDb(pdfPreviewCacheDbPromise);
  pdfPreviewCacheDbPromise = null;
  await deleteRuntimeIndexedDb(PDF_PREVIEW_CACHE_DB_NAME);
};
