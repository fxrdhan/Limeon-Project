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

export const chatRuntimeState = {
  conversationCache: new Map<string, ConversationCacheEntry>(),
  pendingReadReceipts: {
    idsByUser: new Map<string, Set<string>>(),
    listeners: new Set<RuntimeListener>(),
    hasHydrated: false,
  },
  pendingPdfPreviews: {
    jobs: new Map<string, PendingPdfPreviewJob>(),
    listeners: new Set<RuntimeListener>(),
    hasHydrated: false,
  },
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
