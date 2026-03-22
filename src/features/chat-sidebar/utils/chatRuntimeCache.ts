import {
  IMAGE_EXPAND_STAGE_TARGET_SIZE,
  CHAT_CONVERSATION_CACHE_MAX_AGE_MS,
  CHAT_CONVERSATION_CACHE_MAX_ENTRIES,
  CHAT_CONVERSATION_CACHE_MAX_MESSAGES,
  PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES,
} from '../constants';
import {
  chatSharedLinkStore,
  chatSharedLinkVersionStore,
  conversationCacheStore,
  imageExpandStageStore,
  imageMessagePreviewStore,
  pendingReadReceiptsStore,
  pdfMessagePreviewStore,
  signedChatAssetUrlStore,
  type ChatSharedLinkCacheEntry,
  type ConversationCacheEntry,
  type ImageExpandStageCacheEntry,
  type ImageMessagePreviewCacheEntry,
  type PdfMessagePreviewCacheEntry,
  type SignedChatAssetUrlCacheEntry,
} from './chatRuntimeState';
import {
  deletePersistedChatSharedLinkEntriesByMessageIds,
  persistChatSharedLinkEntry,
} from './chat-shared-link-persistence';
import {
  deletePersistedImagePreviewEntriesByMessageIds,
  persistImagePreviewEntry,
} from './image-preview-persistence';
import {
  deletePersistedPdfPreviewEntriesByMessageIds,
  persistPdfPreviewEntry,
} from './pdf-preview-persistence';

const MAX_SIGNED_CHAT_ASSET_URL_CACHE_ENTRIES = 128;
const MAX_IMAGE_MESSAGE_PREVIEW_CACHE_ENTRIES = 64;
const MAX_CHAT_SHARED_LINK_CACHE_ENTRIES = 512;

const shouldPersistImagePreview = (preview: ImageMessagePreviewCacheEntry) =>
  !preview.isObjectUrl && preview.previewUrl.trim().startsWith('data:');

const revokeCachedImagePreviewObjectUrl = (
  previewEntry: ImageMessagePreviewCacheEntry | undefined
) => {
  if (
    !previewEntry?.isObjectUrl ||
    typeof URL === 'undefined' ||
    typeof URL.revokeObjectURL !== 'function'
  ) {
    return;
  }

  URL.revokeObjectURL(previewEntry.previewUrl);
};

const deleteCachedImagePreviewByMessageId = (
  messageId: string,
  store = imageMessagePreviewStore
) => {
  const existingPreview = store.get(messageId);
  revokeCachedImagePreviewObjectUrl(existingPreview);
  store.delete(messageId);
};

const deleteCachedImageExpandStageByMessageId = (
  messageId: string,
  store = imageExpandStageStore
) => {
  store.delete(messageId);
};

const setCachedImagePreview = (
  messageId: string,
  preview: ImageMessagePreviewCacheEntry,
  {
    persist = true,
    store = imageMessagePreviewStore,
  }: {
    persist?: boolean;
    store?: Map<string, ImageMessagePreviewCacheEntry>;
  } = {}
) => {
  const existingPreview = store.get(messageId);
  if (existingPreview && existingPreview.previewUrl !== preview.previewUrl) {
    revokeCachedImagePreviewObjectUrl(existingPreview);
  }

  if (store.has(messageId)) {
    store.delete(messageId);
  }

  store.set(messageId, preview);

  while (store.size > MAX_IMAGE_MESSAGE_PREVIEW_CACHE_ENTRIES) {
    const oldestMessageId = store.keys().next().value;
    if (!oldestMessageId) {
      break;
    }

    deleteCachedImagePreviewByMessageId(oldestMessageId, store);
  }

  if (
    persist &&
    !messageId.startsWith('temp_') &&
    shouldPersistImagePreview(preview)
  ) {
    void persistImagePreviewEntry(messageId, preview);
  }
};

