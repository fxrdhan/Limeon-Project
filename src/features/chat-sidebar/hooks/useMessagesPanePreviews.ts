import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDocumentPreviewPortal } from './useDocumentPreviewPortal';
import {
  fetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback,
  getCachedResolvedChatAssetUrl,
  isDirectChatAssetUrl,
  resolveChatAssetUrl,
} from '../utils/message-file';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  ensureChannelImageAssetUrl,
  getRuntimeChannelImageAssetUrl,
} from '../utils/channel-image-asset-cache';

type PreviewableMessage = Pick<
  ChatMessage,
  'id' | 'message' | 'file_storage_path' | 'file_mime_type' | 'file_preview_url'
>;

type PreviewableImageGroupMessage = Pick<
  ChatMessage,
  | 'id'
  | 'message'
  | 'file_storage_path'
  | 'file_mime_type'
  | 'file_name'
  | 'file_preview_url'
> & {
  previewUrl?: string | null;
};

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

const getImagePreviewName = (
  message: PreviewableImageGroupMessage,
  fallbackIndex: number
) => {
  const explicitName = message.file_name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const pathName = message.message.split('/').pop()?.split('?')[0]?.trim();
  if (pathName) {
    return pathName;
  }

  return `Gambar ${fallbackIndex + 1}`;
};

const resolveInitialImagePreviewUrl = (
  message: PreviewableMessage,
  currentChannelId: string | null,
  preferredPreviewUrl?: string | null,
  _preferredPreviewIntrinsicDimensions?: ImagePreviewIntrinsicDimensions | null
) => {
  const normalizedPreferredPreviewUrl = preferredPreviewUrl?.trim() || null;
  if (
    normalizedPreferredPreviewUrl &&
    (normalizedPreferredPreviewUrl.startsWith('blob:') ||
      normalizedPreferredPreviewUrl === message.message.trim())
  ) {
    return normalizedPreferredPreviewUrl;
  }

  const normalizedChannelId = currentChannelId?.trim() || null;
  if (normalizedChannelId) {
    const runtimeFullUrl = getRuntimeChannelImageAssetUrl(
      normalizedChannelId,
      message.id,
      'full'
    );
    if (runtimeFullUrl) {
      return runtimeFullUrl;
    }
  }

  const persistedPreviewUrl = message.file_preview_url?.trim() || null;
  const cachedResolvedPreviewUrl = persistedPreviewUrl
    ? getCachedResolvedChatAssetUrl(persistedPreviewUrl, persistedPreviewUrl)
    : null;
  if (cachedResolvedPreviewUrl) {
    return cachedResolvedPreviewUrl;
  }

  if (isDirectChatAssetUrl(message.message)) {
    return message.message;
  }

  return null;
};

const resolveInitialImageGroupThumbnailUrl = (
  message: PreviewableMessage,
  currentChannelId: string | null,
  preferredPreviewUrl?: string | null
) =>
  resolveInitialImagePreviewUrl(message, currentChannelId, preferredPreviewUrl);

