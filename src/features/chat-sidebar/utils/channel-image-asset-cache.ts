import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  fetchChatFileBlobWithFallback,
  isDirectChatAssetUrl,
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from './message-file';

export type ChannelImageAssetVariant = 'thumbnail' | 'full';

type CacheableImageMessage = Pick<
  ChatMessage,
  | 'id'
  | 'message'
  | 'message_type'
  | 'file_name'
  | 'file_mime_type'
  | 'file_storage_path'
>;

interface PersistedChannelImageAssetRecord {
  blob: Blob;
  byteSize: number;
  channelId: string;
  key: string;
  lastAccessedAt: number;
  messageId: string;
  mimeType: string;
  updatedAt: number;
  variant: ChannelImageAssetVariant;
}

interface RuntimeChannelImageAssetRecord {
  byteSize: number;
  channelId: string;
  messageId: string;
  objectUrl: string;
  variant: ChannelImageAssetVariant;
}

const CHANNEL_IMAGE_ASSET_DB_NAME = 'pharmasys-chat-channel-image-assets';
const CHANNEL_IMAGE_ASSET_DB_VERSION = 1;
const CHANNEL_IMAGE_ASSET_STORE_NAME = 'channel-image-assets';
const CHANNEL_IMAGE_ASSET_CHANNEL_INDEX = 'channelId';
const CHANNEL_IMAGE_ASSET_CHANNEL_VARIANT_INDEX = 'channelVariant';
const CHANNEL_IMAGE_ASSET_FULL_BUDGET_BYTES = 250 * 1024 * 1024;

let activeChannelImageAssetScopeId: string | null = null;
let channelImageAssetDbPromise: Promise<IDBDatabase | null> | null = null;

const runtimeChannelImageAssets = new Map<
  string,
  RuntimeChannelImageAssetRecord
>();
const pendingChannelImageAssetLoads = new Map<string, Promise<string | null>>();

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const normalizeChannelId = (channelId?: string | null) =>
  channelId?.trim() || null;

const normalizeMessageId = (messageId?: string | null) =>
  messageId?.trim() || null;

const buildChannelImageAssetKey = (
  channelId: string,
  messageId: string,
  variant: ChannelImageAssetVariant
) => `${channelId}::${messageId}::${variant}`;

const getEffectiveChannelImageAssetVariant = (
  variant: ChannelImageAssetVariant
): ChannelImageAssetVariant => (variant === 'thumbnail' ? 'full' : variant);

const revokeRuntimeChannelImageAssetEntry = (
  assetKey: string,
  store = runtimeChannelImageAssets
) => {
  const runtimeEntry = store.get(assetKey);
  if (!runtimeEntry) {
    return;
  }

  URL.revokeObjectURL(runtimeEntry.objectUrl);
  store.delete(assetKey);
};

const getChannelImageAssetDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!channelImageAssetDbPromise) {
    channelImageAssetDbPromise = new Promise(resolve => {
      const request = window.indexedDB.open(
        CHANNEL_IMAGE_ASSET_DB_NAME,
        CHANNEL_IMAGE_ASSET_DB_VERSION
      );

      request.onerror = () => {
        channelImageAssetDbPromise = null;
        resolve(null);
      };

      request.onupgradeneeded = event => {
        const database = (event.target as IDBOpenDBRequest).result;

        if (
          database.objectStoreNames.contains(CHANNEL_IMAGE_ASSET_STORE_NAME)
        ) {
          database.deleteObjectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
        }

        const store = database.createObjectStore(
          CHANNEL_IMAGE_ASSET_STORE_NAME,
          {
            keyPath: 'key',
          }
        );

        store.createIndex(
          CHANNEL_IMAGE_ASSET_CHANNEL_INDEX,
          CHANNEL_IMAGE_ASSET_CHANNEL_INDEX
        );
        store.createIndex(CHANNEL_IMAGE_ASSET_CHANNEL_VARIANT_INDEX, [
          CHANNEL_IMAGE_ASSET_CHANNEL_INDEX,
          'variant',
        ]);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  return channelImageAssetDbPromise;
};

const readPersistedChannelImageAssetRecord = async (
  assetKey: string
): Promise<PersistedChannelImageAssetRecord | null> => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return null;
  }

  return new Promise(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    const request = store.get(assetKey);

    request.onsuccess = () => {
      resolve(
        (request.result as PersistedChannelImageAssetRecord | undefined) ?? null
      );
    };
    request.onerror = () => {
      resolve(null);
    };
  });
};

