import {
  CHAT_CONVERSATION_CACHE_MAX_AGE_MS,
  CHAT_CONVERSATION_CACHE_MAX_ENTRIES,
  CHAT_CONVERSATION_CACHE_MAX_MESSAGES,
  PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES,
} from '../constants';
import {
  conversationCacheStore,
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
import {
  cloneBoundedConversationMessages,
  getOldestConversationCacheKey,
  pruneExpiredSignedAssetEntries,
  setSignedAssetEntryWithLimit,
} from './chatRuntimeCacheHelpers';
import { readReceiptRuntimeCache } from './readReceiptRuntimeCache';

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

export { type ConversationCacheEntry, type PdfMessagePreviewCacheEntry };

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
      cache.set(channelId, {
        messages: cloneBoundedConversationMessages(
          messages,
          CHAT_CONVERSATION_CACHE_MAX_MESSAGES
        ),
        hasOlderMessages,
        cachedAt: Date.now(),
      });

      if (cache.size <= CHAT_CONVERSATION_CACHE_MAX_ENTRIES) {
        return;
      }

      const oldestCacheKey = getOldestConversationCacheKey(cache);
      if (oldestCacheKey) {
        cache.delete(oldestCacheKey);
      }
    },

    reset(cache: Map<string, ConversationCacheEntry> = conversationCacheStore) {
      cache.clear();
    },
  },

  readReceipts: readReceiptRuntimeCache,

  signedAssets: {
    pruneExpired(now = Date.now()) {
      pruneExpiredSignedAssetEntries(signedChatAssetUrlStore, now);
    },

    getEntry(storagePath: string, now = Date.now()) {
      pruneExpiredSignedAssetEntries(signedChatAssetUrlStore, now);

      const cachedEntry = signedChatAssetUrlStore.get(storagePath);
      if (!cachedEntry || cachedEntry.expiresAt <= now) {
        signedChatAssetUrlStore.delete(storagePath);
        return null;
      }

      return cachedEntry as SignedChatAssetUrlCacheEntry;
    },

    setEntry(storagePath: string, signedUrl: string, expiresAt: number) {
      setSignedAssetEntryWithLimit({
        store: signedChatAssetUrlStore,
        storagePath,
        entry: {
          signedUrl,
          expiresAt,
        },
        maxEntries: MAX_SIGNED_CHAT_ASSET_URL_CACHE_ENTRIES,
      });
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
