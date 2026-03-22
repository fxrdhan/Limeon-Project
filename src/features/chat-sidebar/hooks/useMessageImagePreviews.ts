import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  fetchChatFileBlobWithFallback,
  isImageFileExtensionOrMime,
  isDirectChatAssetUrl,
  resolveFileExtension,
  resolveChatAssetUrlWithExpiry,
} from '../utils/message-file';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';

const IMAGE_URL_REFRESH_LEAD_MS = 60_000;
const IMAGE_PREVIEW_MAX_RETRY_ATTEMPTS = 3;
const IMAGE_PREVIEW_RETRY_BASE_DELAY_MS = 900;

interface ImageMessagePreviewEntry {
  url: string;
  expiresAt: number | null;
  isObjectUrl: boolean;
}

const isImagePreviewableMessage = (
  message: Pick<
    ChatMessage,
    'message_type' | 'message' | 'file_name' | 'file_mime_type'
  >
) => {
  if (message.message_type === 'image') {
    return true;
  }

  if (message.message_type !== 'file') {
    return false;
  }

  const fileExtension = resolveFileExtension(
    message.file_name ?? null,
    message.message,
    message.file_mime_type
  );

  return isImageFileExtensionOrMime(fileExtension, message.file_mime_type);
};

export const useMessageImagePreviews = ({
  messages,
}: {
  messages: ChatMessage[];
}) => {
  const [imageMessagePreviewEntries, setImageMessagePreviewEntries] = useState<
    Record<string, ImageMessagePreviewEntry>
  >({});
  const [imagePreviewRefreshTick, setImagePreviewRefreshTick] = useState(0);
  const [imagePreviewRetryNonce, setImagePreviewRetryNonce] = useState(0);
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const imageMessagePreviewEntriesRef = useRef<
    Record<string, ImageMessagePreviewEntry>
  >({});
  const imagePreviewRetryAttemptsRef = useRef<Map<string, number>>(new Map());
  const imagePreviewRetryTimersRef = useRef<Map<string, number>>(new Map());

  const releaseImagePreviewUrl = useCallback((messageId: string) => {
    const existingUrl = objectUrlsRef.current.get(messageId);
    if (!existingUrl) {
      return;
    }

    URL.revokeObjectURL(existingUrl);
    objectUrlsRef.current.delete(messageId);
  }, []);

  const clearImagePreviewRetryTimer = useCallback((messageId: string) => {
    const existingTimerId = imagePreviewRetryTimersRef.current.get(messageId);
    if (!existingTimerId) {
      return;
    }

    window.clearTimeout(existingTimerId);
    imagePreviewRetryTimersRef.current.delete(messageId);
  }, []);

  const scheduleImagePreviewRetry = useCallback((messageId: string) => {
    if (imagePreviewRetryTimersRef.current.has(messageId)) {
      return;
    }

    const nextAttemptCount =
      (imagePreviewRetryAttemptsRef.current.get(messageId) ?? 0) + 1;
    imagePreviewRetryAttemptsRef.current.set(messageId, nextAttemptCount);

    if (nextAttemptCount >= IMAGE_PREVIEW_MAX_RETRY_ATTEMPTS) {
      return;
    }

    const retryDelay = IMAGE_PREVIEW_RETRY_BASE_DELAY_MS * nextAttemptCount;
    const retryTimerId = window.setTimeout(() => {
      imagePreviewRetryTimersRef.current.delete(messageId);
      setImagePreviewRetryNonce(previousValue => previousValue + 1);
    }, retryDelay);
    imagePreviewRetryTimersRef.current.set(messageId, retryTimerId);
  }, []);

  useEffect(() => {
    imageMessagePreviewEntriesRef.current = imageMessagePreviewEntries;
  }, [imageMessagePreviewEntries]);

  useEffect(() => {
    const retryTimers = imagePreviewRetryTimersRef.current;

    return () => {
      retryTimers.forEach(timerId => {
        window.clearTimeout(timerId);
      });
      retryTimers.clear();
    };
  }, []);

  useEffect(() => {
    const signedUrlExpirations = Object.values(imageMessagePreviewEntries)
      .map(previewEntry => previewEntry.expiresAt)
      .filter(
        (expiresAt): expiresAt is number => typeof expiresAt === 'number'
      );

    if (signedUrlExpirations.length === 0) {
      return;
    }

    const nearestExpiry = Math.min(...signedUrlExpirations);
    const refreshDelay = Math.max(
      nearestExpiry - Date.now() - IMAGE_URL_REFRESH_LEAD_MS,
      0
    );
    const refreshTimerId = window.setTimeout(() => {
      setImagePreviewRefreshTick(previousTick => previousTick + 1);
    }, refreshDelay);

    return () => {
      window.clearTimeout(refreshTimerId);
    };
  }, [imageMessagePreviewEntries]);

  useEffect(() => {
    let isCancelled = false;

    const activeImageMessageIds = new Set(
      messages
        .filter(messageItem => isImagePreviewableMessage(messageItem))
        .map(messageItem => messageItem.id)
    );

    chatRuntimeCache.imagePreviews.pruneExcept(activeImageMessageIds);

    for (const [messageId] of imagePreviewRetryAttemptsRef.current) {
      if (activeImageMessageIds.has(messageId)) {
        continue;
      }

      imagePreviewRetryAttemptsRef.current.delete(messageId);
      clearImagePreviewRetryTimer(messageId);
    }

    setImageMessagePreviewEntries(previousEntries => {
      let hasChanges = false;
      const nextEntries: Record<string, ImageMessagePreviewEntry> = {};

      Object.entries(previousEntries).forEach(([messageId, previewEntry]) => {
        if (!activeImageMessageIds.has(messageId)) {
          hasChanges = true;
          releaseImagePreviewUrl(messageId);
          return;
        }

        nextEntries[messageId] = previewEntry;
      });

      return hasChanges ? nextEntries : previousEntries;
    });

    const pendingImageMessages = messages.filter(messageItem => {
      if (!isImagePreviewableMessage(messageItem)) {
        return false;
      }

      if (messageItem.id.startsWith('temp_')) {
        return false;
      }

      if (!messageItem.file_storage_path) {
        return false;
      }

      const existingPreviewEntry =
        imageMessagePreviewEntriesRef.current[messageItem.id];
      if (
        existingPreviewEntry &&
        (existingPreviewEntry.expiresAt === null ||
          existingPreviewEntry.expiresAt >
            Date.now() + IMAGE_URL_REFRESH_LEAD_MS)
      ) {
        return false;
      }

      if (
        objectUrlsRef.current.has(messageItem.id) &&
        !existingPreviewEntry?.expiresAt
      ) {
        return false;
      }

      if (imagePreviewRetryTimersRef.current.has(messageItem.id)) {
        return false;
      }

      if (
        (imagePreviewRetryAttemptsRef.current.get(messageItem.id) ?? 0) >=
        IMAGE_PREVIEW_MAX_RETRY_ATTEMPTS
      ) {
        return false;
      }

      return true;
    });

    if (pendingImageMessages.length === 0) {
      return;
    }

    const resolveImagePreviews = async () => {
      const resolvedEntries = await Promise.all(
        pendingImageMessages.map(async messageItem => {
          try {
            const resolvedAsset = await resolveChatAssetUrlWithExpiry(
              messageItem.message,
              messageItem.file_storage_path
            );
            if (resolvedAsset) {
              imagePreviewRetryAttemptsRef.current.delete(messageItem.id);
              clearImagePreviewRetryTimer(messageItem.id);
              return {
                messageId: messageItem.id,
                previewEntry: {
                  url: resolvedAsset.url,
                  expiresAt: resolvedAsset.expiresAt,
                  isObjectUrl: false,
                },
              };
            }

            const imageBlob = await fetchChatFileBlobWithFallback(
              messageItem.message,
              messageItem.file_storage_path,
              messageItem.file_mime_type
            );
            if (!imageBlob) {
              scheduleImagePreviewRetry(messageItem.id);
              return null;
            }

            imagePreviewRetryAttemptsRef.current.delete(messageItem.id);
            clearImagePreviewRetryTimer(messageItem.id);
            return {
              messageId: messageItem.id,
              previewEntry: {
                url: URL.createObjectURL(imageBlob),
                expiresAt: null,
                isObjectUrl: true,
              },
            };
          } catch (error) {
            console.error('Error resolving chat image preview:', error);
            scheduleImagePreviewRetry(messageItem.id);
            return null;
          }
        })
      );

      if (isCancelled) {
        resolvedEntries.forEach(resolvedEntry => {
          if (resolvedEntry?.previewEntry.isObjectUrl) {
            URL.revokeObjectURL(resolvedEntry.previewEntry.url);
          }
        });
        return;
      }

      const nextImageMessagePreviewEntries: Record<
        string,
        ImageMessagePreviewEntry
      > = {};
      const resolvedMessageIds: string[] = [];

      resolvedEntries.forEach(resolvedEntry => {
        if (!resolvedEntry) {
          return;
        }

        resolvedMessageIds.push(resolvedEntry.messageId);

        const previousUrl = objectUrlsRef.current.get(resolvedEntry.messageId);
        if (
          previousUrl &&
          (!resolvedEntry.previewEntry.isObjectUrl ||
            previousUrl !== resolvedEntry.previewEntry.url)
        ) {
          URL.revokeObjectURL(previousUrl);
          objectUrlsRef.current.delete(resolvedEntry.messageId);
        }

        if (resolvedEntry.previewEntry.isObjectUrl) {
          objectUrlsRef.current.set(
            resolvedEntry.messageId,
            resolvedEntry.previewEntry.url
          );
        }

        nextImageMessagePreviewEntries[resolvedEntry.messageId] =
          resolvedEntry.previewEntry;
      });

      chatRuntimeCache.imagePreviews.deleteByMessageIds(resolvedMessageIds);

      if (Object.keys(nextImageMessagePreviewEntries).length === 0) {
        return;
      }

      setImageMessagePreviewEntries(previousEntries => ({
        ...previousEntries,
        ...nextImageMessagePreviewEntries,
      }));
    };

    void resolveImagePreviews();

    return () => {
      isCancelled = true;
    };
  }, [
    clearImagePreviewRetryTimer,
    imagePreviewRefreshTick,
    imagePreviewRetryNonce,
    messages,
    releaseImagePreviewUrl,
    scheduleImagePreviewRetry,
  ]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach(previewUrl => {
        URL.revokeObjectURL(previewUrl);
      });
      objectUrls.clear();
    };
  }, []);

  const getImageMessageUrl = useCallback(
    (
      message: Pick<
        ChatMessage,
        'id' | 'message' | 'message_type' | 'file_name' | 'file_mime_type'
      >
    ) => {
      if (!isImagePreviewableMessage(message)) {
        return null;
      }

      const resolvedPreviewUrl = imageMessagePreviewEntries[message.id]?.url;
      if (resolvedPreviewUrl) {
        return resolvedPreviewUrl;
      }

      const handedOffPreviewUrl = chatRuntimeCache.imagePreviews.getEntry(
        message.id
      )?.previewUrl;
      if (handedOffPreviewUrl) {
        return handedOffPreviewUrl;
      }

      if (
        message.id.startsWith('temp_') ||
        isDirectChatAssetUrl(message.message)
      ) {
        return message.message;
      }

      return null;
    },
    [imageMessagePreviewEntries]
  );

  return {
    getImageMessageUrl,
  };
};