const listPersistedChannelImageAssetRecords = async (
  channelId: string,
  variant?: ChannelImageAssetVariant
): Promise<PersistedChannelImageAssetRecord[]> => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return [];
  }

  return new Promise(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    const source = variant
      ? store.index(CHANNEL_IMAGE_ASSET_CHANNEL_VARIANT_INDEX)
      : store.index(CHANNEL_IMAGE_ASSET_CHANNEL_INDEX);
    const request = source.getAll(variant ? [channelId, variant] : channelId);

    request.onsuccess = () => {
      resolve((request.result || []) as PersistedChannelImageAssetRecord[]);
    };
    request.onerror = () => {
      resolve([]);
    };
  });
};

const touchPersistedChannelImageAssetRecord = async (
  record: PersistedChannelImageAssetRecord
) => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    store.put({
      ...record,
      lastAccessedAt: Date.now(),
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

const writePersistedChannelImageAssetRecord = async (
  record: PersistedChannelImageAssetRecord
) => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    store.put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

const deletePersistedChannelImageAssetKeys = async (assetKeys: string[]) => {
  const normalizedAssetKeys = [...new Set(assetKeys)]
    .map(assetKey => assetKey.trim())
    .filter(Boolean);
  if (normalizedAssetKeys.length === 0) {
    return;
  }

  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);

    normalizedAssetKeys.forEach(assetKey => {
      store.delete(assetKey);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

const hydrateRuntimeChannelImageAssetUrl = (
  record: PersistedChannelImageAssetRecord,
  store = runtimeChannelImageAssets
) => {
  const existingRuntimeEntry = store.get(record.key);
  if (existingRuntimeEntry) {
    return existingRuntimeEntry.objectUrl;
  }

  const objectUrl = URL.createObjectURL(record.blob);
  store.set(record.key, {
    channelId: record.channelId,
    messageId: record.messageId,
    variant: record.variant,
    objectUrl,
    byteSize: record.byteSize,
  });

  return objectUrl;
};

const createPersistedChannelImageAssetRecord = ({
  channelId,
  messageId,
  variant,
  blob,
}: {
  channelId: string;
  messageId: string;
  variant: ChannelImageAssetVariant;
  blob: Blob;
}): PersistedChannelImageAssetRecord => {
  const now = Date.now();

  return {
    key: buildChannelImageAssetKey(channelId, messageId, variant),
    channelId,
    messageId,
    variant,
    blob,
    mimeType: blob.type || 'application/octet-stream',
    byteSize: blob.size,
    updatedAt: now,
    lastAccessedAt: now,
  };
};

const prunePersistedFullChannelImageAssets = async (
  channelId: string,
  protectedAssetKey?: string | null
) => {
  const persistedFullRecords = await listPersistedChannelImageAssetRecords(
    channelId,
    'full'
  );
  if (persistedFullRecords.length === 0) {
    return;
  }

  let totalBytes = persistedFullRecords.reduce(
    (totalSize, record) => totalSize + record.byteSize,
    0
  );
  if (totalBytes <= CHANNEL_IMAGE_ASSET_FULL_BUDGET_BYTES) {
    return;
  }

  const deletableRecords = persistedFullRecords
    .filter(record => record.key !== protectedAssetKey)
    .sort(
      (leftRecord, rightRecord) =>
        leftRecord.lastAccessedAt - rightRecord.lastAccessedAt
    );

  const assetKeysToDelete: string[] = [];

  for (const record of deletableRecords) {
    if (totalBytes <= CHANNEL_IMAGE_ASSET_FULL_BUDGET_BYTES) {
      break;
    }

    totalBytes -= record.byteSize;
    assetKeysToDelete.push(record.key);
  }

  await deletePersistedChannelImageAssetKeys(assetKeysToDelete);
  assetKeysToDelete.forEach(assetKey => {
    revokeRuntimeChannelImageAssetEntry(assetKey);
  });
};

const persistChannelImageAssetBlob = async (
  channelId: string,
  messageId: string,
  variant: ChannelImageAssetVariant,
  blob: Blob
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  const normalizedMessageId = normalizeMessageId(messageId);
  if (!normalizedChannelId || !normalizedMessageId) {
    return null;
  }

  const record = createPersistedChannelImageAssetRecord({
    channelId: normalizedChannelId,
    messageId: normalizedMessageId,
    variant,
    blob,
  });

  revokeRuntimeChannelImageAssetEntry(record.key);
  await writePersistedChannelImageAssetRecord(record);
  if (variant === 'full') {
    await prunePersistedFullChannelImageAssets(normalizedChannelId, record.key);
  }

  return hydrateRuntimeChannelImageAssetUrl(record);
};

const resolveFullChannelImageAssetBlob = async (
  message: CacheableImageMessage
) =>
  fetchChatFileBlobWithFallback(
    message.message,
    message.file_storage_path,
    message.file_mime_type
  );

export const isCacheableChannelImageMessage = (
  message: Pick<
    ChatMessage,
    | 'message_type'
    | 'message'
    | 'file_name'
    | 'file_mime_type'
    | 'file_preview_url'
  >
) => {
  if (message.message_type === 'image') {
    return true;
  }

  if (message.message_type !== 'file') {
    return false;
  }

  const fileExtension = resolveFileExtension(
    message.file_name ?? null,
    message.message,
    message.file_mime_type
  );

  return isImageFileExtensionOrMime(fileExtension, message.file_mime_type);
};

export const getRuntimeChannelImageAssetUrl = (
  channelId: string,
  messageId: string,
  variant: ChannelImageAssetVariant
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  const normalizedMessageId = normalizeMessageId(messageId);
  if (!normalizedChannelId || !normalizedMessageId) {
    return null;
  }

  const effectiveVariant = getEffectiveChannelImageAssetVariant(variant);
  const assetKey = buildChannelImageAssetKey(
    normalizedChannelId,
    normalizedMessageId,
    effectiveVariant
  );
  const runtimeEntry = runtimeChannelImageAssets.get(assetKey) ?? null;
  if (!runtimeEntry) {
    return null;
  }

  void readPersistedChannelImageAssetRecord(assetKey).then(record => {
    if (!record) {
      return;
    }

    void touchPersistedChannelImageAssetRecord(record);
  });

  return runtimeEntry.objectUrl;
};

export const loadCachedChannelImageAssetUrl = async (
  channelId: string,
  messageId: string,
  variant: ChannelImageAssetVariant
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  const normalizedMessageId = normalizeMessageId(messageId);
  if (!normalizedChannelId || !normalizedMessageId) {
    return null;
  }

  const effectiveVariant = getEffectiveChannelImageAssetVariant(variant);
  const existingRuntimeUrl = getRuntimeChannelImageAssetUrl(
    normalizedChannelId,
    normalizedMessageId,
    effectiveVariant
  );
  if (existingRuntimeUrl) {
    return existingRuntimeUrl;
  }

  const record = await readPersistedChannelImageAssetRecord(
    buildChannelImageAssetKey(
      normalizedChannelId,
      normalizedMessageId,
      effectiveVariant
    )
  );
  if (!record) {
    return null;
  }

  void touchPersistedChannelImageAssetRecord(record);
  return hydrateRuntimeChannelImageAssetUrl(record);
};

export const ensureChannelImageAssetUrl = async (
  channelId: string,
  message: CacheableImageMessage,
  variant: ChannelImageAssetVariant
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  const normalizedMessageId = normalizeMessageId(message.id);
  if (!normalizedChannelId || !normalizedMessageId) {
    return null;
  }

  const effectiveVariant = getEffectiveChannelImageAssetVariant(variant);
  const existingRuntimeUrl = getRuntimeChannelImageAssetUrl(
    normalizedChannelId,
    normalizedMessageId,
    effectiveVariant
  );
  if (existingRuntimeUrl) {
    return existingRuntimeUrl;
  }

  const assetKey = buildChannelImageAssetKey(
    normalizedChannelId,
    normalizedMessageId,
    effectiveVariant
  );
  const pendingAssetLoad = pendingChannelImageAssetLoads.get(assetKey);
  if (pendingAssetLoad) {
    return await pendingAssetLoad;
  }

  const nextAssetLoad = (async () => {
    const persistedUrl = await loadCachedChannelImageAssetUrl(
      normalizedChannelId,
      normalizedMessageId,
      effectiveVariant
    );
    if (persistedUrl) {
      return persistedUrl;
    }

    const resolvedBlob = await resolveFullChannelImageAssetBlob(message);

    if (!resolvedBlob) {
      const fallbackMessageUrl = message.message.trim();
      return isDirectChatAssetUrl(fallbackMessageUrl)
        ? fallbackMessageUrl
        : null;
    }

    if (
      activeChannelImageAssetScopeId &&
      activeChannelImageAssetScopeId !== normalizedChannelId
    ) {
      return null;
    }

    return await persistChannelImageAssetBlob(
      normalizedChannelId,
      normalizedMessageId,
      effectiveVariant,
      resolvedBlob
    );
  })();

  pendingChannelImageAssetLoads.set(assetKey, nextAssetLoad);

  try {
    return await nextAssetLoad;
  } finally {
    const activePendingAssetLoad = pendingChannelImageAssetLoads.get(assetKey);
    if (activePendingAssetLoad === nextAssetLoad) {
      pendingChannelImageAssetLoads.delete(assetKey);
    }
  }
};

export const seedChannelImageAssetsFromFile = async (
  channelId: string,
  messageId: string,
  file: File
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  const normalizedMessageId = normalizeMessageId(messageId);
  if (!normalizedChannelId || !normalizedMessageId) {
    return {
      fullUrl: null,
      thumbnailUrl: null,
    };
  }

  const fullUrl = await persistChannelImageAssetBlob(
    normalizedChannelId,
    normalizedMessageId,
    'full',
    file
  );

  return {
    fullUrl,
    thumbnailUrl: fullUrl,
  };
};

export const deleteChannelImageAssetsByMessageIds = async (
  channelId: string,
  messageIds: Array<string | null | undefined>
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) {
    return;
  }

  const normalizedMessageIds = [...new Set(messageIds)]
    .map(messageId => messageId?.trim() || '')
    .filter(Boolean);
  if (normalizedMessageIds.length === 0) {
    return;
  }

  const assetKeys = normalizedMessageIds.flatMap(messageId => [
    buildChannelImageAssetKey(normalizedChannelId, messageId, 'thumbnail'),
    buildChannelImageAssetKey(normalizedChannelId, messageId, 'full'),
  ]);

  await deletePersistedChannelImageAssetKeys(assetKeys);
  assetKeys.forEach(assetKey => {
    revokeRuntimeChannelImageAssetEntry(assetKey);
  });
};

export const purgeChannelImageAssetsExcept = async (
  retainedChannelId?: string | null
) => {
  const normalizedRetainedChannelId = normalizeChannelId(retainedChannelId);

  for (const [assetKey, runtimeEntry] of runtimeChannelImageAssets) {
    if (runtimeEntry.channelId === normalizedRetainedChannelId) {
      continue;
    }

    revokeRuntimeChannelImageAssetEntry(assetKey);
  }

  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      ((request.result || []) as PersistedChannelImageAssetRecord[]).forEach(
        record => {
          if (record.channelId === normalizedRetainedChannelId) {
            return;
          }

          store.delete(record.key);
        }
      );
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

export const activateChannelImageAssetScope = async (
  channelId?: string | null
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  activeChannelImageAssetScopeId = normalizedChannelId;
  await purgeChannelImageAssetsExcept(normalizedChannelId);
};
