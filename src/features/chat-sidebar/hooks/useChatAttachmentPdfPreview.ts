import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { CHAT_IMAGE_BUCKET } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser, PendingComposerFile } from '../types';
import { renderPdfPreviewBlob } from '../utils/pdf-preview';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import { buildPdfPreviewStoragePath } from '../utils/message-file';

interface UseChatAttachmentPdfPreviewProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  broadcastUpdatedMessage: (message: ChatMessage) => void;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
  deleteUploadedStorageFiles: (
    storagePaths: Array<string | null | undefined>
  ) => Promise<string[]>;
}

export const useChatAttachmentPdfPreview = ({
  user,
  targetUser,
  setMessages,
  broadcastUpdatedMessage,
  isConversationScopeActive,
  deleteUploadedStorageFiles,
}: UseChatAttachmentPdfPreviewProps) => {
  const mergeAndBroadcastPreviewUpdate = useCallback(
    (payload: ChatMessage, conversationScopeKey: string | null) => {
      if (!isConversationScopeActive(conversationScopeKey)) {
        return;
      }

      setMessages(previousMessages =>
        previousMessages.map(messageItem =>
          messageItem.id === payload.id
            ? { ...messageItem, ...payload }
            : messageItem
        )
      );
      broadcastUpdatedMessage(payload);
    },
    [broadcastUpdatedMessage, isConversationScopeActive, setMessages]
  );

  const processPdfPreview = useCallback(
    async (
      realMessage: ChatMessage,
      pendingFile: PendingComposerFile,
      filePath: string,
      stableKey: string,
      conversationScopeKey: string | null
    ) => {
      if (!user || !targetUser) {
        return;
      }

      const applyPreviewFailedState = async (errorMessage: string) => {
        const { data: failedPreviewMessage, error: failedPreviewError } =
          await chatSidebarGateway.updateMessage(realMessage.id, {
            file_preview_status: 'failed',
            file_preview_error: errorMessage,
          });
        if (failedPreviewError || !failedPreviewMessage) return;

        mergeAndBroadcastPreviewUpdate(
          mapPersistedMessageForDisplay(
            failedPreviewMessage,
            user,
            targetUser,
            stableKey
          ),
          conversationScopeKey
        );
      };

      let uploadedPreviewPath: string | null = null;

      try {
        const generatedPreview = await renderPdfPreviewBlob(
          pendingFile.file,
          260
        );
        if (!generatedPreview) {
          await applyPreviewFailedState('Gagal membuat preview PDF');
          return;
        }

        const previewPath = buildPdfPreviewStoragePath(filePath);
        const previewFileNameBase =
          pendingFile.fileName.replace(/\.[^./]+$/, '') || 'preview';
        const previewFile = new File(
          [generatedPreview.coverBlob],
          `${previewFileNameBase}.png`,
          { type: 'image/png' }
        );

        const { path: storedPreviewPath } =
          await chatSidebarGateway.uploadAttachment(
            CHAT_IMAGE_BUCKET,
            previewFile,
            previewPath,
            'image/png'
          );
        uploadedPreviewPath = storedPreviewPath;

        const { data: previewReadyMessage, error: previewReadyError } =
          await chatSidebarGateway.updateMessage(realMessage.id, {
            file_preview_url: storedPreviewPath,
            file_preview_page_count: generatedPreview.pageCount,
            file_preview_status: 'ready',
            file_preview_error: null,
          });
        if (previewReadyError || !previewReadyMessage) {
          await deleteUploadedStorageFiles([uploadedPreviewPath]);
          await applyPreviewFailedState('Gagal menyimpan preview PDF');
          return;
        }

        mergeAndBroadcastPreviewUpdate(
          mapPersistedMessageForDisplay(
            previewReadyMessage,
            user,
            targetUser,
            stableKey
          ),
          conversationScopeKey
        );
      } catch (error) {
        console.error('Error processing PDF preview metadata:', error);
        await deleteUploadedStorageFiles([uploadedPreviewPath]);
        await applyPreviewFailedState('Gagal memproses preview PDF');
      }
    },
    [
      deleteUploadedStorageFiles,
      mergeAndBroadcastPreviewUpdate,
      targetUser,
      user,
    ]
  );

  return {
    processPdfPreview,
  };
};
