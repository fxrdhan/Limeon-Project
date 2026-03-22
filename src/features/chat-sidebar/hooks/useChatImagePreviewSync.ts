import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { type ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerFile } from '../types';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import {
  createImageExpandStageDataUrl,
  persistImageMessagePreview,
} from '../utils/image-message-preview';
import {
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../utils/message-file';

interface UseChatImagePreviewSyncProps {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isCurrentConversationScopeActive: () => boolean;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

export const useChatImagePreviewSync = ({
  setMessages,
  isCurrentConversationScopeActive,
  runInCurrentConversationScope,
}: UseChatImagePreviewSyncProps) => {
  const isImagePendingFile = useCallback((pendingFile: PendingComposerFile) => {
    const fileExtension = resolveFileExtension(
      pendingFile.fileName,
      pendingFile.file.name,
      pendingFile.mimeType
    );

    return isImageFileExtensionOrMime(fileExtension, pendingFile.mimeType);
  }, []);

  const syncPersistedImagePreview = useCallback(
    async ({ realMessage, file }: { realMessage: ChatMessage; file: File }) => {
      const imageStoragePath =
        realMessage.file_storage_path?.trim() || realMessage.message.trim();
      if (!imageStoragePath) {
        return;
      }

      try {
        const persistedPreview = await persistImageMessagePreview({
          messageId: realMessage.id,
          file,
          fileStoragePath: imageStoragePath,
        });
        if (!persistedPreview) {
          if (isCurrentConversationScopeActive()) {
            toast.error(
              'Pesan terkirim, tetapi thumbnail gambar gagal dibuat',
              {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              }
            );
          }
          return;
        }

        let expandStageDataUrl: string | null = null;
        try {
          expandStageDataUrl = await createImageExpandStageDataUrl(file);
        } catch (stageError) {
          console.error('Failed to create in-memory expand stage:', stageError);
        }

        chatRuntimeCache.imagePreviews.setEntry(realMessage.id, {
          previewUrl: persistedPreview.previewDataUrl,
          isObjectUrl: false,
        });
        if (expandStageDataUrl) {
          chatRuntimeCache.imagePreviews.setExpandStage(
            realMessage.id,
            expandStageDataUrl
          );
        }

        if (persistedPreview.error || !persistedPreview.message) {
          console.error(
            'Failed to persist chat image preview metadata:',
            persistedPreview.error
          );
          if (isCurrentConversationScopeActive()) {
            toast.error(
              'Pesan terkirim, tetapi metadata thumbnail gambar gagal disimpan',
              {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              }
            );
          }
          return;
        }

        runInCurrentConversationScope(() => {
          setMessages(previousMessages =>
            previousMessages.map(previousMessage =>
              previousMessage.id === realMessage.id
                ? {
                    ...previousMessage,
                    ...persistedPreview.message,
                    stableKey: previousMessage.stableKey,
                  }
                : previousMessage
            )
          );
        });
      } catch (error) {
        console.error('Error syncing persisted image preview:', error);
        if (isCurrentConversationScopeActive()) {
          toast.error(
            'Pesan terkirim, tetapi thumbnail gambar gagal diproses',
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
        }
      }
    },
    [
      isCurrentConversationScopeActive,
      runInCurrentConversationScope,
      setMessages,
    ]
  );

  return {
    isImagePendingFile,
    syncPersistedImagePreview,
  };
};
