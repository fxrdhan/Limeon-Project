import type { ImageMessagePreviewCacheEntry } from './chatRuntimeState';

const IMAGE_PREVIEW_CACHE_DB_NAME = 'pharmasys-chat-image-preview-cache';
const IMAGE_PREVIEW_CACHE_DB_VERSION = 1;
const IMAGE_PREVIEW_CACHE_STORE_NAME = 'image-previews';
const IMAGE_PREVIEW_CACHE_UPDATED_AT_INDEX = 'updatedAt';
const IMAGE_PREVIEW_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IMAGE_PREVIEW_CACHE_MAX_ENTRIES = 256;

interface PersistedImagePreviewRecord {
  messageId: string;
  previewUrl: string;
  updatedAt: number;
}

export interface PersistedImagePreviewEntry {
  messageId: string;
  preview: ImageMessagePreviewCacheEntry;
}

let imagePreviewCacheDbPromise: Promise<IDBDatabase | null> | null = null;

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const isPersistedRecordFresh = (
  record: Pick<PersistedImagePreviewRecord, 'updatedAt'>,
  now = Date.now()
) => now - record.updatedAt <= IMAGE_PREVIEW_CACHE_MAX_AGE_MS;

const mapPersistedRecordToEntry = (
  record: PersistedImagePreviewRecord
): PersistedImagePreviewEntry => ({
  messageId: record.messageId,
  preview: {
    previewUrl: record.previewUrl,
    isObjectUrl: false,
  },
});

const getImagePreviewCacheDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!imagePreviewCacheDbPromise) {
    imagePreviewCacheDbPromise = new Promise(resolve => {
      const request = window.indexedDB.open(
        IMAGE_PREVIEW_CACHE_DB_NAME,
        IMAGE_PREVIEW_CACHE_DB_VERSION
      );

      request.onerror = () => {
        imagePreviewCacheDbPromise = null;
        resolve(null);
      };

      request.onupgradeneeded = event => {
        const database = (event.target as IDBOpenDBRequest).result;

        if (
          !database.objectStoreNames.contains(IMAGE_PREVIEW_CACHE_STORE_NAME)
        ) {
          const store = database.createObjectStore(
            IMAGE_PREVIEW_CACHE_STORE_NAME,
            {
              keyPath: 'messageId',
            }
          );
          store.createIndex(
            IMAGE_PREVIEW_CACHE_UPDATED_AT_INDEX,
            IMAGE_PREVIEW_CACHE_UPDATED_AT_INDEX
          );
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  return imagePreviewCacheDbPromise;
};

const cleanupPersistedImagePreviewEntries = async (
  database: IDBDatabase | null
) => {
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      IMAGE_PREVIEW_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(IMAGE_PREVIEW_CACHE_STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const now = Date.now();
      const records = (
        (getAllRequest.result || []) as PersistedImagePreviewRecord[]
      )
        .filter(record => typeof record?.messageId === 'string')
        .sort(
          (leftRecord, rightRecord) =>
            rightRecord.updatedAt - leftRecord.updatedAt
        );

      records.forEach((record, index) => {
        if (
          isPersistedRecordFresh(record, now) &&
          index < IMAGE_PREVIEW_CACHE_MAX_ENTRIES
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

export const loadPersistedImagePreviewEntries = async (
  limit = IMAGE_PREVIEW_CACHE_MAX_ENTRIES
): Promise<PersistedImagePreviewEntry[]> => {
  const database = await getImagePreviewCacheDb();
  if (!database) {
    return [];
  }

  const records = await new Promise<PersistedImagePreviewRecord[]>(resolve => {
    const transaction = database.transaction(
      IMAGE_PREVIEW_CACHE_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(IMAGE_PREVIEW_CACHE_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as PersistedImagePreviewRecord[]);
    };
    request.onerror = () => {
      resolve([]);
    };
  });

  const now = Date.now();

  void cleanupPersistedImagePreviewEntries(database);

  return records
    .filter(record => record?.messageId && isPersistedRecordFresh(record, now))
    .sort(
      (leftRecord, rightRecord) => rightRecord.updatedAt - leftRecord.updatedAt
    )
    .slice(0, Math.max(1, limit))
    .map(mapPersistedRecordToEntry);
};

export const loadPersistedImagePreviewEntriesByMessageIds = async (
  messageIds: Array<string | null | undefined>
): Promise<PersistedImagePreviewEntry[]> => {
  const normalizedMessageIds = [...new Set(messageIds)]
    .map(messageId => messageId?.trim() || '')
    .filter(Boolean);

  if (normalizedMessageIds.length === 0) {
    return [];
  }

  const database = await getImagePreviewCacheDb();
  if (!database) {
    return [];
  }

  return new Promise(resolve => {
    const transaction = database.transaction(
      IMAGE_PREVIEW_CACHE_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(IMAGE_PREVIEW_CACHE_STORE_NAME);
    const requests = normalizedMessageIds.map(
      messageId =>
        new Promise<PersistedImagePreviewRecord | null>(resolveRequest => {
          const request = store.get(messageId);

          request.onsuccess = () => {
            resolveRequest(
              (request.result as PersistedImagePreviewRecord | undefined) ??
                null
            );
          };
          request.onerror = () => {
            resolveRequest(null);
          };
        })
    );

    void Promise.all(requests).then(records => {
      const now = Date.now();
      resolve(
        records
          .filter(
            (record): record is PersistedImagePreviewRecord =>
              record !== null &&
              Boolean(record.messageId) &&
              isPersistedRecordFresh(record, now)
          )
          .map(mapPersistedRecordToEntry)
      );
    });
  });
};

export const persistImagePreviewEntry = async (
  messageId: string,
  preview: ImageMessagePreviewCacheEntry
) => {
  const normalizedMessageId = messageId.trim();
  if (
    !normalizedMessageId ||
    normalizedMessageId.startsWith('temp_') ||
    preview.isObjectUrl ||
    !preview.previewUrl.trim().startsWith('data:')
  ) {
    return;
  }

  const database = await getImagePreviewCacheDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      IMAGE_PREVIEW_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(IMAGE_PREVIEW_CACHE_STORE_NAME);

    const record: PersistedImagePreviewRecord = {
      messageId: normalizedMessageId,
      previewUrl: preview.previewUrl,
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

  void cleanupPersistedImagePreviewEntries(database);
};

export const deletePersistedImagePreviewEntriesByMessageIds = async (
  messageIds: Array<string | null | undefined>
) => {
  const normalizedMessageIds = [...new Set(messageIds)]
    .map(messageId => messageId?.trim() || '')
    .filter(Boolean);

  if (normalizedMessageIds.length === 0) {
    return;
  }

  const database = await getImagePreviewCacheDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      IMAGE_PREVIEW_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(IMAGE_PREVIEW_CACHE_STORE_NAME);

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
