import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  CHAT_RUNTIME_INDEXED_DB_NAMES,
  closeRuntimeIndexedDb,
  deleteRuntimeIndexedDb,
  openRuntimeIndexedDb,
} from './runtime-persistence';
import {
  fetchChatFileBlobWithFallback,
  isDirectChatAssetUrl,
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from './message-file';
import { createImagePreviewBlob } from './image-message-preview';

export type ChannelImageAssetVariant = 'thumbnail' | 'full';

type CacheableImageMessage = Pick<
  ChatMessage,
  | 'id'
  | 'message'
  | 'message_type'
  | 'file_name'
  | 'file_mime_type'
  | 'file_preview_url'
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

const CHANNEL_IMAGE_ASSET_DB_NAME =
  CHAT_RUNTIME_INDEXED_DB_NAMES.channelImageAssets;
const CHANNEL_IMAGE_ASSET_DB_VERSION = 1;
const CHANNEL_IMAGE_ASSET_STORE_NAME = 'channel-image-assets';
const CHANNEL_IMAGE_ASSET_CHANNEL_INDEX = 'channelId';
const CHANNEL_IMAGE_ASSET_CHANNEL_VARIANT_INDEX = 'channelVariant';
const CHANNEL_IMAGE_ASSET_FULL_BUDGET_BYTES = 250 * 1024 * 1024;
const CHANNEL_IMAGE_ASSET_SCOPE_RETENTION_LIMIT = 3;

let activeChannelImageAssetScopeId: string | null = null;
let retainedChannelImageAssetScopeIds: string[] = [];
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

export const buildRetainedChannelImageAssetScopeIds = ({
  activeChannelId,
  previousRetainedChannelIds = [],
  retentionLimit = CHANNEL_IMAGE_ASSET_SCOPE_RETENTION_LIMIT,
}: {
  activeChannelId?: string | null;
  previousRetainedChannelIds?: Array<string | null | undefined>;
  retentionLimit?: number;
}) => {
  const normalizedActiveChannelId = normalizeChannelId(activeChannelId);
  const normalizedPreviousChannelIds = previousRetainedChannelIds
    .map(channelId => normalizeChannelId(channelId))
    .filter((channelId): channelId is string => Boolean(channelId));

  if (!normalizedActiveChannelId) {
    return [...new Set(normalizedPreviousChannelIds)].slice(0, retentionLimit);
  }

  return [
    ...new Set([
      normalizedActiveChannelId,
      ...normalizedPreviousChannelIds.filter(
        channelId => channelId !== normalizedActiveChannelId
      ),
    ]),
  ].slice(0, retentionLimit);
};

const buildChannelImageAssetKey = (
  channelId: string,
  messageId: string,
  variant: ChannelImageAssetVariant
) => `${channelId}::${messageId}::${variant}`;

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
    channelImageAssetDbPromise = openRuntimeIndexedDb({
      dbName: CHANNEL_IMAGE_ASSET_DB_NAME,
      version: CHANNEL_IMAGE_ASSET_DB_VERSION,
      onOpenError: () => {
        channelImageAssetDbPromise = null;
      },
      onUpgrade: database => {
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
      },
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

const resolveThumbnailChannelImageAssetBlob = async (
  message: CacheableImageMessage
) => {
  const persistedPreviewPath = message.file_preview_url?.trim() || null;
  if (persistedPreviewPath) {
    const previewBlob = await fetchChatFileBlobWithFallback(
      persistedPreviewPath,
      persistedPreviewPath
    );
    if (previewBlob) {
      return previewBlob;
    }
  }

  const fullBlob = await resolveFullChannelImageAssetBlob(message);
  if (!fullBlob) {
    return null;
  }

  return (await createImagePreviewBlob(fullBlob)) || fullBlob;
};

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

  const assetKey = buildChannelImageAssetKey(
    normalizedChannelId,
    normalizedMessageId,
    variant
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

  const existingRuntimeUrl = getRuntimeChannelImageAssetUrl(
    normalizedChannelId,
    normalizedMessageId,
    variant
  );
  if (existingRuntimeUrl) {
    return existingRuntimeUrl;
  }

  const record = await readPersistedChannelImageAssetRecord(
    buildChannelImageAssetKey(normalizedChannelId, normalizedMessageId, variant)
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

  const existingRuntimeUrl = getRuntimeChannelImageAssetUrl(
    normalizedChannelId,
    normalizedMessageId,
    variant
  );
  if (existingRuntimeUrl) {
    return existingRuntimeUrl;
  }

  const assetKey = buildChannelImageAssetKey(
    normalizedChannelId,
    normalizedMessageId,
    variant
  );
  const pendingAssetLoad = pendingChannelImageAssetLoads.get(assetKey);
  if (pendingAssetLoad) {
    return await pendingAssetLoad;
  }

  const nextAssetLoad = (async () => {
    const persistedUrl = await loadCachedChannelImageAssetUrl(
      normalizedChannelId,
      normalizedMessageId,
      variant
    );
    if (persistedUrl) {
      return persistedUrl;
    }

    const resolvedBlob =
      variant === 'thumbnail'
        ? await resolveThumbnailChannelImageAssetBlob(message)
        : await resolveFullChannelImageAssetBlob(message);

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
      variant,
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
  const thumbnailBlob = await createImagePreviewBlob(file);
  const thumbnailUrl = thumbnailBlob
    ? await persistChannelImageAssetBlob(
        normalizedChannelId,
        normalizedMessageId,
        'thumbnail',
        thumbnailBlob
      )
    : fullUrl;

  return {
    fullUrl,
    thumbnailUrl,
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
  retainedChannelIds?: string | Array<string | null | undefined> | null
) => {
  const normalizedRetainedChannelIds = new Set(
    (Array.isArray(retainedChannelIds)
      ? retainedChannelIds
      : [retainedChannelIds]
    )
      .map(channelId => normalizeChannelId(channelId))
      .filter((channelId): channelId is string => Boolean(channelId))
  );

  for (const [assetKey, runtimeEntry] of runtimeChannelImageAssets) {
    if (normalizedRetainedChannelIds.has(runtimeEntry.channelId)) {
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
          if (normalizedRetainedChannelIds.has(record.channelId)) {
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
  if (!normalizedChannelId) {
    return;
  }

  retainedChannelImageAssetScopeIds = buildRetainedChannelImageAssetScopeIds({
    activeChannelId: normalizedChannelId,
    previousRetainedChannelIds: retainedChannelImageAssetScopeIds,
  });
  await purgeChannelImageAssetsExcept(retainedChannelImageAssetScopeIds);
};

export const resetChannelImageAssetCache = async () => {
  activeChannelImageAssetScopeId = null;
  retainedChannelImageAssetScopeIds = [];
  pendingChannelImageAssetLoads.clear();

  for (const assetKey of runtimeChannelImageAssets.keys()) {
    revokeRuntimeChannelImageAssetEntry(assetKey);
  }

  runtimeChannelImageAssets.clear();

  await closeRuntimeIndexedDb(channelImageAssetDbPromise);
  channelImageAssetDbPromise = null;

  if (!canUseIndexedDb()) {
    return;
  }

  await deleteRuntimeIndexedDb(CHANNEL_IMAGE_ASSET_DB_NAME);
};
