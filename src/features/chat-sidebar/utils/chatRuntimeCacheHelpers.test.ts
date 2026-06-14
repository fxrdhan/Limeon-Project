import { describe, expect, it } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type {
  ConversationCacheEntry,
  SignedChatAssetUrlCacheEntry,
} from './chatRuntimeState';
import {
  cloneBoundedConversationMessages,
  getOldestConversationCacheKey,
  pruneExpiredSignedAssetEntries,
  setSignedAssetEntryWithLimit,
} from './chatRuntimeCacheHelpers';

const message = (id: string): ChatMessage => ({
  id,
  sender_id: 'sender-1',
  receiver_id: 'receiver-1',
  channel_id: 'channel-1',
  message: id,
  message_type: 'text',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_read: false,
  reply_to_id: null,
});

const signedEntry = (
  signedUrl: string,
  expiresAt: number
): SignedChatAssetUrlCacheEntry => ({
  signedUrl,
  expiresAt,
});

describe('chat runtime cache helpers', () => {
  it('clones only the newest bounded conversation messages', () => {
    const messages = [message('first'), message('second'), message('third')];
    const result = cloneBoundedConversationMessages(messages, 2);

    expect(result.map(messageItem => messageItem.id)).toEqual([
      'second',
      'third',
    ]);
    expect(result[0]).not.toBe(messages[1]);
    expect(result[1]).not.toBe(messages[2]);
  });

  it('finds the oldest conversation cache key by cachedAt', () => {
    const cache = new Map<string, ConversationCacheEntry>([
      [
        'channel-new',
        {
          messages: [],
          hasOlderMessages: false,
          cachedAt: 300,
        },
      ],
      [
        'channel-old',
        {
          messages: [],
          hasOlderMessages: false,
          cachedAt: 100,
        },
      ],
    ]);

    expect(getOldestConversationCacheKey(cache)).toBe('channel-old');
    expect(getOldestConversationCacheKey(new Map())).toBeNull();
  });

  it('prunes expired signed asset entries in place', () => {
    const store = new Map<string, SignedChatAssetUrlCacheEntry>([
      ['fresh', signedEntry('https://fresh.test', 300)],
      ['expired', signedEntry('https://expired.test', 100)],
    ]);

    pruneExpiredSignedAssetEntries(store, 200);

    expect([...store.keys()]).toEqual(['fresh']);
  });

  it('refreshes existing signed assets and evicts oldest entries over the limit', () => {
    const store = new Map<string, SignedChatAssetUrlCacheEntry>([
      ['first', signedEntry('https://first.test', 1000)],
      ['second', signedEntry('https://second.test', 1000)],
    ]);

    setSignedAssetEntryWithLimit({
      store,
      storagePath: 'first',
      entry: signedEntry('https://first-new.test', 2000),
      maxEntries: 2,
    });
    setSignedAssetEntryWithLimit({
      store,
      storagePath: 'third',
      entry: signedEntry('https://third.test', 3000),
      maxEntries: 2,
    });

    expect([...store.entries()]).toEqual([
      ['first', signedEntry('https://first-new.test', 2000)],
      ['third', signedEntry('https://third.test', 3000)],
    ]);
  });
});
