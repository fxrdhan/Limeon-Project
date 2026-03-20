import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarPreviewGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { PendingComposerFile } from '../types';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import { buildPdfMessagePreviewCacheKey } from '../utils/pdf-message-preview';
import { resolveFileExtension } from '../utils/message-file';
import {
  createPdfPreviewUploadArtifact,
  readBlobAsDataUrl,
} from '../utils/pdf-message-preview';

interface UseChatPdfPreviewSyncProps {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isCurrentConversationScopeActive: () => boolean;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

export const useChatPdfPreviewSync = ({
  setMessages,
  isCurrentConversationScopeActive,
  runInCurrentConversationScope,
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
      try {
        const renderedPreview = await createPdfPreviewUploadArtifact(
          pendingFile.file,
          realMessage.id
        );

        if (!renderedPreview) {
          if (isCurrentConversationScopeActive()) {
            toast.error('Pesan terkirim, tetapi preview PDF gagal disiapkan', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
          return;
        }

        const previewDataUrl = await readBlobAsDataUrl(
          renderedPreview.previewFile
        );
        const previewPngBase64 = previewDataUrl.split(',')[1] ?? '';
        const { data, error } =
          await chatSidebarPreviewGateway.persistPdfPreview({
            message_id: realMessage.id,
            preview_png_base64: previewPngBase64,
            page_count: renderedPreview.pageCount,
          });

        if (error || !data?.message) {
          console.error('Failed to persist chat PDF preview:', error);
          if (isCurrentConversationScopeActive()) {
            toast.error(
              'Pesan terkirim, tetapi metadata preview PDF gagal disimpan',
              {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              }
            );
          }
          return;
        }

        const nextMessage = {
          ...realMessage,
          ...data.message,
        };
        const cacheKey = buildPdfMessagePreviewCacheKey(
          nextMessage,
          nextMessage.file_name ?? pendingFile.fileName
        );
        chatRuntimeCache.pdfPreviews.set(nextMessage.id, {
          cacheKey,
          coverDataUrl: previewDataUrl,
          pageCount: renderedPreview.pageCount,
        });

        runInCurrentConversationScope(() => {
          setMessages(previousMessages =>
            previousMessages.map(previousMessage =>
              previousMessage.id === realMessage.id
                ? {
                    ...previousMessage,
                    ...data.message,
                    stableKey: previousMessage.stableKey,
                  }
                : previousMessage
            )
          );
        });

        if (!data.previewPersisted && isCurrentConversationScopeActive()) {
          toast.error('Pesan terkirim, tetapi preview PDF tidak tersedia', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
      } catch (error) {
        console.error('Error syncing persisted PDF preview:', error);
        if (isCurrentConversationScopeActive()) {
          toast.error('Pesan terkirim, tetapi preview PDF gagal diproses', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
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
    isPdfPendingFile,
    syncPersistedPdfPreview,
  };
};
