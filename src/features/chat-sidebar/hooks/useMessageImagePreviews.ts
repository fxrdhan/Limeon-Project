import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  fetchChatFileBlobWithFallback,
  isDirectChatAssetUrl,
  resolveChatAssetUrl,
} from '../utils/message-file';

export const useMessageImagePreviews = ({
  messages,
}: {
  messages: ChatMessage[];
}) => {
  const [imageMessageUrls, setImageMessageUrls] = useState<
    Record<string, string>
  >({});
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const imageMessageUrlsRef = useRef<Record<string, string>>({});

  const releaseImagePreviewUrl = useCallback((messageId: string) => {
    const existingUrl = objectUrlsRef.current.get(messageId);
    if (!existingUrl) {
      return;
    }

    URL.revokeObjectURL(existingUrl);
    objectUrlsRef.current.delete(messageId);
  }, []);

  useEffect(() => {
    imageMessageUrlsRef.current = imageMessageUrls;
  }, [imageMessageUrls]);

  useEffect(() => {
    let isCancelled = false;

    const activeImageMessageIds = new Set(
      messages
        .filter(messageItem => messageItem.message_type === 'image')
        .map(messageItem => messageItem.id)
    );

    setImageMessageUrls(previousUrls => {
      let hasChanges = false;
      const nextUrls: Record<string, string> = {};

      Object.entries(previousUrls).forEach(([messageId, previewUrl]) => {
        if (!activeImageMessageIds.has(messageId)) {
          hasChanges = true;
          releaseImagePreviewUrl(messageId);
          return;
        }

        nextUrls[messageId] = previewUrl;
      });

      return hasChanges ? nextUrls : previousUrls;
    });

    const pendingImageMessages = messages.filter(messageItem => {
      if (messageItem.message_type !== 'image') {
        return false;
      }

      if (messageItem.id.startsWith('temp_')) {
        return false;
      }

      if (!messageItem.file_storage_path) {
        return false;
      }

      if (imageMessageUrlsRef.current[messageItem.id]) {
        return false;
      }

      if (objectUrlsRef.current.has(messageItem.id)) {
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
            const signedUrl = await resolveChatAssetUrl(
              messageItem.message,
              messageItem.file_storage_path
            );
            if (signedUrl) {
              return {
                messageId: messageItem.id,
                resolvedUrl: signedUrl,
                objectUrl: null,
              };
            }

            const imageBlob = await fetchChatFileBlobWithFallback(
              messageItem.message,
              messageItem.file_storage_path,
              messageItem.file_mime_type
            );
            if (!imageBlob) {
              return null;
            }

            return {
              messageId: messageItem.id,
              resolvedUrl: URL.createObjectURL(imageBlob),
              objectUrl: true,
            };
          } catch (error) {
            console.error('Error resolving chat image preview:', error);
            return null;
          }
        })
      );

      if (isCancelled) {
        resolvedEntries.forEach(resolvedEntry => {
          if (resolvedEntry?.objectUrl) {
            URL.revokeObjectURL(resolvedEntry.resolvedUrl);
          }
        });
        return;
      }

      const nextImageMessageUrls: Record<string, string> = {};

      resolvedEntries.forEach(resolvedEntry => {
        if (!resolvedEntry) {
          return;
        }

        if (resolvedEntry.objectUrl) {
          const previousUrl = objectUrlsRef.current.get(
            resolvedEntry.messageId
          );
          if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
          }

          objectUrlsRef.current.set(
            resolvedEntry.messageId,
            resolvedEntry.resolvedUrl
          );
        }

        nextImageMessageUrls[resolvedEntry.messageId] =
          resolvedEntry.resolvedUrl;
      });

      if (Object.keys(nextImageMessageUrls).length === 0) {
        return;
      }

      setImageMessageUrls(previousUrls => ({
        ...previousUrls,
        ...nextImageMessageUrls,
      }));
    };

    void resolveImagePreviews();

    return () => {
      isCancelled = true;
    };
  }, [messages, releaseImagePreviewUrl]);

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
    (message: Pick<ChatMessage, 'id' | 'message' | 'message_type'>) => {
      if (message.message_type !== 'image') {
        return null;
      }

      const resolvedPreviewUrl = imageMessageUrls[message.id];
      if (resolvedPreviewUrl) {
        return resolvedPreviewUrl;
      }

      if (
        message.id.startsWith('temp_') ||
        isDirectChatAssetUrl(message.message)
      ) {
        return message.message;
      }

      return null;
    },
    [imageMessageUrls]
  );

  return {
    getImageMessageUrl,
  };
};
