import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { MutableRefObject } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  activateChannelImageAssetScope,
  ensureChannelImageAssetUrl,
  getRuntimeChannelImageAssetUrl,
  isCacheableChannelImageMessage,
} from '../utils/channel-image-asset-cache';
import {
  isDirectChatAssetUrl,
  resolveChatAssetUrl,
} from '../utils/message-file';
import {
  getVerticalVisibilityBounds,
  type VisibleBounds,
} from '../utils/viewport-visibility';

const IMAGE_PREFETCH_DEBOUNCE_MS = 16;
const FULL_IMAGE_PREFETCH_DELAY_MS = 420;
const MIN_PARTIAL_VISIBLE_READ_HEIGHT_PX = 48;

const runTasksWithConcurrency = async <T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
) => {
  const boundedLimit = Math.max(1, limit);
  const taskQueue = [...items];

  await Promise.all(
    Array.from({
      length: Math.min(boundedLimit, taskQueue.length),
    }).map(async () => {
      while (taskQueue.length > 0) {
        const nextItem = taskQueue.shift();
        if (!nextItem) {
          return;
        }

        await task(nextItem);
      }
    })
  );
};

export const useMessageImagePreviews = ({
  messages,
  currentChannelId,
  messagesContainerRef,
  chatHeaderContainerRef,
  messageBubbleRefs,
  getVisibleMessagesBounds,
}: {
  messages: ChatMessage[];
  currentChannelId: string | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  getVisibleMessagesBounds: () => VisibleBounds | null;
}) => {
  const [
    resolvedPreviewAssetUrlsByMessageId,
    setResolvedPreviewAssetUrlsByMessageId,
  ] = useState<Record<string, string>>({});
  const [
    resolvedFullAssetUrlsByMessageId,
    setResolvedFullAssetUrlsByMessageId,
  ] = useState<Record<string, string>>({});
  const previewPrefetchTimeoutRef = useRef<number | null>(null);
  const fullPrefetchTimeoutRef = useRef<number | null>(null);

  const setResolvedPreviewAssetUrl = useCallback(
    (messageId: string, previewUrl: string | null) => {
      if (!previewUrl) {
        return;
      }

      setResolvedPreviewAssetUrlsByMessageId(previousUrls => {
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
    const normalizedChannelId = currentChannelId?.trim() || '';
    if (!normalizedChannelId) {
      return [];
    }

    const bounds = getVisibleMessagesBounds();
    if (!bounds) {
      return [];
    }

    const verticalVisibilityBounds = getVerticalVisibilityBounds(
      bounds,
      chatHeaderContainerRef.current?.getBoundingClientRect(),
      0
    );

    return messages.filter(messageItem => {
      if (
        messageItem.channel_id !== normalizedChannelId ||
        messageItem.id.startsWith('temp_') ||
        !isCacheableChannelImageMessage(messageItem)
      ) {
        return false;
      }

      const bubbleElement = messageBubbleRefs.current.get(messageItem.id);
      if (!bubbleElement) {
        return false;
      }

      const bubbleRect = bubbleElement.getBoundingClientRect();
      const visibleTop = Math.max(
        bubbleRect.top,
        verticalVisibilityBounds.minVisibleTop
      );
      const visibleBottom = Math.min(
        bubbleRect.bottom,
        verticalVisibilityBounds.maxVisibleBottom
      );
      const visibleHeight = visibleBottom - visibleTop;
      const isTopEdgeVisible =
        bubbleRect.top >= verticalVisibilityBounds.minVisibleTop &&
        bubbleRect.top < verticalVisibilityBounds.maxVisibleBottom;
      const isMeaningfullyVisibleBelowHeader =
        bubbleRect.top < verticalVisibilityBounds.minVisibleTop &&
        visibleHeight >= MIN_PARTIAL_VISIBLE_READ_HEIGHT_PX;

      return (
        visibleHeight > 0 &&
        (isTopEdgeVisible || isMeaningfullyVisibleBelowHeader)
      );
    });
  }, [
    chatHeaderContainerRef,
    currentChannelId,
    getVisibleMessagesBounds,
    messageBubbleRefs,
    messages,
  ]);

  const prefetchVisibleImageAssets = useCallback(
    async ({
      requireMissingPersistedPreview = false,
    }: {
      requireMissingPersistedPreview?: boolean;
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
          const previewUrl = await ensureChannelImageAssetUrl(
            normalizedChannelId,
            messageItem,
            'full'
          );
          setResolvedFullAssetUrl(messageItem.id, previewUrl);
        }
      );
    },
    [collectVisibleImageMessages, currentChannelId, setResolvedFullAssetUrl]
  );

  const resolveVisibleImagePreviewAssetUrls = useCallback(async () => {
    const visibleImageMessages = collectVisibleImageMessages().filter(
      messageItem => {
        const previewPath = messageItem.file_preview_url?.trim();
        return Boolean(
          previewPath &&
          !resolvedPreviewAssetUrlsByMessageId[messageItem.id] &&
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

        const resolvedPreviewUrl = await resolveChatAssetUrl(
          previewPath,
          previewPath
        );
        setResolvedPreviewAssetUrl(messageItem.id, resolvedPreviewUrl);
      }
    );
  }, [
    collectVisibleImageMessages,
    resolvedFullAssetUrlsByMessageId,
    resolvedPreviewAssetUrlsByMessageId,
    setResolvedPreviewAssetUrl,
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
        }),
      ]);
    }, IMAGE_PREFETCH_DEBOUNCE_MS);

    fullPrefetchTimeoutRef.current = window.setTimeout(() => {
      fullPrefetchTimeoutRef.current = null;
      void prefetchVisibleImageAssets();
    }, FULL_IMAGE_PREFETCH_DELAY_MS);
  }, [prefetchVisibleImageAssets, resolveVisibleImagePreviewAssetUrls]);

  useEffect(() => {
    void activateChannelImageAssetScope(currentChannelId);
    setResolvedPreviewAssetUrlsByMessageId({});
    setResolvedFullAssetUrlsByMessageId({});
  }, [currentChannelId]);

  useEffect(() => {
    const activeMessageIds = new Set(
      messages.map(messageItem => messageItem.id)
    );
    const pruneResolvedUrls = (
      previousUrls: Record<string, string>
    ): Record<string, string> => {
      let hasChanges = false;
      const nextUrls: Record<string, string> = {};

      Object.entries(previousUrls).forEach(([messageId, previewUrl]) => {
        if (!activeMessageIds.has(messageId)) {
          hasChanges = true;
          return;
        }

        nextUrls[messageId] = previewUrl;
      });

      return hasChanges ? nextUrls : previousUrls;
    };

    setResolvedPreviewAssetUrlsByMessageId(pruneResolvedUrls);
    setResolvedFullAssetUrlsByMessageId(pruneResolvedUrls);
  }, [messages]);

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
      if (!isCacheableChannelImageMessage(message)) {
        return null;
      }

      const normalizedChannelId = currentChannelId?.trim() || null;
      const runtimeFullUrl =
        normalizedChannelId &&
        getRuntimeChannelImageAssetUrl(normalizedChannelId, message.id, 'full');
      if (runtimeFullUrl) {
        return runtimeFullUrl;
      }

      const resolvedFullAssetUrl = resolvedFullAssetUrlsByMessageId[message.id];
      if (resolvedFullAssetUrl) {
        return resolvedFullAssetUrl;
      }

      const resolvedPreviewAssetUrl =
        resolvedPreviewAssetUrlsByMessageId[message.id];
      if (resolvedPreviewAssetUrl) {
        return resolvedPreviewAssetUrl;
      }

      const persistedPreviewUrl = message.file_preview_url?.trim() || null;
      if (persistedPreviewUrl && isDirectChatAssetUrl(persistedPreviewUrl)) {
        return persistedPreviewUrl;
      }

      if (
        message.id.startsWith('temp_') ||
        isDirectChatAssetUrl(message.message)
      ) {
        return message.message;
      }

      return null;
    },
    [
      currentChannelId,
      resolvedFullAssetUrlsByMessageId,
      resolvedPreviewAssetUrlsByMessageId,
    ]
  );

  return {
    getImageMessageUrl,
    scheduleVisibleImageAssetPrefetch,
  };
};
