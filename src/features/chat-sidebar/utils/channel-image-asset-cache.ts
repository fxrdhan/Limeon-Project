import { createImagePreviewBlob } from './image-message-preview';
import { isDirectChatAssetUrl } from './message-file';
import {
  isCacheableChannelImageMessage,
  resolveFullChannelImageAssetBlob,
  resolveThumbnailChannelImageAssetBlob,
} from './channel-image-asset-cache/blobResolvers';
import {
  buildChannelImageAssetKey,
  buildRetainedChannelImageAssetScopeIds,
  normalizeChannelId,
  normalizeMessageId,
} from './channel-image-asset-cache/keys';
import {
  deletePersistedChannelImageAssetKeys,
  listPersistedChannelImageAssetRecords,
  purgePersistedChannelImageAssetsExcept,
  readPersistedChannelImageAssetRecord,
  resetPersistedChannelImageAssetCache,
  touchPersistedChannelImageAssetRecord,
  writePersistedChannelImageAssetRecord,
} from './channel-image-asset-cache/persistence';
import type {
  CacheableImageMessage,
  ChannelImageAssetVariant,
  PersistedChannelImageAssetRecord,
  RuntimeChannelImageAssetRecord,
} from './channel-image-asset-cache/types';

export type { ChannelImageAssetVariant } from './channel-image-asset-cache/types';
export {
  buildRetainedChannelImageAssetScopeIds,
  isCacheableChannelImageMessage,
};

const CHANNEL_IMAGE_ASSET_FULL_BUDGET_BYTES = 250 * 1024 * 1024;

let activeChannelImageAssetScopeId: string | null = null;
let retainedChannelImageAssetScopeIds: string[] = [];

const runtimeChannelImageAssets = new Map<
  string,
  RuntimeChannelImageAssetRecord
>();
const pendingChannelImageAssetLoads = new Map<string, Promise<string | null>>();

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

const cacheRuntimeChannelImageAssetBlob = (
  channelId: string,
  messageId: string,
  variant: ChannelImageAssetVariant,
  blob: Blob
) => {
  const record = createPersistedChannelImageAssetRecord({
    channelId,
    messageId,
    variant,
    blob,
  });

  revokeRuntimeChannelImageAssetEntry(record.key);
  return hydrateRuntimeChannelImageAssetUrl(record);
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

  if (variant === 'full') {
    return null;
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

    return variant === 'full'
      ? cacheRuntimeChannelImageAssetBlob(
          normalizedChannelId,
          normalizedMessageId,
          variant,
          resolvedBlob
        )
      : await persistChannelImageAssetBlob(
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

  const fullUrl = cacheRuntimeChannelImageAssetBlob(
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

  await purgePersistedChannelImageAssetsExcept(normalizedRetainedChannelIds);
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

  await resetPersistedChannelImageAssetCache();
};
