import { useCallback, type Dispatch, type SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { CHAT_IMAGE_BUCKET, CHAT_SIDEBAR_TOASTER_ID } from '../constants';
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
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
  deleteUploadedStorageFilesOrThrow: (
    storagePaths: Array<string | null | undefined>
  ) => Promise<void>;
}

export const useChatAttachmentPdfPreview = ({
  user,
  targetUser,
  setMessages,
  isConversationScopeActive,
  deleteUploadedStorageFilesOrThrow,
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
    },
    [isConversationScopeActive, setMessages]
  );

  const cleanupPreviewStorageFiles = useCallback(
    async (
      storagePaths: Array<string | null | undefined>,
      conversationScopeKey: string | null
    ) => {
      try {
        await deleteUploadedStorageFilesOrThrow(storagePaths);
        return true;
      } catch (cleanupError) {
        console.error('Error cleaning up PDF preview storage:', {
          cleanupError,
          storagePaths,
        });

        if (isConversationScopeActive(conversationScopeKey)) {
          toast.error(
            'Preview PDF gagal dibersihkan sepenuhnya. Cek storage chat.',
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
        }

        return false;
      }
    },
    [deleteUploadedStorageFilesOrThrow, isConversationScopeActive]
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
          await chatSidebarGateway.updateFilePreview(realMessage.id, {
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
          await chatSidebarGateway.updateFilePreview(realMessage.id, {
            file_preview_url: storedPreviewPath,
            file_preview_page_count: generatedPreview.pageCount,
            file_preview_status: 'ready',
            file_preview_error: null,
          });
        if (previewReadyError || !previewReadyMessage) {
          await cleanupPreviewStorageFiles(
            [uploadedPreviewPath],
            conversationScopeKey
          );
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
        await cleanupPreviewStorageFiles(
          [uploadedPreviewPath],
          conversationScopeKey
        );
        await applyPreviewFailedState('Gagal memproses preview PDF');
      }
    },
    [
      cleanupPreviewStorageFiles,
      mergeAndBroadcastPreviewUpdate,
      targetUser,
      user,
    ]
  );

  return {
    processPdfPreview,
  };
};
