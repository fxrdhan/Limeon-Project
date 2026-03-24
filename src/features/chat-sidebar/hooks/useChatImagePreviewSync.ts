import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { PendingComposerFile } from '../types';
import { seedChannelImageAssetsFromFile } from '../utils/channel-image-asset-cache';
import { createImagePreviewUploadArtifact } from '../utils/image-message-preview';
import {
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../utils/message-file';

interface UseChatImagePreviewSyncProps {
  currentChannelId: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isCurrentConversationScopeActive: () => boolean;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

export const useChatImagePreviewSync = ({
  currentChannelId,
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
        if (currentChannelId?.trim()) {
          await seedChannelImageAssetsFromFile(
            currentChannelId,
            realMessage.id,
            file
          );
        }
      } catch (error) {
        console.error('Error syncing persisted image preview:', error);
        if (isCurrentConversationScopeActive()) {
          toast.error(
            'Pesan terkirim, tetapi cache gambar lokal gagal dipanaskan',
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
        }
      }

      const persistedPreviewPath = realMessage.file_preview_url?.trim();
      if (persistedPreviewPath) {
        return;
      }

      try {
        const previewArtifact = await createImagePreviewUploadArtifact(
          file,
          imageStoragePath
        );
        if (!previewArtifact) {
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

        const { path: uploadedPreviewPath } =
          await chatSidebarAssetsGateway.uploadAttachment(
            previewArtifact.previewFile,
            previewArtifact.previewStoragePath,
            previewArtifact.previewFile.type || undefined
          );
        const { data, error } =
          await chatSidebarMessagesGateway.updateFilePreview(realMessage.id, {
            file_preview_url: uploadedPreviewPath,
            file_preview_status: 'ready',
            file_preview_error: null,
          });

        if (error || !data) {
          console.error(
            'Failed to persist chat image preview metadata:',
            error
          );
          void chatSidebarAssetsGateway
            .deleteAsset(uploadedPreviewPath)
            .catch(cleanupError => {
              console.error(
                'Error cleaning up orphaned chat image preview:',
                cleanupError
              );
            });

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
                    ...data,
                    stableKey: previousMessage.stableKey,
                  }
                : previousMessage
            )
          );
        });
      } catch (error) {
        console.error('Error persisting chat image preview:', error);
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
      currentChannelId,
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
