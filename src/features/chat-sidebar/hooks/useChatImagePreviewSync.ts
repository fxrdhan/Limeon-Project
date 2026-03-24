import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { type ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerFile } from '../types';
import { seedChannelImageAssetsFromFile } from '../utils/channel-image-asset-cache';
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
  isCurrentConversationScopeActive,
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

      if (!realMessage.file_preview_url && isCurrentConversationScopeActive()) {
        toast.error('Pesan terkirim, tetapi thumbnail gambar tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      }
    },
    [currentChannelId, isCurrentConversationScopeActive]
  );

  return {
    isImagePendingFile,
    syncPersistedImagePreview,
  };
};
