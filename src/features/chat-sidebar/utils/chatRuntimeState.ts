import type { ChatMessage } from '../data/chatSidebarGateway';

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

export interface ImageMessagePreviewCacheEntry {
  previewUrl: string;
  isObjectUrl: boolean;
}

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
    const parsedPayload = readRuntimeStorage<unknown>(storageKey, storage);
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
  storageKey: 'chat-pending-read-receipts',
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
    if (!payload || typeof payload !== 'object') {
      return;
    }

    Object.entries(payload).forEach(([userId, rawMessageIds]) => {
      if (!userId.trim() || !Array.isArray(rawMessageIds)) {
        return;
      }

      const normalizedMessageIds = rawMessageIds.filter(
        (messageId): messageId is string =>
          typeof messageId === 'string' && messageId.trim().length > 0
      );
      if (normalizedMessageIds.length === 0) {
        return;
      }

      value.set(userId, new Set(normalizedMessageIds));
    });
  },
});

export const signedChatAssetUrlStore = new Map<
  string,
  SignedChatAssetUrlCacheEntry
>();

export const imageMessagePreviewStore = new Map<
  string,
  ImageMessagePreviewCacheEntry
>();

export const imageExpandStageStore = new Map<string, string>();

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

export const readRuntimeStorage = <T>(
  storageKey: string,
  storage: 'session' | 'local' = 'session'
) => {
  const runtimeStorage = getRuntimeStorage(storage);
  if (!runtimeStorage) {
    return null;
  }

  try {
    const rawValue = runtimeStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
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
    runtimeStorage.setItem(storageKey, JSON.stringify(payload));
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
