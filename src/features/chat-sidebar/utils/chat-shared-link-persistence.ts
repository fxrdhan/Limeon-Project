import type { ChatSharedLinkCacheEntry } from './chatRuntimeState';

const CHAT_SHARED_LINK_CACHE_DB_NAME = 'pharmasys-chat-shared-link-cache';
const CHAT_SHARED_LINK_CACHE_DB_VERSION = 1;
const CHAT_SHARED_LINK_CACHE_STORE_NAME = 'shared-links';
const CHAT_SHARED_LINK_CACHE_UPDATED_AT_INDEX = 'updatedAt';
const CHAT_SHARED_LINK_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CHAT_SHARED_LINK_CACHE_MAX_ENTRIES = 512;

interface PersistedChatSharedLinkRecord {
  messageId: string;
  shortUrl: string;
  storagePath: string | null;
  targetUrl: string | null;
  updatedAt: number;
}

export interface PersistedChatSharedLinkEntry {
  messageId: string;
  sharedLink: ChatSharedLinkCacheEntry;
}

let chatSharedLinkCacheDbPromise: Promise<IDBDatabase | null> | null = null;

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const isPersistedRecordFresh = (
  record: Pick<PersistedChatSharedLinkRecord, 'updatedAt'>,
  now = Date.now()
) => now - record.updatedAt <= CHAT_SHARED_LINK_CACHE_MAX_AGE_MS;

const mapPersistedRecordToEntry = (
  record: PersistedChatSharedLinkRecord
): PersistedChatSharedLinkEntry => ({
  messageId: record.messageId,
  sharedLink: {
    shortUrl: record.shortUrl,
    storagePath: record.storagePath,
    targetUrl: record.targetUrl,
  },
});

const getChatSharedLinkCacheDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!chatSharedLinkCacheDbPromise) {
    chatSharedLinkCacheDbPromise = new Promise(resolve => {
      const request = window.indexedDB.open(
        CHAT_SHARED_LINK_CACHE_DB_NAME,
        CHAT_SHARED_LINK_CACHE_DB_VERSION
      );

      request.onerror = () => {
        chatSharedLinkCacheDbPromise = null;
        resolve(null);
      };

      request.onupgradeneeded = event => {
        const database = (event.target as IDBOpenDBRequest).result;

        if (
          !database.objectStoreNames.contains(CHAT_SHARED_LINK_CACHE_STORE_NAME)
        ) {
          const store = database.createObjectStore(
            CHAT_SHARED_LINK_CACHE_STORE_NAME,
            {
              keyPath: 'messageId',
            }
          );
          store.createIndex(
            CHAT_SHARED_LINK_CACHE_UPDATED_AT_INDEX,
            CHAT_SHARED_LINK_CACHE_UPDATED_AT_INDEX
          );
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  return chatSharedLinkCacheDbPromise;
};

const cleanupPersistedChatSharedLinkEntries = async (
  database: IDBDatabase | null
) => {
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHAT_SHARED_LINK_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHAT_SHARED_LINK_CACHE_STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const now = Date.now();
      const records = (
        (getAllRequest.result || []) as PersistedChatSharedLinkRecord[]
      )
        .filter(record => typeof record?.messageId === 'string')
        .sort(
          (leftRecord, rightRecord) =>
            rightRecord.updatedAt - leftRecord.updatedAt
        );

      records.forEach((record, index) => {
        if (
          isPersistedRecordFresh(record, now) &&
          index < CHAT_SHARED_LINK_CACHE_MAX_ENTRIES
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

export const loadPersistedChatSharedLinkEntries = async (
  limit = CHAT_SHARED_LINK_CACHE_MAX_ENTRIES
): Promise<PersistedChatSharedLinkEntry[]> => {
  const database = await getChatSharedLinkCacheDb();
  if (!database) {
    return [];
  }

  const records = await new Promise<PersistedChatSharedLinkRecord[]>(
    resolve => {
      const transaction = database.transaction(
        CHAT_SHARED_LINK_CACHE_STORE_NAME,
        'readonly'
      );
      const store = transaction.objectStore(CHAT_SHARED_LINK_CACHE_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result || []) as PersistedChatSharedLinkRecord[]);
      };
      request.onerror = () => {
        resolve([]);
      };
    }
  );

  const now = Date.now();

  void cleanupPersistedChatSharedLinkEntries(database);

  return records
    .filter(record => record?.messageId && isPersistedRecordFresh(record, now))
    .sort(
      (leftRecord, rightRecord) => rightRecord.updatedAt - leftRecord.updatedAt
    )
    .slice(0, Math.max(1, limit))
    .map(mapPersistedRecordToEntry);
};

export const persistChatSharedLinkEntry = async (
  messageId: string,
  sharedLink: ChatSharedLinkCacheEntry
) => {
  const normalizedMessageId = messageId.trim();
  const normalizedShortUrl = sharedLink.shortUrl.trim();

  if (
    !normalizedMessageId ||
    normalizedMessageId.startsWith('temp_') ||
    !normalizedShortUrl
  ) {
    return;
  }

  const database = await getChatSharedLinkCacheDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHAT_SHARED_LINK_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHAT_SHARED_LINK_CACHE_STORE_NAME);

    const record: PersistedChatSharedLinkRecord = {
      messageId: normalizedMessageId,
      shortUrl: normalizedShortUrl,
      storagePath: sharedLink.storagePath,
      targetUrl: sharedLink.targetUrl,
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

  void cleanupPersistedChatSharedLinkEntries(database);
};

export const deletePersistedChatSharedLinkEntriesByMessageIds = async (
  messageIds: Array<string | null | undefined>
) => {
  const normalizedMessageIds = [...new Set(messageIds)]
    .map(messageId => messageId?.trim() || '')
    .filter(Boolean);

  if (normalizedMessageIds.length === 0) {
    return;
  }

  const database = await getChatSharedLinkCacheDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHAT_SHARED_LINK_CACHE_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHAT_SHARED_LINK_CACHE_STORE_NAME);

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
