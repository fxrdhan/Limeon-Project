import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { type ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerFile } from '../types';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import { buildPdfMessagePreviewCacheKey } from '../utils/pdf-message-preview';
import { resolveFileExtension } from '../utils/message-file';

interface UseChatPdfPreviewSyncProps {
  isCurrentConversationScopeActive: () => boolean;
}

export const useChatPdfPreviewSync = ({
  isCurrentConversationScopeActive,
}: UseChatPdfPreviewSyncProps) => {
  const isPdfPendingFile = useCallback((pendingFile: PendingComposerFile) => {
    if (pendingFile.fileKind !== 'document') {
      return false;
    }

    const fileExtension = resolveFileExtension(
      pendingFile.fileName,
      pendingFile.file.name,
      pendingFile.mimeType
    );

    return (
      fileExtension === 'pdf' ||
      pendingFile.mimeType.toLowerCase().includes('pdf')
    );
  }, []);

  const syncPersistedPdfPreview = useCallback(
    async ({
      realMessage,
      pendingFile,
    }: {
      realMessage: ChatMessage;
      pendingFile: PendingComposerFile;
    }) => {
      const pdfCoverUrl = pendingFile.pdfCoverUrl?.trim();
      if (pdfCoverUrl) {
        const cacheKey = buildPdfMessagePreviewCacheKey(
          realMessage,
          realMessage.file_name ?? pendingFile.fileName
        );
        chatRuntimeCache.pdfPreviews.set(realMessage.id, {
          cacheKey,
          coverDataUrl: pdfCoverUrl,
          pageCount: Math.max(
            pendingFile.pdfPageCount ??
              realMessage.file_preview_page_count ??
              1,
            1
          ),
        });
      }

      if (!realMessage.file_preview_url && isCurrentConversationScopeActive()) {
        toast.error('Pesan terkirim, tetapi preview PDF tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      }
    },
    [isCurrentConversationScopeActive]
  );

  return {
    isPdfPendingFile,
    syncPersistedPdfPreview,
  };
};
