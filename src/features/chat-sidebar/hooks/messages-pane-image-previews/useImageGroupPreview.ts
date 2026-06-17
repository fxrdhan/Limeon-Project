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
  withImageGroupPreviewResolvedUrl,
  withImageGroupPreviewThumbnailUrl,
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
  const imageGroupPreviewOpenFrameRef = useRef<number | null>(null);
  const imageGroupPreviewObjectUrlsRef = useRef<string[]>([]);
  const imageGroupPreviewMessagesRef = useRef<
    Map<string, { index: number; message: PreviewableImageGroupMessage }>
  >(new Map());
  const imageGroupPreviewInflightIdsRef = useRef<Set<string>>(new Set());
  const imageGroupPreviewResolvedIdsRef = useRef<Set<string>>(new Set());
  const activeImageGroupPreviewRequestIdRef = useRef(0);
  const activeImageGroupPreviewIdRef = useRef<string | null>(null);

  const setActiveImageGroupPreview = useCallback((messageId: string | null) => {
    activeImageGroupPreviewIdRef.current = messageId;
    setActiveImageGroupPreviewId(messageId);
  }, []);

  const releaseImageGroupPreviewObjectUrls = useCallback(() => {
    if (imageGroupPreviewObjectUrlsRef.current.length === 0) {
      return;
    }

    imageGroupPreviewObjectUrlsRef.current.forEach(objectUrl => {
      URL.revokeObjectURL(objectUrl);
    });
    imageGroupPreviewObjectUrlsRef.current = [];
  }, []);

  const clearImageGroupPreviewOpenFrame = useCallback(() => {
    if (imageGroupPreviewOpenFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(imageGroupPreviewOpenFrameRef.current);
    imageGroupPreviewOpenFrameRef.current = null;
  }, []);

  const clearImageGroupPreviewStateImmediately = useCallback(() => {
    activeImageGroupPreviewRequestIdRef.current += 1;
    clearImageGroupPreviewOpenFrame();
    if (imageGroupPreviewCloseTimerRef.current) {
      window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
      imageGroupPreviewCloseTimerRef.current = null;
    }
    setIsImageGroupPreviewVisible(false);
    setImageGroupPreviewItems([]);
    setActiveImageGroupPreview(null);
    imageGroupPreviewMessagesRef.current.clear();
    imageGroupPreviewInflightIdsRef.current.clear();
    imageGroupPreviewResolvedIdsRef.current.clear();
    releaseImageGroupPreviewObjectUrls();
  }, [
    clearImageGroupPreviewOpenFrame,
    releaseImageGroupPreviewObjectUrls,
    setActiveImageGroupPreview,
  ]);

  const closeImageGroupPreview = useCallback(() => {
    activeImageGroupPreviewRequestIdRef.current += 1;
    clearImageGroupPreviewOpenFrame();
    setIsImageGroupPreviewVisible(false);
    if (imageGroupPreviewCloseTimerRef.current) {
      window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
      imageGroupPreviewCloseTimerRef.current = null;
    }
    imageGroupPreviewCloseTimerRef.current = window.setTimeout(() => {
      setImageGroupPreviewItems([]);
      setActiveImageGroupPreview(null);
      imageGroupPreviewMessagesRef.current.clear();
      imageGroupPreviewInflightIdsRef.current.clear();
      imageGroupPreviewResolvedIdsRef.current.clear();
      releaseImageGroupPreviewObjectUrls();
      imageGroupPreviewCloseTimerRef.current = null;
    }, 150);
  }, [
    clearImageGroupPreviewOpenFrame,
    releaseImageGroupPreviewObjectUrls,
    setActiveImageGroupPreview,
  ]);

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
          withImageGroupPreviewThumbnailUrl(
            previousItems,
            normalizedMessageId,
            runtimeThumbnailUrl
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
          withImageGroupPreviewThumbnailUrl(
            previousItems,
            normalizedMessageId,
            thumbnailUrl
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
          withImageGroupPreviewResolvedUrl(previousItems, {
            messageId: normalizedMessageId,
            previewUrl: runtimeFullPreviewUrl,
            preserveExistingFullPreviewUrl: true,
          })
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
          withImageGroupPreviewResolvedUrl(previousItems, {
            messageId: normalizedMessageId,
            previewUrl,
            previewName,
          })
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
      clearImageGroupPreviewOpenFrame();
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

        if (activeImageGroupPreviewRequestIdRef.current !== requestId) {
          if (previewUrl && revokeOnClose) {
            URL.revokeObjectURL(previewUrl);
          }
          return;
        }

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
      setActiveImageGroupPreview(nextActivePreviewId);
      imageGroupPreviewOpenFrameRef.current = window.requestAnimationFrame(
        () => {
          imageGroupPreviewOpenFrameRef.current = null;
          if (activeImageGroupPreviewRequestIdRef.current === requestId) {
            setIsImageGroupPreviewVisible(true);
          }
        }
      );
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
      clearImageGroupPreviewOpenFrame,
      currentChannelId,
      releaseImageGroupPreviewObjectUrls,
      resolveImageGroupThumbnailItem,
      resolveImageGroupPreviewItem,
      resolveImagePreviewResource,
      setActiveImageGroupPreview,
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
      clearImageGroupPreviewOpenFrame();
      imageGroupPreviewMessages.clear();
      imageGroupPreviewInflightIds.clear();
      imageGroupPreviewResolvedIds.clear();
      if (imageGroupPreviewCloseTimerRef.current) {
        window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
        imageGroupPreviewCloseTimerRef.current = null;
      }
      releaseImageGroupPreviewObjectUrls();
    };
  }, [clearImageGroupPreviewOpenFrame, releaseImageGroupPreviewObjectUrls]);

  const selectImageGroupPreviewItem = useCallback(
    (messageId: string) => {
      const previewMessage =
        imageGroupPreviewMessagesRef.current.get(messageId)?.message;
      if (!previewMessage) {
        return;
      }

      const requestId = activeImageGroupPreviewRequestIdRef.current;
      setActiveImageGroupPreview(messageId);

      const normalizedChannelId = currentChannelId?.trim() || null;
      const runtimeFullPreviewUrl = normalizedChannelId
        ? chatRuntime.imageAssets.getUrl(normalizedChannelId, messageId, 'full')
        : null;

      const applyResolvedPreviewUrl = (resolvedPreviewUrl: string) => {
        if (
          activeImageGroupPreviewRequestIdRef.current !== requestId ||
          activeImageGroupPreviewIdRef.current !== messageId
        ) {
          return false;
        }

        setActiveImageGroupPreview(messageId);
        setImageGroupPreviewItems(previousItems =>
          withImageGroupPreviewResolvedUrl(previousItems, {
            messageId,
            previewUrl: resolvedPreviewUrl,
          })
        );
        return true;
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

        if (
          activeImageGroupPreviewRequestIdRef.current !== requestId ||
          activeImageGroupPreviewIdRef.current !== messageId
        ) {
          if (revokeOnClose) {
            URL.revokeObjectURL(previewUrl);
          }
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
      setActiveImageGroupPreview,
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
