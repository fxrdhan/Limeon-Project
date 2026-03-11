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

export interface PendingPdfPreviewJob {
  messageId: string;
  senderId: string;
  message: string;
  fileName: string | null;
  fileMimeType: string | null;
  fileStoragePath: string;
  attempts: number;
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
  initialValue,
  serialize,
  deserialize,
}: {
  storageKey: string;
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
    const parsedPayload = readRuntimeSessionStorage<unknown>(storageKey);
    if (parsedPayload === null) {
      return;
    }

    deserialize(parsedPayload, value);
  };

  const persist = () =>
    writeRuntimeSessionStorage(storageKey, serialize(value));

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

export const chatRuntimeState = {
  conversationCache: new Map<string, ConversationCacheEntry>(),
  pendingReadReceipts: createRuntimePersistentStore({
    storageKey: 'chat-pending-read-receipts',
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
  }),
  pendingPdfPreviews: createRuntimePersistentStore({
    storageKey: 'chat-pending-pdf-preview-jobs',
    initialValue: () => new Map<string, PendingPdfPreviewJob>(),
    serialize: value => [...value.values()],
    deserialize: (payload, value) => {
      if (!Array.isArray(payload)) {
        return;
      }

      payload.forEach(job => {
        if (
          typeof job?.messageId === 'string' &&
          job.messageId.trim().length > 0 &&
          typeof job?.senderId === 'string' &&
          job.senderId.trim().length > 0 &&
          typeof job?.message === 'string' &&
          typeof job?.fileStoragePath === 'string' &&
          job.fileStoragePath.trim().length > 0
        ) {
          value.set(job.messageId, {
            messageId: job.messageId,
            senderId: job.senderId,
            message: job.message,
            fileName: typeof job.fileName === 'string' ? job.fileName : null,
            fileMimeType:
              typeof job.fileMimeType === 'string' ? job.fileMimeType : null,
            fileStoragePath: job.fileStoragePath,
            attempts:
              typeof job.attempts === 'number' && Number.isFinite(job.attempts)
                ? Math.max(0, job.attempts)
                : 0,
          });
        }
      });
    },
  }),
  signedChatAssetUrls: new Map<string, SignedChatAssetUrlCacheEntry>(),
  pdfMessagePreviews: {
    cache: new Map<string, PdfMessagePreviewCacheEntry>(),
    keysByMessageId: new Map<string, string>(),
  },
};

export const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const readRuntimeSessionStorage = <T>(storageKey: string) => {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
};

export const writeRuntimeSessionStorage = (
  storageKey: string,
  payload: unknown
) => {
  if (!canUseSessionStorage()) {
    return false;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
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
