import { useCallback, useEffect, useRef, useState } from 'react';
import { chatRuntime } from '../../utils/chatRuntime';
import {
  getChatImagePreviewName,
  resolveInitialImagePreviewUrl,
  type PreviewableImageGroupMessage,
} from '../../utils/message-preview-assets';
import { runTasksWithConcurrency } from './concurrency';
import {
  IMAGE_GROUP_THUMBNAIL_PREFETCH_CONCURRENCY,
  buildImageGroupPreviewLoadKey,
} from './imageGroupPreviewKeys';
import {
  buildInitialImageGroupPreviewItems,
  getInitialImageGroupPreviewId,
  getInitialImageGroupPreviewMessage,
  getPrioritizedImageGroupPreviewMessageIds,
} from './imageGroupPreviewItems';
import type {
  ImageGroupPreviewItem,
  ImagePreviewIntrinsicDimensions,
  ResolveImagePreviewResource,
} from './types';

export const useImageGroupPreview = ({
  currentChannelId,
  resolveImagePreviewResource,
}: {
  currentChannelId: string | null;
  resolveImagePreviewResource: ResolveImagePreviewResource;
}) => {
  const [imageGroupPreviewItems, setImageGroupPreviewItems] = useState<
    ImageGroupPreviewItem[]
  >([]);
  const [activeImageGroupPreviewId, setActiveImageGroupPreviewId] = useState<
    string | null
  >(null);
  const [isImageGroupPreviewVisible, setIsImageGroupPreviewVisible] =
    useState(false);
  const imageGroupPreviewCloseTimerRef = useRef<number | null>(null);
  const imageGroupPreviewObjectUrlsRef = useRef<string[]>([]);
  const imageGroupPreviewMessagesRef = useRef<
    Map<string, { index: number; message: PreviewableImageGroupMessage }>
  >(new Map());
  const imageGroupPreviewInflightIdsRef = useRef<Set<string>>(new Set());
  const imageGroupPreviewResolvedIdsRef = useRef<Set<string>>(new Set());
  const activeImageGroupPreviewRequestIdRef = useRef(0);

  const releaseImageGroupPreviewObjectUrls = useCallback(() => {
    if (imageGroupPreviewObjectUrlsRef.current.length === 0) {
      return;
    }

    imageGroupPreviewObjectUrlsRef.current.forEach(objectUrl => {
      URL.revokeObjectURL(objectUrl);
    });
    imageGroupPreviewObjectUrlsRef.current = [];
  }, []);

  const clearImageGroupPreviewStateImmediately = useCallback(() => {
    activeImageGroupPreviewRequestIdRef.current += 1;
    if (imageGroupPreviewCloseTimerRef.current) {
      window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
      imageGroupPreviewCloseTimerRef.current = null;
    }
    setIsImageGroupPreviewVisible(false);
    setImageGroupPreviewItems([]);
    setActiveImageGroupPreviewId(null);
    imageGroupPreviewMessagesRef.current.clear();
    imageGroupPreviewInflightIdsRef.current.clear();
    imageGroupPreviewResolvedIdsRef.current.clear();
    releaseImageGroupPreviewObjectUrls();
  }, [releaseImageGroupPreviewObjectUrls]);

  const closeImageGroupPreview = useCallback(() => {
    activeImageGroupPreviewRequestIdRef.current += 1;
    setIsImageGroupPreviewVisible(false);
    if (imageGroupPreviewCloseTimerRef.current) {
      window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
      imageGroupPreviewCloseTimerRef.current = null;
    }
    imageGroupPreviewCloseTimerRef.current = window.setTimeout(() => {
      setImageGroupPreviewItems([]);
      setActiveImageGroupPreviewId(null);
      imageGroupPreviewMessagesRef.current.clear();
      imageGroupPreviewInflightIdsRef.current.clear();
      imageGroupPreviewResolvedIdsRef.current.clear();
      releaseImageGroupPreviewObjectUrls();
      imageGroupPreviewCloseTimerRef.current = null;
    }, 150);
  }, [releaseImageGroupPreviewObjectUrls]);

  const resolveImageGroupThumbnailItem = useCallback(
    async (
      messageId: string,
      requestId = activeImageGroupPreviewRequestIdRef.current
    ) => {
      const normalizedMessageId = messageId.trim();
      if (!normalizedMessageId) {
        return;
      }

      if (activeImageGroupPreviewRequestIdRef.current !== requestId) {
        return;
      }

      const loadKey = buildImageGroupPreviewLoadKey(
        normalizedMessageId,
        'thumbnail'
      );
      if (
        imageGroupPreviewInflightIdsRef.current.has(loadKey) ||
        imageGroupPreviewResolvedIdsRef.current.has(loadKey)
      ) {
        return;
      }

      const imageGroupEntry =
        imageGroupPreviewMessagesRef.current.get(normalizedMessageId);
      if (!imageGroupEntry) {
        return;
      }

      const normalizedChannelId = currentChannelId?.trim() || null;
      const runtimeThumbnailUrl = normalizedChannelId
        ? chatRuntime.imageAssets.getUrl(
            normalizedChannelId,
            normalizedMessageId,
            'thumbnail'
          )
        : null;
      if (runtimeThumbnailUrl) {
        imageGroupPreviewResolvedIdsRef.current.add(loadKey);
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === normalizedMessageId
              ? {
                  ...previousItem,
                  thumbnailUrl: runtimeThumbnailUrl,
                }
              : previousItem
          )
        );
        return;
      }

      if (!normalizedChannelId) {
        return;
      }

      imageGroupPreviewInflightIdsRef.current.add(loadKey);

      try {
        const thumbnailUrl = await chatRuntime.imageAssets.ensureUrl(
          normalizedChannelId,
          {
            ...imageGroupEntry.message,
            message_type: 'image',
          },
          'thumbnail'
        );

        if (
          !thumbnailUrl ||
          activeImageGroupPreviewRequestIdRef.current !== requestId
        ) {
          return;
        }

        imageGroupPreviewResolvedIdsRef.current.add(loadKey);
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === normalizedMessageId
              ? {
                  ...previousItem,
                  thumbnailUrl,
                }
              : previousItem
          )
        );
      } finally {
        imageGroupPreviewInflightIdsRef.current.delete(loadKey);
      }
    },
    [currentChannelId]
  );

  const resolveImageGroupPreviewItem = useCallback(
    async (
      messageId: string,
      requestId = activeImageGroupPreviewRequestIdRef.current
    ) => {
      const normalizedMessageId = messageId.trim();
      if (!normalizedMessageId) {
        return;
      }

      if (activeImageGroupPreviewRequestIdRef.current !== requestId) {
        return;
      }

      const loadKey = buildImageGroupPreviewLoadKey(
        normalizedMessageId,
        'full'
      );
      if (
        imageGroupPreviewInflightIdsRef.current.has(loadKey) ||
        imageGroupPreviewResolvedIdsRef.current.has(loadKey)
      ) {
        return;
      }

      const imageGroupEntry =
        imageGroupPreviewMessagesRef.current.get(normalizedMessageId);
      if (!imageGroupEntry) {
        return;
      }

      const normalizedChannelId = currentChannelId?.trim() || null;
      const runtimeFullPreviewUrl = normalizedChannelId
        ? chatRuntime.imageAssets.getUrl(
            normalizedChannelId,
            normalizedMessageId,
            'full'
          )
        : null;
      if (runtimeFullPreviewUrl) {
        imageGroupPreviewResolvedIdsRef.current.add(loadKey);
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === normalizedMessageId
              ? {
                  ...previousItem,
                  thumbnailUrl:
                    previousItem.thumbnailUrl || runtimeFullPreviewUrl,
                  previewUrl: runtimeFullPreviewUrl,
                  fullPreviewUrl:
                    previousItem.fullPreviewUrl || runtimeFullPreviewUrl,
                }
              : previousItem
          )
        );
        return;
      }

      imageGroupPreviewInflightIdsRef.current.add(loadKey);

      try {
        const { previewUrl, revokeOnClose } = await resolveImagePreviewResource(
          imageGroupEntry.message
        );

        if (!previewUrl) {
          return;
        }

        if (activeImageGroupPreviewRequestIdRef.current !== requestId) {
          if (revokeOnClose) {
            URL.revokeObjectURL(previewUrl);
          }
          return;
        }

        if (revokeOnClose) {
          imageGroupPreviewObjectUrlsRef.current.push(previewUrl);
        }

        imageGroupPreviewResolvedIdsRef.current.add(loadKey);
        const previewName = getChatImagePreviewName(
          imageGroupEntry.message,
          imageGroupEntry.index
        );
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === normalizedMessageId
              ? {
                  ...previousItem,
                  thumbnailUrl: previousItem.thumbnailUrl || previewUrl,
                  previewUrl,
                  fullPreviewUrl: previewUrl,
                  previewName,
                }
              : previousItem
          )
        );
      } finally {
        imageGroupPreviewInflightIdsRef.current.delete(loadKey);
      }
    },
    [currentChannelId, resolveImagePreviewResource]
  );

  const openImageGroupInPortal = useCallback(
    async (
      messages: PreviewableImageGroupMessage[],
      initialMessageId?: string | null,
      initialPreviewUrl?: string | null,
      _initialPreviewIntrinsicDimensions?: ImagePreviewIntrinsicDimensions | null
    ) => {
      if (messages.length === 0) {
        return;
      }

      const requestId = activeImageGroupPreviewRequestIdRef.current + 1;
      activeImageGroupPreviewRequestIdRef.current = requestId;

      if (imageGroupPreviewCloseTimerRef.current) {
        window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
        imageGroupPreviewCloseTimerRef.current = null;
      }
      releaseImageGroupPreviewObjectUrls();
      imageGroupPreviewInflightIdsRef.current.clear();
      imageGroupPreviewResolvedIdsRef.current.clear();
      imageGroupPreviewMessagesRef.current = new Map(
        messages.map((message, index) => [message.id, { message, index }])
      );
      const nextActivePreviewId = getInitialImageGroupPreviewId(
        messages,
        initialMessageId
      );
      const activePreviewMessage = getInitialImageGroupPreviewMessage(
        messages,
        nextActivePreviewId
      );
      let seededActivePreviewUrl =
        activePreviewMessage &&
        resolveInitialImagePreviewUrl(
          activePreviewMessage,
          currentChannelId,
          initialPreviewUrl || activePreviewMessage.previewUrl || null
        );

      if (activePreviewMessage && !seededActivePreviewUrl) {
        const { previewUrl, revokeOnClose } =
          await resolveImagePreviewResource(activePreviewMessage);
        if (previewUrl) {
          seededActivePreviewUrl = previewUrl;
          if (revokeOnClose) {
            imageGroupPreviewObjectUrlsRef.current.push(previewUrl);
          }
        }
      }
      const nextPreviewItems = buildInitialImageGroupPreviewItems({
        activePreviewId: nextActivePreviewId,
        currentChannelId,
        initialPreviewUrl,
        messages,
        seededActivePreviewUrl: seededActivePreviewUrl || null,
      });
      setImageGroupPreviewItems(nextPreviewItems);
      setActiveImageGroupPreviewId(nextActivePreviewId);
      requestAnimationFrame(() => {
        if (activeImageGroupPreviewRequestIdRef.current === requestId) {
          setIsImageGroupPreviewVisible(true);
        }
      });
      void (async () => {
        const prioritizedMessageIds = getPrioritizedImageGroupPreviewMessageIds(
          messages,
          nextActivePreviewId
        );

        await runTasksWithConcurrency(
          prioritizedMessageIds,
          IMAGE_GROUP_THUMBNAIL_PREFETCH_CONCURRENCY,
          async messageId => {
            if (activeImageGroupPreviewRequestIdRef.current !== requestId) {
              return;
            }

            await resolveImageGroupThumbnailItem(messageId, requestId);
          }
        );

        if (
          nextActivePreviewId &&
          activeImageGroupPreviewRequestIdRef.current === requestId
        ) {
          await resolveImageGroupPreviewItem(nextActivePreviewId, requestId);
        }
      })().catch(() => {
        // Ignore background prefetch failures; the fallback preview or skeleton remains visible.
      });
    },
    [
      currentChannelId,
      releaseImageGroupPreviewObjectUrls,
      resolveImageGroupThumbnailItem,
      resolveImageGroupPreviewItem,
      resolveImagePreviewResource,
    ]
  );

  useEffect(() => {
    const imageGroupPreviewMessages = imageGroupPreviewMessagesRef.current;
    const imageGroupPreviewInflightIds =
      imageGroupPreviewInflightIdsRef.current;
    const imageGroupPreviewResolvedIds =
      imageGroupPreviewResolvedIdsRef.current;

    return () => {
      activeImageGroupPreviewRequestIdRef.current += 1;
      imageGroupPreviewMessages.clear();
      imageGroupPreviewInflightIds.clear();
      imageGroupPreviewResolvedIds.clear();
      if (imageGroupPreviewCloseTimerRef.current) {
        window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
        imageGroupPreviewCloseTimerRef.current = null;
      }
      releaseImageGroupPreviewObjectUrls();
    };
  }, [releaseImageGroupPreviewObjectUrls]);

  const selectImageGroupPreviewItem = useCallback(
    (messageId: string) => {
      const previewMessage =
        imageGroupPreviewMessagesRef.current.get(messageId)?.message;
      if (!previewMessage) {
        return;
      }

      setActiveImageGroupPreviewId(messageId);

      const normalizedChannelId = currentChannelId?.trim() || null;
      const runtimeFullPreviewUrl = normalizedChannelId
        ? chatRuntime.imageAssets.getUrl(normalizedChannelId, messageId, 'full')
        : null;

      const applyResolvedPreviewUrl = (resolvedPreviewUrl: string) => {
        setActiveImageGroupPreviewId(messageId);
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === messageId
              ? {
                  ...previousItem,
                  thumbnailUrl: previousItem.thumbnailUrl || resolvedPreviewUrl,
                  previewUrl: resolvedPreviewUrl,
                  fullPreviewUrl: resolvedPreviewUrl,
                }
              : previousItem
          )
        );
      };

      if (runtimeFullPreviewUrl) {
        applyResolvedPreviewUrl(runtimeFullPreviewUrl);
        return;
      }

      const targetPreviewItem =
        imageGroupPreviewItems.find(
          previousItem => previousItem.id === messageId
        ) ?? null;
      const seededPreviewUrl = resolveInitialImagePreviewUrl(
        previewMessage,
        currentChannelId,
        targetPreviewItem?.fullPreviewUrl ||
          targetPreviewItem?.previewUrl ||
          null
      );

      if (seededPreviewUrl) {
        applyResolvedPreviewUrl(seededPreviewUrl);
        void resolveImageGroupPreviewItem(messageId);
        return;
      }

      void (async () => {
        const { previewUrl, revokeOnClose } =
          await resolveImagePreviewResource(previewMessage);
        if (!previewUrl) {
          return;
        }

        if (revokeOnClose) {
          imageGroupPreviewObjectUrlsRef.current.push(previewUrl);
        }

        applyResolvedPreviewUrl(previewUrl);
      })();
    },
    [
      currentChannelId,
      imageGroupPreviewItems,
      resolveImageGroupPreviewItem,
      resolveImagePreviewResource,
    ]
  );

  return {
    imageGroupPreviewItems,
    activeImageGroupPreviewId,
    isImageGroupPreviewVisible,
    closeImageGroupPreview,
    selectImageGroupPreviewItem,
    openImageGroupInPortal,
    clearImageGroupPreviewStateImmediately,
  };
};
