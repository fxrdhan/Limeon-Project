import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { MutableRefObject } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { chatRuntime } from '../utils/chatRuntime';
import {
  getFreshResolvedChatAssetUrl,
  resolveChatAssetUrlWithExpiry,
  type ResolvedChatAssetUrlEntry,
} from '../utils/message-file';
import type { VisibleBounds } from '../utils/viewport-visibility';
import { runTasksWithConcurrency } from './message-image-previews/concurrency';
import {
  FULL_IMAGE_PREFETCH_DELAY_MS,
  IMAGE_PREFETCH_DEBOUNCE_MS,
} from './message-image-previews/constants';
import {
  getNextPreviewAssetExpiryAt,
  pruneExpiredPreviewAssetEntries,
  pruneRecordByActiveIds,
} from './message-image-previews/assetEntryState';
import { resolveImageMessageUrl } from './message-image-previews/imageMessageUrl';
import { collectVisibleImageMessages as collectVisibleImageMessagesForPreview } from './message-image-previews/visibleImageMessages';

export const useMessageImagePreviews = ({
  messages,
  currentChannelId,
  messagesContainerRef,
  chatHeaderContainerRef,
  messageBubbleRefs,
  getVisibleMessagesBounds,
  viewportPrefetchableImageMessageIds,
}: {
  messages: ChatMessage[];
  currentChannelId: string | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  viewportPrefetchableImageMessageIds?: ReadonlySet<string>;
}) => {
  const [
    resolvedPreviewAssetEntriesByMessageId,
    setResolvedPreviewAssetEntriesByMessageId,
  ] = useState<Record<string, ResolvedChatAssetUrlEntry>>({});
  const [
    resolvedFullAssetUrlsByMessageId,
    setResolvedFullAssetUrlsByMessageId,
  ] = useState<Record<string, string>>({});
  const previewPrefetchTimeoutRef = useRef<number | null>(null);
  const fullPrefetchTimeoutRef = useRef<number | null>(null);
  const previewAssetExpiryTimeoutRef = useRef<number | null>(null);

  const setResolvedPreviewAssetEntry = useCallback(
    (messageId: string, previewEntry: ResolvedChatAssetUrlEntry | null) => {
      if (!previewEntry) {
        return;
      }

      setResolvedPreviewAssetEntriesByMessageId(previousEntries => {
        const previousEntry = previousEntries[messageId];
        if (
          previousEntry?.url === previewEntry.url &&
          previousEntry.expiresAt === previewEntry.expiresAt
        ) {
          return previousEntries;
        }

        return {
          ...previousEntries,
          [messageId]: previewEntry,
        };
      });
    },
    []
  );

  const setResolvedFullAssetUrl = useCallback(
    (messageId: string, previewUrl: string | null) => {
      if (!previewUrl) {
        return;
      }

      setResolvedFullAssetUrlsByMessageId(previousUrls => {
        if (previousUrls[messageId] === previewUrl) {
          return previousUrls;
        }

        return {
          ...previousUrls,
          [messageId]: previewUrl,
        };
      });
    },
    []
  );

  const collectVisibleImageMessages = useCallback(() => {
    return collectVisibleImageMessagesForPreview({
      chatHeaderElement: chatHeaderContainerRef.current,
      currentChannelId,
      getVisibleMessagesBounds,
      messageBubbleElements: messageBubbleRefs.current,
      messages,
      viewportPrefetchableImageMessageIds,
    });
  }, [
    chatHeaderContainerRef,
    currentChannelId,
    getVisibleMessagesBounds,
    messageBubbleRefs,
    messages,
    viewportPrefetchableImageMessageIds,
  ]);

  const prefetchVisibleImageAssets = useCallback(
    async ({
      requireMissingPersistedPreview = false,
      variant = 'full',
    }: {
      requireMissingPersistedPreview?: boolean;
      variant?: 'full' | 'thumbnail';
    } = {}) => {
      const normalizedChannelId = currentChannelId?.trim() || '';
      if (!normalizedChannelId) {
        return;
      }

      const visibleImageMessages = collectVisibleImageMessages().filter(
        messageItem =>
          !requireMissingPersistedPreview ||
          !messageItem.file_preview_url?.trim()
      );
      if (visibleImageMessages.length === 0) {
        return;
      }

      await runTasksWithConcurrency(
        visibleImageMessages,
        3,
        async messageItem => {
          const resolvedAssetUrl = await chatRuntime.imageAssets.ensureUrl(
            normalizedChannelId,
            messageItem,
            variant
          );
          if (variant === 'thumbnail') {
            setResolvedPreviewAssetEntry(
              messageItem.id,
              resolvedAssetUrl
                ? {
                    url: resolvedAssetUrl,
                    expiresAt: null,
                  }
                : null
            );
            return;
          }

          setResolvedFullAssetUrl(messageItem.id, resolvedAssetUrl);
        }
      );
    },
    [
      collectVisibleImageMessages,
      currentChannelId,
      setResolvedFullAssetUrl,
      setResolvedPreviewAssetEntry,
    ]
  );

  const resolveVisibleImagePreviewAssetUrls = useCallback(async () => {
    const visibleImageMessages = collectVisibleImageMessages().filter(
      messageItem => {
        const previewPath = messageItem.file_preview_url?.trim();
        const resolvedPreviewEntry =
          resolvedPreviewAssetEntriesByMessageId[messageItem.id];

        return Boolean(
          previewPath &&
          !getFreshResolvedChatAssetUrl(resolvedPreviewEntry) &&
          !resolvedFullAssetUrlsByMessageId[messageItem.id]
        );
      }
    );
    if (visibleImageMessages.length === 0) {
      return;
    }

    await runTasksWithConcurrency(
      visibleImageMessages,
      6,
      async messageItem => {
        const previewPath = messageItem.file_preview_url?.trim();
        if (!previewPath) {
          return;
        }

        const resolvedPreviewEntry = await resolveChatAssetUrlWithExpiry(
          previewPath,
          previewPath
        );
        setResolvedPreviewAssetEntry(messageItem.id, resolvedPreviewEntry);
      }
    );
  }, [
    collectVisibleImageMessages,
    resolvedFullAssetUrlsByMessageId,
    resolvedPreviewAssetEntriesByMessageId,
    setResolvedPreviewAssetEntry,
  ]);

  const scheduleVisibleImageAssetPrefetch = useCallback(() => {
    if (previewPrefetchTimeoutRef.current !== null) {
      window.clearTimeout(previewPrefetchTimeoutRef.current);
    }
    if (fullPrefetchTimeoutRef.current !== null) {
      window.clearTimeout(fullPrefetchTimeoutRef.current);
    }

    previewPrefetchTimeoutRef.current = window.setTimeout(() => {
      previewPrefetchTimeoutRef.current = null;
      void Promise.all([
        resolveVisibleImagePreviewAssetUrls(),
        prefetchVisibleImageAssets({
          requireMissingPersistedPreview: true,
          variant: 'thumbnail',
        }),
      ]);
    }, IMAGE_PREFETCH_DEBOUNCE_MS);

    fullPrefetchTimeoutRef.current = window.setTimeout(() => {
      fullPrefetchTimeoutRef.current = null;
      void prefetchVisibleImageAssets();
    }, FULL_IMAGE_PREFETCH_DELAY_MS);
  }, [prefetchVisibleImageAssets, resolveVisibleImagePreviewAssetUrls]);

  useEffect(() => {
    setResolvedPreviewAssetEntriesByMessageId({});
    setResolvedFullAssetUrlsByMessageId({});
    if (!currentChannelId?.trim()) {
      return;
    }

    void chatRuntime.imageAssets.activateScope(currentChannelId);
  }, [currentChannelId]);

  useEffect(() => {
    const activeMessageIds = new Set(
      messages.map(messageItem => messageItem.id)
    );

    setResolvedPreviewAssetEntriesByMessageId(previousEntries =>
      pruneRecordByActiveIds(previousEntries, activeMessageIds)
    );
    setResolvedFullAssetUrlsByMessageId(previousUrls =>
      pruneRecordByActiveIds(previousUrls, activeMessageIds)
    );
  }, [messages]);

  useEffect(() => {
    if (previewAssetExpiryTimeoutRef.current !== null) {
      window.clearTimeout(previewAssetExpiryTimeoutRef.current);
      previewAssetExpiryTimeoutRef.current = null;
    }

    const nextExpiryAt = getNextPreviewAssetExpiryAt(
      resolvedPreviewAssetEntriesByMessageId
    );

    if (nextExpiryAt === null) {
      return;
    }

    previewAssetExpiryTimeoutRef.current = window.setTimeout(
      () => {
        setResolvedPreviewAssetEntriesByMessageId(previousEntries => {
          const now = Date.now();
          return pruneExpiredPreviewAssetEntries(previousEntries, now);
        });

        scheduleVisibleImageAssetPrefetch();
      },
      Math.max(nextExpiryAt - Date.now(), 0) + 1
    );

    return () => {
      if (previewAssetExpiryTimeoutRef.current !== null) {
        window.clearTimeout(previewAssetExpiryTimeoutRef.current);
        previewAssetExpiryTimeoutRef.current = null;
      }
    };
  }, [
    resolvedPreviewAssetEntriesByMessageId,
    scheduleVisibleImageAssetPrefetch,
  ]);

  useEffect(() => {
    scheduleVisibleImageAssetPrefetch();
  }, [messages, currentChannelId, scheduleVisibleImageAssetPrefetch]);

  useEffect(() => {
    const containerElement = messagesContainerRef.current;
    if (!containerElement) {
      return;
    }

    containerElement.addEventListener(
      'scroll',
      scheduleVisibleImageAssetPrefetch
    );
    window.addEventListener('resize', scheduleVisibleImageAssetPrefetch);

    return () => {
      containerElement.removeEventListener(
        'scroll',
        scheduleVisibleImageAssetPrefetch
      );
      window.removeEventListener('resize', scheduleVisibleImageAssetPrefetch);
    };
  }, [messagesContainerRef, scheduleVisibleImageAssetPrefetch]);

  useEffect(() => {
    return () => {
      if (previewPrefetchTimeoutRef.current !== null) {
        window.clearTimeout(previewPrefetchTimeoutRef.current);
        previewPrefetchTimeoutRef.current = null;
      }
      if (fullPrefetchTimeoutRef.current !== null) {
        window.clearTimeout(fullPrefetchTimeoutRef.current);
        fullPrefetchTimeoutRef.current = null;
      }
      if (previewAssetExpiryTimeoutRef.current !== null) {
        window.clearTimeout(previewAssetExpiryTimeoutRef.current);
        previewAssetExpiryTimeoutRef.current = null;
      }
    };
  }, []);

  const getImageMessageUrl = useCallback(
    (
      message: Pick<
        ChatMessage,
        | 'id'
        | 'message'
        | 'message_type'
        | 'file_name'
        | 'file_mime_type'
        | 'file_preview_url'
      >
    ) => {
      return resolveImageMessageUrl({
        currentChannelId,
        message,
        resolvedFullAssetUrlsByMessageId,
        resolvedPreviewAssetEntriesByMessageId,
      });
    },
    [
      currentChannelId,
      resolvedFullAssetUrlsByMessageId,
      resolvedPreviewAssetEntriesByMessageId,
    ]
  );

  return {
    getImageMessageUrl,
    scheduleVisibleImageAssetPrefetch,
  };
};
