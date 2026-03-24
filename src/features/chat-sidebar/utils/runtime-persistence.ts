export const CHAT_RUNTIME_LOCAL_STORAGE_KEYS = {
  composerDraftMessages: 'chat-composer-draft-messages',
  pendingReadReceipts: 'chat-pending-read-receipts',
} as const;

export const CHAT_RUNTIME_INDEXED_DB_NAMES = {
  channelImageAssets: 'pharmasys-chat-channel-image-assets',
  composerDrafts: 'pharmasys-chat-composer-drafts',
  pdfPreviewCache: 'pharmasys-chat-preview-cache',
} as const;

export const CHAT_RUNTIME_INDEXED_DB_NAME_LIST = Object.values(
  CHAT_RUNTIME_INDEXED_DB_NAMES
);

export const canUseRuntimeIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

export const openRuntimeIndexedDb = ({
  dbName,
  version,
  onUpgrade,
  onOpenError,
}: {
  dbName: string;
  version: number;
  onUpgrade: (database: IDBDatabase, event: IDBVersionChangeEvent) => void;
  onOpenError?: () => void;
}): Promise<IDBDatabase | null> =>
  new Promise(resolve => {
    if (!canUseRuntimeIndexedDb()) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(dbName, version);

    request.onerror = () => {
      onOpenError?.();
      resolve(null);
    };

    request.onupgradeneeded = event => {
      onUpgrade((event.target as IDBOpenDBRequest).result, event);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });

export const closeRuntimeIndexedDb = async (
  dbPromise: Promise<IDBDatabase | null> | null
) => {
  try {
    const database = dbPromise ? await dbPromise : null;
    database?.close();
  } catch {
    // ignore runtime database close failures
  }
};

export const deleteRuntimeIndexedDb = async (dbName: string) => {
  if (!canUseRuntimeIndexedDb()) {
    return;
  }

  await new Promise<void>(resolve => {
    const request = window.indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
};
