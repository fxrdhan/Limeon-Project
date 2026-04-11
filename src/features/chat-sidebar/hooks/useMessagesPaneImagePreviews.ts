import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { chatRuntime } from '../utils/chatRuntime';
import {
  getChatImagePreviewName,
  resolveImagePreviewResource as resolveChatImagePreviewResource,
  resolveInitialImagePreviewUrl,
  resolveInitialImageThumbnailUrl,
  type PreviewableImageGroupMessage,
  type PreviewableMessage,
} from '../utils/message-preview-assets';

type ImagePreviewState = {
  backdropUrl: string | null;
  fullUrl: string | null;
  previewName: string;
};

type ImageGroupPreviewItem = {
  id: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  fullPreviewUrl: string | null;
  previewName: string;
};

type ImagePreviewIntrinsicDimensions = {
  width: number;
  height: number;
};

const IMAGE_GROUP_THUMBNAIL_PREFETCH_CONCURRENCY = 4;

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

const buildImageGroupPreviewLoadKey = (
  messageId: string,
  variant: 'thumbnail' | 'full'
) => `${messageId}::${variant}`;

export const useMessagesPaneImagePreviews = ({
  currentChannelId,
}: {
  currentChannelId: string | null;
}) => {
  const [imagePreviewState, setImagePreviewState] = useState<ImagePreviewState>(
    {
      backdropUrl: null,
      fullUrl: null,
      previewName: '',
    }
  );
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const [imageGroupPreviewItems, setImageGroupPreviewItems] = useState<
    ImageGroupPreviewItem[]
  >([]);
  const [activeImageGroupPreviewId, setActiveImageGroupPreviewId] = useState<
    string | null
  >(null);
  const [isImageGroupPreviewVisible, setIsImageGroupPreviewVisible] =
    useState(false);
  const imagePreviewCloseTimerRef = useRef<number | null>(null);
  const imageGroupPreviewCloseTimerRef = useRef<number | null>(null);
  const imagePreviewObjectUrlRef = useRef<string | null>(null);
  const imageGroupPreviewObjectUrlsRef = useRef<string[]>([]);
  const imageGroupPreviewMessagesRef = useRef<
    Map<string, { index: number; message: PreviewableImageGroupMessage }>
  >(new Map());
  const imageGroupPreviewInflightIdsRef = useRef<Set<string>>(new Set());
  const imageGroupPreviewResolvedIdsRef = useRef<Set<string>>(new Set());
  const activeImagePreviewRequestIdRef = useRef(0);
  const activeImageGroupPreviewRequestIdRef = useRef(0);

  const releaseImagePreviewObjectUrl = useCallback(() => {
    if (!imagePreviewObjectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(imagePreviewObjectUrlRef.current);
    imagePreviewObjectUrlRef.current = null;
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

  const clearImagePreviewStateImmediately = useCallback(() => {
    activeImagePreviewRequestIdRef.current += 1;
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    setIsImagePreviewVisible(false);
    setIsImagePreviewOpen(false);
    setImagePreviewState({
      backdropUrl: null,
      fullUrl: null,
      previewName: '',
    });
    releaseImagePreviewObjectUrl();
  }, [releaseImagePreviewObjectUrl]);

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

  const resolveImagePreviewResource = useCallback(
    async (message: PreviewableMessage) =>
      await resolveChatImagePreviewResource({
        currentChannelId,
        message,
      }),
    [currentChannelId]
  );

  const closeImagePreview = useCallback(() => {
    activeImagePreviewRequestIdRef.current += 1;
    setIsImagePreviewVisible(false);
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    imagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setIsImagePreviewOpen(false);
      setImagePreviewState({
        backdropUrl: null,
        fullUrl: null,
        previewName: '',
      });
      releaseImagePreviewObjectUrl();
      imagePreviewCloseTimerRef.current = null;
    }, 150);
  }, [releaseImagePreviewObjectUrl]);

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

  const openImageInPortal = useCallback(
    async (
      message: PreviewableMessage,
      previewName: string,
      initialPreviewUrl?: string | null
    ) => {
      clearImageGroupPreviewStateImmediately();

      const requestId = activeImagePreviewRequestIdRef.current + 1;
      activeImagePreviewRequestIdRef.current = requestId;

      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      releaseImagePreviewObjectUrl();
      const normalizedChannelId = currentChannelId?.trim() || null;
      const runtimeFullPreviewUrl = normalizedChannelId
        ? chatRuntime.imageAssets.getUrl(
            normalizedChannelId,
            message.id,
            'full'
          )
        : null;
      const seededPreviewUrl = resolveInitialImagePreviewUrl(
        message,
        currentChannelId,
        initialPreviewUrl
      );
      let resolvedPreviewBeforeOpen = seededPreviewUrl;
      let resolvedPreviewBeforeOpenRequiresCleanup = false;

      if (!resolvedPreviewBeforeOpen) {
        const { previewUrl, revokeOnClose } =
          await resolveImagePreviewResource(message);

        if (!previewUrl) {
          toast.error('Preview gambar tidak tersedia', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return;
        }

        resolvedPreviewBeforeOpen = previewUrl;
        resolvedPreviewBeforeOpenRequiresCleanup = revokeOnClose;
      }

      setIsImagePreviewOpen(true);
      setImagePreviewState({
        backdropUrl: resolvedPreviewBeforeOpen,
        fullUrl: runtimeFullPreviewUrl || resolvedPreviewBeforeOpen,
        previewName,
      });
      imagePreviewObjectUrlRef.current =
        resolvedPreviewBeforeOpenRequiresCleanup
          ? resolvedPreviewBeforeOpen
          : null;
      requestAnimationFrame(() => {
        if (activeImagePreviewRequestIdRef.current === requestId) {
          setIsImagePreviewVisible(true);
        }
      });

      if (
        runtimeFullPreviewUrl ||
        resolvedPreviewBeforeOpen === seededPreviewUrl
      ) {
        return;
      }

      const nextPreviewUrl = resolvedPreviewBeforeOpen;
      const revokeOnClose = resolvedPreviewBeforeOpenRequiresCleanup;

      if (!nextPreviewUrl) {
        clearImagePreviewStateImmediately();
        toast.error('Preview gambar tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      if (activeImagePreviewRequestIdRef.current !== requestId) {
        if (revokeOnClose) {
          URL.revokeObjectURL(nextPreviewUrl);
        }
        return;
      }

      setImagePreviewState(previousState => ({
        backdropUrl: previousState.backdropUrl || nextPreviewUrl,
        fullUrl: nextPreviewUrl,
        previewName,
      }));
    },
    [
      clearImagePreviewStateImmediately,
      clearImageGroupPreviewStateImmediately,
      currentChannelId,
      releaseImagePreviewObjectUrl,
      resolveImagePreviewResource,
    ]
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

      clearImagePreviewStateImmediately();

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
      const nextActivePreviewId =
        initialMessageId &&
        messages.some(message => message.id === initialMessageId)
          ? initialMessageId
          : messages[0]?.id || null;
      const activePreviewMessage =
        (nextActivePreviewId
          ? messages.find(message => message.id === nextActivePreviewId)
          : null) || null;
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
      const nextPreviewItems = messages.map((message, index) => {
        const preferredPreviewUrl =
          message.id === nextActivePreviewId
            ? seededActivePreviewUrl ||
              initialPreviewUrl ||
              message.previewUrl ||
              null
            : message.previewUrl || null;
        const normalizedChannelId = currentChannelId?.trim() || null;
        const runtimeFullPreviewUrl = normalizedChannelId
          ? chatRuntime.imageAssets.getUrl(
              normalizedChannelId,
              message.id,
              'full'
            )
          : null;

        return {
          id: message.id,
          thumbnailUrl: resolveInitialImageThumbnailUrl(
            message,
            currentChannelId
          ),
          previewUrl: resolveInitialImagePreviewUrl(
            message,
            currentChannelId,
            preferredPreviewUrl
          ),
          fullPreviewUrl:
            runtimeFullPreviewUrl ||
            (message.id === nextActivePreviewId
              ? seededActivePreviewUrl || null
              : null),
          previewName: getChatImagePreviewName(message, index),
        };
      });
      setImageGroupPreviewItems(nextPreviewItems);
      setActiveImageGroupPreviewId(nextActivePreviewId);
      requestAnimationFrame(() => {
        if (activeImageGroupPreviewRequestIdRef.current === requestId) {
          setIsImageGroupPreviewVisible(true);
        }
      });
      void (async () => {
        const prioritizedMessageIds = [
          ...(nextActivePreviewId ? [nextActivePreviewId] : []),
          ...messages
            .map(message => message.id)
            .filter(messageId => messageId !== nextActivePreviewId),
        ];

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
      clearImagePreviewStateImmediately,
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
      activeImagePreviewRequestIdRef.current += 1;
      activeImageGroupPreviewRequestIdRef.current += 1;
      imageGroupPreviewMessages.clear();
      imageGroupPreviewInflightIds.clear();
      imageGroupPreviewResolvedIds.clear();
      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      if (imageGroupPreviewCloseTimerRef.current) {
        window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
        imageGroupPreviewCloseTimerRef.current = null;
      }
      releaseImagePreviewObjectUrl();
      releaseImageGroupPreviewObjectUrls();
    };
  }, [releaseImageGroupPreviewObjectUrls, releaseImagePreviewObjectUrl]);

  const selectImageGroupPreviewItem = useCallback(
    (messageId: string) => {
      const previewMessage =
        imageGroupPreviewMessagesRef.current.get(messageId)?.message;
      if (!previewMessage) {
        return;
      }

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
          targetPreviewItem?.thumbnailUrl ||
          previewMessage.previewUrl ||
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
    isImagePreviewOpen,
    imagePreviewUrl: imagePreviewState.fullUrl,
    imagePreviewBackdropUrl: imagePreviewState.backdropUrl,
    imagePreviewName: imagePreviewState.previewName,
    isImagePreviewVisible,
    closeImagePreview,
    imageGroupPreviewItems,
    activeImageGroupPreviewId,
    isImageGroupPreviewVisible,
    closeImageGroupPreview,
    selectImageGroupPreviewItem,
    openImageInPortal,
    openImageGroupInPortal,
    clearImagePreviewStateImmediately,
    clearImageGroupPreviewStateImmediately,
  };
};
