import type { MutableRefObject } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { buildChatImagePath } from '../utils/attachment';
import {
  buildFailedAttachmentPreviewFields,
  buildReadyImagePreviewFields,
  prepareImagePreviewPersistence,
} from '../utils/attachment-preview-persistence';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import type {
  PreparedComposerAttachmentOptimisticState,
  SendAttachmentMessageOptions,
} from './useAttachmentMessageTransaction';

interface UseChatImageAttachmentSenderParams {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  sendAttachmentMessage: (
    options: SendAttachmentMessageOptions
  ) => Promise<string | null>;
  syncPersistedImagePreview: (params: {
    realMessage: ChatMessage;
    file: File;
  }) => Promise<void>;
}

export const useChatImageAttachmentSender = ({
  user,
  targetUser,
  currentChannelId,
  pendingImagePreviewUrlsRef,
  sendAttachmentMessage,
  syncPersistedImagePreview,
}: UseChatImageAttachmentSenderParams) => {
  return useCallback(
    async (
      file: File,
      captionText?: string,
      replyToId?: string | null,
      options?: {
        optimistic?: PreparedComposerAttachmentOptimisticState;
      }
    ): Promise<string | null> => {
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      if (!user || !targetUser || !currentChannelId) {
        return null;
      }

      const imagePath = buildChatImagePath(currentChannelId, user.id, file);
      const preparedImagePreview = await prepareImagePreviewPersistence(
        file,
        imagePath
      ).catch(error => {
        console.error('Error preparing chat image preview:', error);
        return null;
      });
      let imagePreviewFields = buildFailedAttachmentPreviewFields(
        'Thumbnail gambar tidak tersedia'
      );

      return sendAttachmentMessage({
        tempIdPrefix: 'temp_image',
        stableKeySuffix: 'image',
        file,
        captionText,
        sendFailureToast: 'Gagal mengirim gambar',
        captionFailureToast: 'Gagal mengirim deskripsi lampiran',
        buildOptimisticMessage: ({
          tempId,
          stableKey,
          localPreviewUrl,
          timestamp,
          replyToId: optimisticReplyToId,
        }) => ({
          id: tempId,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'image',
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: optimisticReplyToId ?? null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        }),
        uploadAsset: async () => {
          const { path } = await chatSidebarAssetsGateway.uploadAttachment(
            file,
            imagePath,
            file.type || undefined
          );
          const additionalStoragePaths: string[] = [];

          if (preparedImagePreview) {
            try {
              const { path: previewPath } =
                await chatSidebarAssetsGateway.uploadAttachment(
                  preparedImagePreview.file,
                  preparedImagePreview.storagePath,
                  preparedImagePreview.file.type || undefined
                );

              additionalStoragePaths.push(previewPath);
              imagePreviewFields = buildReadyImagePreviewFields(previewPath);
            } catch (error) {
              console.error('Error uploading chat image preview:', error);
            }
          }

          return {
            path,
            additionalStoragePaths,
          };
        },
        createPersistedMessage: async () =>
          chatSidebarMessagesGateway.createMessage({
            receiver_id: targetUser.id,
            message: imagePath,
            message_type: 'image',
            reply_to_id: replyToId ?? undefined,
            file_storage_path: imagePath,
            ...imagePreviewFields,
          }),
        mapPersistedMessage: (persistedMessage, _uploadedPath, stableKey) =>
          mapPersistedMessageForDisplay(
            {
              ...persistedMessage,
              file_storage_path: imagePath,
            },
            user,
            targetUser,
            stableKey
          ),
        onAfterCommit: async (
          realMessage,
          _stableKey,
          _uploadedPath,
          _scope,
          tempMessageId
        ) => {
          pendingImagePreviewUrlsRef.current.delete(tempMessageId);
          await syncPersistedImagePreview({
            realMessage: {
              ...realMessage,
              file_storage_path: realMessage.file_storage_path || imagePath,
              file_mime_type: realMessage.file_mime_type ?? file.type,
            },
            file,
          });
        },
        optimistic: options?.optimistic,
      });
    },
    [
      currentChannelId,
      pendingImagePreviewUrlsRef,
      sendAttachmentMessage,
      syncPersistedImagePreview,
      targetUser,
      user,
    ]
  );
};
