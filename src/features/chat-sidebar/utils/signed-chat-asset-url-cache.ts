import {
  type SignedChatAssetUrlCacheEntry,
  signedChatAssetUrlStore,
} from './chatRuntimeState';

const MAX_SIGNED_CHAT_ASSET_URL_CACHE_ENTRIES = 128;

export const pruneExpiredSignedChatAssetUrls = (now = Date.now()) => {
  for (const [storagePath, cachedEntry] of signedChatAssetUrlStore) {
    if (cachedEntry.expiresAt > now) {
      continue;
    }

    signedChatAssetUrlStore.delete(storagePath);
  }
};

export const getSignedChatAssetUrlCacheEntry = (
  storagePath: string,
  now = Date.now()
): SignedChatAssetUrlCacheEntry | null => {
  pruneExpiredSignedChatAssetUrls(now);

  const cachedEntry = signedChatAssetUrlStore.get(storagePath);
  if (!cachedEntry || cachedEntry.expiresAt <= now) {
    signedChatAssetUrlStore.delete(storagePath);
    return null;
  }

  return cachedEntry;
};

export const setSignedChatAssetUrlCacheEntry = (
  storagePath: string,
  signedUrl: string,
  expiresAt: number
) => {
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
};

export const resetSignedChatAssetUrlCache = () => {
  signedChatAssetUrlStore.clear();
};