export const useMessagesPanePreviews = ({
  currentChannelId,
}: {
  currentChannelId: string | null;
}) => {
  const {
    previewUrl: documentPreviewUrl,
    previewName: documentPreviewName,
    isPreviewVisible: isDocumentPreviewVisible,
    closeDocumentPreview,
    openDocumentPreview,
  } = useDocumentPreviewPortal();
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
    async (message: PreviewableMessage) => {
      const normalizedChannelId = currentChannelId?.trim() || null;
      if (normalizedChannelId) {
        const cachedFullUrl = getRuntimeChannelImageAssetUrl(
          normalizedChannelId,
          message.id,
          'full'
        );
        if (cachedFullUrl) {
          return {
            previewUrl: cachedFullUrl,
            revokeOnClose: false,
          };
        }

        return {
          previewUrl: await ensureChannelImageAssetUrl(
            normalizedChannelId,
            {
              ...message,
              message_type: 'image',
            },
            'full'
          ),
          revokeOnClose: false,
        };
      }

      let nextPreviewUrl: string | null = null;
      let revokeOnClose = false;

      try {
        const signedUrl = await resolveChatAssetUrl(
          message.message,
          message.file_storage_path
        );
        if (signedUrl) {
          nextPreviewUrl = signedUrl;
        } else {
          const imageBlob = await fetchChatFileBlobWithFallback(
            message.message,
            message.file_storage_path,
            message.file_mime_type
          );

          if (imageBlob) {
            nextPreviewUrl = URL.createObjectURL(imageBlob);
            revokeOnClose = true;
          }
        }
      } catch {
        nextPreviewUrl = null;
        revokeOnClose = false;
      }

      if (!nextPreviewUrl && isDirectChatAssetUrl(message.message)) {
        nextPreviewUrl = message.message;
      }

      return {
        previewUrl: nextPreviewUrl,
        revokeOnClose,
      };
    },
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

      if (
        imageGroupPreviewInflightIdsRef.current.has(normalizedMessageId) ||
        imageGroupPreviewResolvedIdsRef.current.has(normalizedMessageId)
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
        ? getRuntimeChannelImageAssetUrl(
            normalizedChannelId,
            normalizedMessageId,
            'full'
          )
        : null;
      if (runtimeFullPreviewUrl) {
        imageGroupPreviewResolvedIdsRef.current.add(normalizedMessageId);
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === normalizedMessageId
              ? {
                  ...previousItem,
                  thumbnailUrl: runtimeFullPreviewUrl,
                  previewUrl: runtimeFullPreviewUrl,
                  fullPreviewUrl:
                    previousItem.fullPreviewUrl || runtimeFullPreviewUrl,
                }
              : previousItem
          )
        );
        return;
      }

      imageGroupPreviewInflightIdsRef.current.add(normalizedMessageId);

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

        imageGroupPreviewResolvedIdsRef.current.add(normalizedMessageId);
        const previewName = getImagePreviewName(
          imageGroupEntry.message,
          imageGroupEntry.index
        );
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === normalizedMessageId
              ? {
                  ...previousItem,
                  thumbnailUrl: previewUrl,
                  previewUrl,
                  fullPreviewUrl: previewUrl,
                  previewName,
                }
              : previousItem
          )
        );
      } finally {
        imageGroupPreviewInflightIdsRef.current.delete(normalizedMessageId);
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
        ? getRuntimeChannelImageAssetUrl(
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
      releaseImagePreviewObjectUrl,
      resolveImagePreviewResource,
      currentChannelId,
    ]
  );

  const openImageGroupInPortal = useCallback(
    async (
      messages: PreviewableImageGroupMessage[],
      initialMessageId?: string | null,
      initialPreviewUrl?: string | null,
      initialPreviewIntrinsicDimensions?: ImagePreviewIntrinsicDimensions | null
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
          initialPreviewUrl || activePreviewMessage.previewUrl || null,
          initialPreviewIntrinsicDimensions
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
          ? getRuntimeChannelImageAssetUrl(
              normalizedChannelId,
              message.id,
              'full'
            )
          : null;

        return {
          id: message.id,
          thumbnailUrl: resolveInitialImageGroupThumbnailUrl(
            message,
            currentChannelId,
            preferredPreviewUrl
          ),
          previewUrl: resolveInitialImagePreviewUrl(
            message,
            currentChannelId,
            preferredPreviewUrl,
            message.id === nextActivePreviewId
              ? initialPreviewIntrinsicDimensions
              : null
          ),
          fullPreviewUrl:
            runtimeFullPreviewUrl ||
            (message.id === nextActivePreviewId
              ? seededActivePreviewUrl || null
              : null),
          previewName: getImagePreviewName(message, index),
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

        for (const messageId of prioritizedMessageIds) {
          if (activeImageGroupPreviewRequestIdRef.current !== requestId) {
            return;
          }

          await resolveImageGroupPreviewItem(messageId, requestId);
        }
      })().catch(() => {
        // Ignore background prefetch failures; the fallback preview or skeleton remains visible.
      });
    },
    [
      clearImagePreviewStateImmediately,
      releaseImageGroupPreviewObjectUrls,
      resolveImageGroupPreviewItem,
      resolveImagePreviewResource,
      currentChannelId,
    ]
  );

  const openDocumentInPortal = useCallback(
    async (
      message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
      previewName: string,
      forcePdfMime = false
    ) => {
      clearImagePreviewStateImmediately();
      clearImageGroupPreviewStateImmediately();

      try {
        await openDocumentPreview({
          previewName,
          resolvePreviewUrl: async () => {
            if (!forcePdfMime && isDirectChatAssetUrl(message.message)) {
              return {
                previewUrl: message.message,
                revokeOnClose: false,
              };
            }

            const resolvedAssetUrl = await resolveChatAssetUrl(
              message.message,
              message.file_storage_path
            );
            if (resolvedAssetUrl) {
              return {
                previewUrl: resolvedAssetUrl,
                revokeOnClose: false,
              };
            }

            if (!forcePdfMime) {
              try {
                const fileBlob = await fetchChatFileBlobWithFallback(
                  message.message,
                  message.file_storage_path
                );
                if (fileBlob) {
                  return {
                    previewUrl: URL.createObjectURL(fileBlob),
                    revokeOnClose: true,
                  };
                }
              } catch {
                // Fall back to PDF/blob checks below.
              }
            }

            try {
              const pdfBlob = await fetchPdfBlobWithFallback(
                message.message,
                message.file_storage_path
              );
              if (pdfBlob) {
                return {
                  previewUrl: URL.createObjectURL(pdfBlob),
                  revokeOnClose: true,
                };
              }
            } catch {
              // Fall back to a direct URL only when the payload is already usable.
            }

            if (isDirectChatAssetUrl(message.message)) {
              return {
                previewUrl: message.message,
                revokeOnClose: false,
              };
            }

            throw new Error('Document preview is unavailable');
          },
        });
      } catch {
        toast.error('Preview dokumen tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      }
    },
    [
      clearImageGroupPreviewStateImmediately,
      clearImagePreviewStateImmediately,
      openDocumentPreview,
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
        ? getRuntimeChannelImageAssetUrl(normalizedChannelId, messageId, 'full')
        : null;

      const applyResolvedPreviewUrl = (resolvedPreviewUrl: string) => {
        setActiveImageGroupPreviewId(messageId);
        setImageGroupPreviewItems(previousItems =>
          previousItems.map(previousItem =>
            previousItem.id === messageId
              ? {
                  ...previousItem,
                  thumbnailUrl: resolvedPreviewUrl,
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
    documentPreviewUrl,
    documentPreviewName,
    isDocumentPreviewVisible,
    closeDocumentPreview,
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
    openDocumentInPortal,
  };
};