const setCachedImageExpandStage = (
  messageId: string,
  stageDataUrl: string,
  targetSize = IMAGE_EXPAND_STAGE_TARGET_SIZE,
  store = imageExpandStageStore
) => {
  const normalizedStageDataUrl = stageDataUrl.trim();
  if (!normalizedStageDataUrl || targetSize <= 0) {
    return;
  }

  if (store.has(messageId)) {
    store.delete(messageId);
  }

  store.set(messageId, {
    previewUrl: normalizedStageDataUrl,
    targetSize,
  });

  while (store.size > MAX_IMAGE_MESSAGE_PREVIEW_CACHE_ENTRIES) {
    const oldestMessageId = store.keys().next().value;
    if (!oldestMessageId) {
      break;
    }

    deleteCachedImageExpandStageByMessageId(oldestMessageId, store);
  }
};

const removeCachedPdfPreviewByKey = (
  cacheKey: string,
  cache = pdfMessagePreviewStore.cache,
  keysByMessageId = pdfMessagePreviewStore.keysByMessageId
) => {
  cache.delete(cacheKey);

  for (const [messageId, mappedCacheKey] of keysByMessageId) {
    if (mappedCacheKey !== cacheKey) {
      continue;
    }

    keysByMessageId.delete(messageId);
    break;
  }
};

const setCachedPdfPreview = (
  messageId: string,
  preview: PdfMessagePreviewCacheEntry,
  {
    persist = true,
    cache = pdfMessagePreviewStore.cache,
    keysByMessageId = pdfMessagePreviewStore.keysByMessageId,
  }: {
    persist?: boolean;
    cache?: Map<string, PdfMessagePreviewCacheEntry>;
    keysByMessageId?: Map<string, string>;
  } = {}
) => {
  const previousCacheKey = keysByMessageId.get(messageId);
  if (previousCacheKey && previousCacheKey !== preview.cacheKey) {
    removeCachedPdfPreviewByKey(previousCacheKey, cache, keysByMessageId);
  }

  if (cache.has(preview.cacheKey)) {
    cache.delete(preview.cacheKey);
  }

  cache.set(preview.cacheKey, preview);
  keysByMessageId.set(messageId, preview.cacheKey);

  while (cache.size > PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES) {
    const oldestCacheKey = cache.keys().next().value;
    if (!oldestCacheKey) {
      break;
    }

    removeCachedPdfPreviewByKey(oldestCacheKey, cache, keysByMessageId);
  }

  if (persist && !messageId.startsWith('temp_')) {
    void persistPdfPreviewEntry(messageId, preview);
  }
};

const deleteCachedPdfPreviewsByMessageIds = (
  messageIds: string[],
  cache = pdfMessagePreviewStore.cache,
  keysByMessageId = pdfMessagePreviewStore.keysByMessageId
) => {
  const normalizedMessageIds = [...new Set(messageIds)]
    .map(messageId => messageId.trim())
    .filter(Boolean);

  normalizedMessageIds.forEach(messageId => {
    const cacheKey = keysByMessageId.get(messageId);
    if (!cacheKey) {
      return;
    }

    removeCachedPdfPreviewByKey(cacheKey, cache, keysByMessageId);
  });

  if (normalizedMessageIds.length > 0) {
    void deletePersistedPdfPreviewEntriesByMessageIds(normalizedMessageIds);
  }
};

const getPendingReadReceiptMessageIdsForUser = (
  userId: string,
  store = pendingReadReceiptsStore.value
) => {
  let messageIds = store.get(userId);
  if (!messageIds) {
    messageIds = new Set<string>();
    store.set(userId, messageIds);
  }

  return messageIds;
};

const pruneEmptyPendingReadReceiptUsers = (
  store = pendingReadReceiptsStore.value
) => {
  [...store.entries()].forEach(([userId, messageIds]) => {
    if (messageIds.size === 0) {
      store.delete(userId);
    }
  });
};

