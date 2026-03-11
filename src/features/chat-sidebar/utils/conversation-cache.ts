import {
  CHAT_CONVERSATION_CACHE_MAX_AGE_MS,
  CHAT_CONVERSATION_CACHE_MAX_ENTRIES,
  CHAT_CONVERSATION_CACHE_MAX_MESSAGES,
} from '../constants';
import {
  chatRuntimeState,
  type ConversationCacheEntry,
} from './chatRuntimeState';

export const getFreshConversationCacheEntry = (
  channelId: string,
  cache: Map<
    string,
    ConversationCacheEntry
  > = chatRuntimeState.conversationCache
) => {
  const cachedEntry = cache.get(channelId);
  if (!cachedEntry) return null;

  if (Date.now() - cachedEntry.cachedAt > CHAT_CONVERSATION_CACHE_MAX_AGE_MS) {
    cache.delete(channelId);
    return null;
  }

  return cachedEntry;
};

export const setConversationCacheEntry = (
  channelId: string,
  messages: ConversationCacheEntry['messages'],
  hasOlderMessages: boolean,
  cache: Map<
    string,
    ConversationCacheEntry
  > = chatRuntimeState.conversationCache
) => {
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
};

export const resetConversationCache = (
  cache: Map<
    string,
    ConversationCacheEntry
  > = chatRuntimeState.conversationCache
) => {
  cache.clear();
};
