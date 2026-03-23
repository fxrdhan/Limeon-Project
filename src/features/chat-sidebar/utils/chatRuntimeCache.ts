import {
  CHAT_CONVERSATION_CACHE_MAX_AGE_MS,
  CHAT_CONVERSATION_CACHE_MAX_ENTRIES,
  CHAT_CONVERSATION_CACHE_MAX_MESSAGES,
  PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES,
} from '../constants';
import {
  conversationCacheStore,
  pendingReadReceiptsStore,
  pdfMessagePreviewStore,
  signedChatAssetUrlStore,
  type ConversationCacheEntry,
  type PdfMessagePreviewCacheEntry,
  type SignedChatAssetUrlCacheEntry,
} from './chatRuntimeState';
import {
  deletePersistedPdfPreviewEntriesByMessageIds,
  persistPdfPreviewEntry,
} from './pdf-preview-persistence';

const MAX_SIGNED_CHAT_ASSET_URL_CACHE_ENTRIES = 128;

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
