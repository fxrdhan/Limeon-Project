import type { ChatMessage } from '../data/chatSidebarGateway';
import { CHAT_RUNTIME_LOCAL_STORAGE_KEYS } from './runtime-persistence';

type RuntimeListener = () => void;

export type ConversationCacheEntry = {
  messages: ChatMessage[];
  hasOlderMessages: boolean;
  cachedAt: number;
};

export type PdfMessagePreviewCacheEntry = {
  coverDataUrl: string;
  pageCount: number;
  cacheKey: string;
};

export interface SignedChatAssetUrlCacheEntry {
  signedUrl: string;
  expiresAt: number;
}

export interface RuntimePersistentStore<T> {
  value: T;
  listeners: Set<RuntimeListener>;
  storageKey: string;
  readonly hasHydrated: boolean;
  hydrate: () => void;
  persist: () => boolean;
  subscribe: (listener: RuntimeListener) => () => void;
  notify: () => void;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function createRuntimePersistentStore<T>({
  storageKey,
  storage = 'session',
  initialValue,
  serialize,
  deserialize,
}: {
  storageKey: string;
  storage?: 'session' | 'local';
  initialValue: () => T;
  serialize: (value: T) => unknown;
  deserialize: (payload: unknown, value: T) => void;
}): RuntimePersistentStore<T> {
  const listeners = new Set<RuntimeListener>();
  let hasHydrated = false;
  const value = initialValue();

  const hydrate = () => {
    if (hasHydrated) {
      return;
    }

    hasHydrated = true;
    const parsedPayload = readRuntimeStorage(storageKey, storage);
    if (parsedPayload === null) {
      return;
    }

    deserialize(parsedPayload, value);
  };

  const persist = () =>
    writeRuntimeStorage(storageKey, serialize(value), storage);

  const notify = () => {
    notifyRuntimeListeners(listeners);
  };

  const subscribe = (listener: RuntimeListener) => {
    hydrate();
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  return {
    value,
    listeners,
    storageKey,
    get hasHydrated() {
      return hasHydrated;
    },
    hydrate,
    persist,
    subscribe,
    notify,
  };
}

export const conversationCacheStore = new Map<string, ConversationCacheEntry>();

export const pendingReadReceiptsStore = createRuntimePersistentStore({
  storageKey: CHAT_RUNTIME_LOCAL_STORAGE_KEYS.pendingReadReceipts,
  storage: 'local',
  initialValue: () => new Map<string, Set<string>>(),
  serialize: value =>
    Object.fromEntries(
      [...value.entries()].map(([userId, messageIds]) => [
        userId,
        [...messageIds],
      ])
    ),
  deserialize: (payload, value) => {
    if (!isObjectRecord(payload)) {
      return;
    }

    Object.entries(payload).forEach(([userId, rawMessageIds]) => {
      const normalizedUserId = userId.trim();
      if (!normalizedUserId || !Array.isArray(rawMessageIds)) {
        return;
      }

      const normalizedMessageIds = [
        ...new Set(
          rawMessageIds
            .map(messageId =>
              typeof messageId === 'string' ? messageId.trim() : ''
            )
            .filter(Boolean)
        ),
      ];
      if (normalizedMessageIds.length === 0) {
        return;
      }

      value.set(normalizedUserId, new Set(normalizedMessageIds));
    });
  },
});

export const signedChatAssetUrlStore = new Map<
  string,
  SignedChatAssetUrlCacheEntry
>();

export const pdfMessagePreviewStore = {
  cache: new Map<string, PdfMessagePreviewCacheEntry>(),
  keysByMessageId: new Map<string, string>(),
};

const getRuntimeStorage = (storage: 'session' | 'local') => {
  if (typeof window === 'undefined') {
    return null;
  }

  return storage === 'local' ? window.localStorage : window.sessionStorage;
};

export const canUseRuntimeStorage = (storage: 'session' | 'local') =>
  getRuntimeStorage(storage) !== null;

export const readRuntimeStorage = (
  storageKey: string,
  storage: 'session' | 'local' = 'session'
): unknown => {
  const runtimeStorage = getRuntimeStorage(storage);
  if (!runtimeStorage) {
    return null;
  }

  let rawValue: string | null;
  try {
    rawValue = runtimeStorage.getItem(storageKey);
  } catch {
    return null;
  }

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    try {
      runtimeStorage.removeItem(storageKey);
    } catch {
      // Keep storage reads resilient when a browser blocks mutation.
    }
    return null;
  }
};

export const writeRuntimeStorage = (
  storageKey: string,
  payload: unknown,
  storage: 'session' | 'local' = 'session'
) => {
  const runtimeStorage = getRuntimeStorage(storage);
  if (!runtimeStorage) {
    return false;
  }

  try {
    const serializedPayload = JSON.stringify(payload);
    if (typeof serializedPayload !== 'string') {
      return false;
    }

    runtimeStorage.setItem(storageKey, serializedPayload);
    return true;
  } catch {
    return false;
  }
};

export const deleteRuntimeStorage = (
  storageKey: string,
  storage: 'session' | 'local' = 'session'
) => {
  const runtimeStorage = getRuntimeStorage(storage);
  if (!runtimeStorage) {
    return false;
  }

  try {
    runtimeStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
};

export const notifyRuntimeListeners = (listeners: Set<RuntimeListener>) => {
  listeners.forEach(listener => {
    listener();
  });
};