export { type ConversationCacheEntry, type PdfMessagePreviewCacheEntry };

const pruneExpiredSignedAssetEntries = (now = Date.now()) => {
  for (const [storagePath, cachedEntry] of signedChatAssetUrlStore) {
    if (cachedEntry.expiresAt > now) {
      continue;
    }

    signedChatAssetUrlStore.delete(storagePath);
  }
};

const setCachedChatSharedLink = (
  messageId: string,
  sharedLink: ChatSharedLinkCacheEntry,
  {
    persist = true,
    store = chatSharedLinkStore,
  }: {
    persist?: boolean;
    store?: Map<string, ChatSharedLinkCacheEntry>;
  } = {}
) => {
  const normalizedMessageId = messageId.trim();
  const normalizedShortUrl = sharedLink.shortUrl.trim();

  if (!normalizedMessageId || !normalizedShortUrl) {
    return;
  }

  const nextSharedLink: ChatSharedLinkCacheEntry = {
    shortUrl: normalizedShortUrl,
    storagePath: sharedLink.storagePath?.trim() || null,
    targetUrl: sharedLink.targetUrl?.trim() || null,
  };

  if (store.has(normalizedMessageId)) {
    store.delete(normalizedMessageId);
  }

  store.set(normalizedMessageId, nextSharedLink);

  while (store.size > MAX_CHAT_SHARED_LINK_CACHE_ENTRIES) {
    const oldestMessageId = store.keys().next().value;
    if (!oldestMessageId) {
      break;
    }

    store.delete(oldestMessageId);
  }

  if (persist && !normalizedMessageId.startsWith('temp_')) {
    void persistChatSharedLinkEntry(normalizedMessageId, nextSharedLink);
  }
};

const deleteCachedChatSharedLinksByMessageIds = (
  messageIds: string[],
  store = chatSharedLinkStore,
  versions = chatSharedLinkVersionStore
) => {
  const normalizedMessageIds = [...new Set(messageIds)]
    .map(messageId => messageId.trim())
    .filter(Boolean);

  normalizedMessageIds.forEach(messageId => {
    store.delete(messageId);
    versions.set(messageId, (versions.get(messageId) ?? 0) + 1);
  });

  if (normalizedMessageIds.length > 0) {
    void deletePersistedChatSharedLinkEntriesByMessageIds(normalizedMessageIds);
  }
};

