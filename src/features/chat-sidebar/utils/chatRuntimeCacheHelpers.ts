import type { ChatMessage } from '../data/chatSidebarGateway';
import type {
  ConversationCacheEntry,
  SignedChatAssetUrlCacheEntry,
} from './chatRuntimeState';

export const cloneBoundedConversationMessages = (
  messages: ChatMessage[],
  maxMessages: number
) => {
  const boundedMessages =
    messages.length > maxMessages ? messages.slice(-maxMessages) : messages;

  return boundedMessages.map(messageItem => ({ ...messageItem }));
};

export const getOldestConversationCacheKey = (
  cache: Map<string, ConversationCacheEntry>
) => {
  let oldestEntry: [string, ConversationCacheEntry] | null = null;

  for (const currentEntry of cache.entries()) {
    if (!oldestEntry || currentEntry[1].cachedAt < oldestEntry[1].cachedAt) {
      oldestEntry = currentEntry;
    }
  }

  return oldestEntry?.[0] ?? null;
};

export const pruneExpiredSignedAssetEntries = (
  store: Map<string, SignedChatAssetUrlCacheEntry>,
  now: number
) => {
  for (const [storagePath, cachedEntry] of store) {
    if (cachedEntry.expiresAt > now) {
      continue;
    }

    store.delete(storagePath);
  }
};

export const setSignedAssetEntryWithLimit = ({
  store,
  storagePath,
  entry,
  maxEntries,
}: {
  store: Map<string, SignedChatAssetUrlCacheEntry>;
  storagePath: string;
  entry: SignedChatAssetUrlCacheEntry;
  maxEntries: number;
}) => {
  if (store.has(storagePath)) {
    store.delete(storagePath);
  }

  store.set(storagePath, entry);

  while (store.size > maxEntries) {
    const oldestStoragePath = store.keys().next().value;
    if (!oldestStoragePath) {
      break;
    }

    store.delete(oldestStoragePath);
  }
};