export const chatRuntimeCache = {
  conversation: {
    getFreshEntry(
      channelId: string,
      cache: Map<string, ConversationCacheEntry> = conversationCacheStore
    ) {
      const cachedEntry = cache.get(channelId);
      if (!cachedEntry) return null;

      if (
        Date.now() - cachedEntry.cachedAt >
        CHAT_CONVERSATION_CACHE_MAX_AGE_MS
      ) {
        cache.delete(channelId);
        return null;
      }

      return cachedEntry;
    },

    setEntry(
      channelId: string,
      messages: ConversationCacheEntry['messages'],
      hasOlderMessages: boolean,
      cache: Map<string, ConversationCacheEntry> = conversationCacheStore
    ) {
      const boundedMessages =
        messages.length > CHAT_CONVERSATION_CACHE_MAX_MESSAGES
          ? messages.slice(-CHAT_CONVERSATION_CACHE_MAX_MESSAGES)
          : messages;

      cache.set(channelId, {
        messages: boundedMessages.map(messageItem => ({ ...messageItem })),
        hasOlderMessages,
        cachedAt: Date.now(),
      });

      if (cache.size <= CHAT_CONVERSATION_CACHE_MAX_ENTRIES) {
        return;
      }

      const oldestEntry = [...cache.entries()].reduce((oldest, currentEntry) =>
        currentEntry[1].cachedAt < oldest[1].cachedAt ? currentEntry : oldest
      );
      cache.delete(oldestEntry[0]);
    },

    reset(cache: Map<string, ConversationCacheEntry> = conversationCacheStore) {
      cache.clear();
    },
  },

  readReceipts: {
    queueMessageIds(userId: string, messageIds: string[]) {
      pendingReadReceiptsStore.hydrate();
      if (!userId.trim()) {
        return false;
      }

      const userMessageIds = getPendingReadReceiptMessageIdsForUser(userId);
      let hasChanges = false;

      messageIds.forEach(messageId => {
        const normalizedMessageId = messageId.trim();
        if (!normalizedMessageId || userMessageIds.has(normalizedMessageId)) {
          return;
        }

        userMessageIds.add(normalizedMessageId);
        hasChanges = true;
      });

      if (!hasChanges) {
        return false;
      }

      pendingReadReceiptsStore.persist();
      pendingReadReceiptsStore.notify();
      return true;
    },

    peekMessageIds(userId: string, limit = 200) {
      pendingReadReceiptsStore.hydrate();
      if (!userId.trim()) {
        return [];
      }

      return [...getPendingReadReceiptMessageIdsForUser(userId)].slice(
        0,
        Math.max(1, limit)
      );
    },

    ackMessageIds(userId: string, messageIds: string[]) {
      pendingReadReceiptsStore.hydrate();
      if (!userId.trim()) {
        return false;
      }

      const userMessageIds = getPendingReadReceiptMessageIdsForUser(userId);
      let hasChanges = false;

      messageIds.forEach(messageId => {
        if (!userMessageIds.delete(messageId)) {
          return;
        }

        hasChanges = true;
      });

      if (!hasChanges) {
        return false;
      }

      pruneEmptyPendingReadReceiptUsers();
      pendingReadReceiptsStore.persist();
      pendingReadReceiptsStore.notify();
      return true;
    },

    hasPendingMessageIds(userId?: string | null) {
      pendingReadReceiptsStore.hydrate();
      if (!userId) {
        return [...pendingReadReceiptsStore.value.values()].some(
          messageIds => messageIds.size > 0
        );
      }

      return getPendingReadReceiptMessageIdsForUser(userId).size > 0;
    },

    subscribe(listener: () => void) {
      return pendingReadReceiptsStore.subscribe(listener);
    },

    reset(userId?: string | null) {
      pendingReadReceiptsStore.hydrate();

      if (userId) {
        if (!pendingReadReceiptsStore.value.delete(userId)) {
          return;
        }
      } else if (pendingReadReceiptsStore.value.size === 0) {
        return;
      } else {
        pendingReadReceiptsStore.value.clear();
      }

      pruneEmptyPendingReadReceiptUsers();
      pendingReadReceiptsStore.persist();
      pendingReadReceiptsStore.notify();
    },
  },

  imagePreviews: {
    getEntry(
      messageId: string,
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      return store.get(messageId) ?? null;
    },

    getExpandStage(
      messageId: string,
      targetSize = IMAGE_EXPAND_STAGE_TARGET_SIZE,
      store: Map<string, ImageExpandStageCacheEntry> = imageExpandStageStore
    ) {
      const cachedEntry = store.get(messageId) ?? null;
      if (
        !cachedEntry ||
        cachedEntry.targetSize !== targetSize ||
        !cachedEntry.previewUrl.trim()
      ) {
        if (cachedEntry) {
          deleteCachedImageExpandStageByMessageId(messageId, store);
        }

        return null;
      }

      return cachedEntry.previewUrl;
    },

    setEntry(
      messageId: string,
      preview: ImageMessagePreviewCacheEntry,
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      setCachedImagePreview(messageId, preview, { store });
    },

    setExpandStage(
      messageId: string,
      stageDataUrl: string,
      targetSize = IMAGE_EXPAND_STAGE_TARGET_SIZE,
      store: Map<string, ImageExpandStageCacheEntry> = imageExpandStageStore
    ) {
      setCachedImageExpandStage(messageId, stageDataUrl, targetSize, store);
    },

    hydrate(
      messageId: string,
      preview: ImageMessagePreviewCacheEntry,
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      setCachedImagePreview(messageId, preview, {
        persist: false,
        store,
      });
    },

    transferEntry(
      sourceMessageId: string,
      targetMessageId: string,
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      const existingPreview = store.get(sourceMessageId);
      const existingExpandStage = imageExpandStageStore.get(sourceMessageId);
      if (!existingPreview) {
        if (!existingExpandStage) {
          return false;
        }
      } else {
        store.delete(sourceMessageId);
        setCachedImagePreview(targetMessageId, existingPreview, { store });
      }

      if (existingExpandStage) {
        imageExpandStageStore.delete(sourceMessageId);
        setCachedImageExpandStage(
          targetMessageId,
          existingExpandStage.previewUrl,
          existingExpandStage.targetSize
        );
      }

      return true;
    },

    deleteByMessageIds(
      messageIds: string[],
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      [...new Set(messageIds)]
        .map(messageId => messageId.trim())
        .filter(Boolean)
        .forEach(messageId => {
          deleteCachedImagePreviewByMessageId(messageId, store);
          deleteCachedImageExpandStageByMessageId(messageId);
        });

      void deletePersistedImagePreviewEntriesByMessageIds(messageIds);
    },

    deleteRuntimeByMessageIds(
      messageIds: string[],
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      [...new Set(messageIds)]
        .map(messageId => messageId.trim())
        .filter(Boolean)
        .forEach(messageId => {
          deleteCachedImagePreviewByMessageId(messageId, store);
          deleteCachedImageExpandStageByMessageId(messageId);
        });
    },

    pruneExcept(
      retainedMessageIds: Iterable<string>,
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      const retainedIds = new Set(
        [...retainedMessageIds]
          .map(messageId => messageId.trim())
          .filter(Boolean)
      );

      const staleMessageIds = new Set<string>();

      for (const messageId of store.keys()) {
        if (retainedIds.has(messageId)) {
          continue;
        }

        staleMessageIds.add(messageId);
      }

      for (const messageId of imageExpandStageStore.keys()) {
        if (retainedIds.has(messageId)) {
          continue;
        }

        staleMessageIds.add(messageId);
      }

      [...staleMessageIds].forEach(messageId => {
        deleteCachedImagePreviewByMessageId(messageId, store);
        deleteCachedImageExpandStageByMessageId(messageId);
      });
    },

    reset(
      store: Map<
        string,
        ImageMessagePreviewCacheEntry
      > = imageMessagePreviewStore
    ) {
      const cachedMessageIds = new Set<string>();

      for (const messageId of store.keys()) {
        cachedMessageIds.add(messageId);
      }

      for (const messageId of imageExpandStageStore.keys()) {
        cachedMessageIds.add(messageId);
      }

      [...cachedMessageIds].forEach(messageId => {
        deleteCachedImagePreviewByMessageId(messageId, store);
        deleteCachedImageExpandStageByMessageId(messageId);
      });
    },
  },

  signedAssets: {
    pruneExpired(now = Date.now()) {
      pruneExpiredSignedAssetEntries(now);
    },

    getEntry(storagePath: string, now = Date.now()) {
      pruneExpiredSignedAssetEntries(now);

      const cachedEntry = signedChatAssetUrlStore.get(storagePath);
      if (!cachedEntry || cachedEntry.expiresAt <= now) {
        signedChatAssetUrlStore.delete(storagePath);
        return null;
      }

      return cachedEntry as SignedChatAssetUrlCacheEntry;
    },

    setEntry(storagePath: string, signedUrl: string, expiresAt: number) {
      if (signedChatAssetUrlStore.has(storagePath)) {
        signedChatAssetUrlStore.delete(storagePath);
      }

      signedChatAssetUrlStore.set(storagePath, {
        signedUrl,
        expiresAt,
      });

      while (
        signedChatAssetUrlStore.size > MAX_SIGNED_CHAT_ASSET_URL_CACHE_ENTRIES
      ) {
        const oldestStoragePath = signedChatAssetUrlStore.keys().next().value;
        if (!oldestStoragePath) {
          break;
        }

        signedChatAssetUrlStore.delete(oldestStoragePath);
      }
    },

    reset() {
      signedChatAssetUrlStore.clear();
    },
  },

  sharedLinks: {
    getEntry(
      messageId: string,
      store: Map<string, ChatSharedLinkCacheEntry> = chatSharedLinkStore
    ) {
      return store.get(messageId) ?? null;
    },

    getVersion(
      messageId: string,
      store: Map<string, number> = chatSharedLinkVersionStore
    ) {
      return store.get(messageId) ?? 0;
    },

    setEntry(
      messageId: string,
      sharedLink: ChatSharedLinkCacheEntry,
      store: Map<string, ChatSharedLinkCacheEntry> = chatSharedLinkStore
    ) {
      setCachedChatSharedLink(messageId, sharedLink, { store });
    },

    hydrate(
      messageId: string,
      sharedLink: ChatSharedLinkCacheEntry,
      store: Map<string, ChatSharedLinkCacheEntry> = chatSharedLinkStore
    ) {
      setCachedChatSharedLink(messageId, sharedLink, {
        persist: false,
        store,
      });
    },

    deleteByMessageIds(
      messageIds: string[],
      store: Map<string, ChatSharedLinkCacheEntry> = chatSharedLinkStore,
      versions: Map<string, number> = chatSharedLinkVersionStore
    ) {
      deleteCachedChatSharedLinksByMessageIds(messageIds, store, versions);
    },

    reset(
      store: Map<string, ChatSharedLinkCacheEntry> = chatSharedLinkStore,
      versions: Map<string, number> = chatSharedLinkVersionStore
    ) {
      store.clear();
      versions.clear();
    },
  },

  pdfPreviews: {
    get(cacheKey: string, cache = pdfMessagePreviewStore.cache) {
      return cache.get(cacheKey);
    },

    set(
      messageId: string,
      preview: PdfMessagePreviewCacheEntry,
      cache = pdfMessagePreviewStore.cache,
      keysByMessageId = pdfMessagePreviewStore.keysByMessageId
    ) {
      setCachedPdfPreview(messageId, preview, {
        cache,
        keysByMessageId,
      });
    },

    hydrate(
      messageId: string,
      preview: PdfMessagePreviewCacheEntry,
      cache = pdfMessagePreviewStore.cache,
      keysByMessageId = pdfMessagePreviewStore.keysByMessageId
    ) {
      setCachedPdfPreview(messageId, preview, {
        persist: false,
        cache,
        keysByMessageId,
      });
    },

    deleteByMessageIds(
      messageIds: string[],
      cache = pdfMessagePreviewStore.cache,
      keysByMessageId = pdfMessagePreviewStore.keysByMessageId
    ) {
      deleteCachedPdfPreviewsByMessageIds(messageIds, cache, keysByMessageId);
    },

    pruneInactiveMessageIds(
      activeMessageIds: Set<string>,
      cache = pdfMessagePreviewStore.cache,
      keysByMessageId = pdfMessagePreviewStore.keysByMessageId
    ) {
      for (const [messageId, cacheKey] of keysByMessageId) {
        if (activeMessageIds.has(messageId)) {
          continue;
        }

        removeCachedPdfPreviewByKey(cacheKey, cache, keysByMessageId);
      }
    },

    reset(
      cache = pdfMessagePreviewStore.cache,
      keysByMessageId = pdfMessagePreviewStore.keysByMessageId
    ) {
      cache.clear();
      keysByMessageId.clear();
    },
  },
};
