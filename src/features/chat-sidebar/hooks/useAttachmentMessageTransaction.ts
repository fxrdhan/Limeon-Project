import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type {
  ChatSidebarPanelTargetUser,
  PendingSendRegistration,
} from '../types';
import {
  persistAttachmentCaptionMessage,
  persistAttachmentMessage,
} from './attachmentMessagePersistence';
import {
  appendOptimisticAttachmentThread,
  commitOptimisticAttachmentThread,
  prepareAttachmentOptimisticTransaction,
  removeOptimisticAttachmentThread,
  type PreparedComposerAttachmentOptimisticState,
} from '../utils/attachment-send';

export interface SendAttachmentMessageOptions {
  tempIdPrefix: string;
  stableKeySuffix: string;
  file: File;
  captionText?: string;
  sendFailureToast: string;
  captionFailureToast: string;
  shouldDelayPreviewCleanup?: boolean;
  buildOptimisticMessage: (context: {
    tempId: string;
    stableKey: string;
    localPreviewUrl: string;
    timestamp: string;
    replyToId: string | null;
  }) => ChatMessage;
  uploadAsset: () => Promise<{
    path: string;
    additionalStoragePaths?: Array<string | null | undefined>;
  }>;
  createPersistedMessage: (
    uploadedPath: string
  ) => Promise<{ data: ChatMessage | null; error: unknown }>;
  mapPersistedMessage: (
    persistedMessage: ChatMessage,
    uploadedPath: string,
    stableKey: string
  ) => ChatMessage;
  onBeforeAppendOptimistic?: (optimisticMessage: ChatMessage) => void;
  onAfterCommit?: (
    realMessage: ChatMessage,
    stableKey: string,
    uploadedPath: string,
    conversationScopeKey: string | null,
    tempId: string
  ) => void | Promise<void>;
  optimistic?: PreparedComposerAttachmentOptimisticState;
}

interface UseAttachmentMessageTransactionParams {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  editingMessageId: string | null;
  replyingMessageId?: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  registerPendingSend: (tempMessageId: string) => PendingSendRegistration;
  conversationScopeKey: string | null;
  isCurrentConversationScopeActive: () => boolean;
  reconcileCurrentConversationMessages: (options?: {
    fallbackMessages?: ChatMessage[];
  }) => Promise<void>;
  runInCurrentConversationScope: (effect: () => void) => boolean;
  deleteUploadedStorageFilesOrThrow: (
    storagePaths: Array<string | null | undefined>
  ) => Promise<void>;
  rollbackPersistedAttachmentThread: (
    messageId: string,
    storagePaths: Array<string | null | undefined>,
    conversationScopeKey: string | null
  ) => Promise<void>;
  releasePendingPreviewUrl: (
    tempMessageId: string,
    shouldDelayPreviewCleanup?: boolean
  ) => void;
}

export const useAttachmentMessageTransaction = ({
  user,
  targetUser,
  currentChannelId,
  editingMessageId,
  replyingMessageId = null,
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  pendingImagePreviewUrlsRef,
  registerPendingSend,
  conversationScopeKey,
  isCurrentConversationScopeActive,
  reconcileCurrentConversationMessages,
  runInCurrentConversationScope,
  deleteUploadedStorageFilesOrThrow,
  rollbackPersistedAttachmentThread,
  releasePendingPreviewUrl,
}: UseAttachmentMessageTransactionParams) => {
  const cleanupUncommittedStorageFiles = useCallback(
    async (
      storagePaths: Array<string | null | undefined>,
      options?: {
        toastMessage?: string;
        shouldToast?: boolean;
      }
    ) => {
      try {
        await deleteUploadedStorageFilesOrThrow(storagePaths);
        return true;
      } catch (cleanupError) {
        console.error('Error cleaning up uncommitted chat attachment:', {
          cleanupError,
          storagePaths,
        });

        if (
          options?.shouldToast &&
          options.toastMessage &&
          isCurrentConversationScopeActive()
        ) {
          toast.error(options.toastMessage, {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }

        return false;
      }
    },
    [deleteUploadedStorageFilesOrThrow, isCurrentConversationScopeActive]
  );

  const sendAttachmentMessage = useCallback(
    async ({
      tempIdPrefix,
      stableKeySuffix,
      file,
      captionText,
      sendFailureToast,
      captionFailureToast,
      shouldDelayPreviewCleanup = false,
      buildOptimisticMessage,
      uploadAsset,
      createPersistedMessage,
      mapPersistedMessage,
      onBeforeAppendOptimistic,
      onAfterCommit,
      optimistic,
    }: SendAttachmentMessageOptions) => {
      if (!user || !targetUser || !currentChannelId) {
        return null;
      }

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      const { optimisticThread, localPreviewUrl, shouldAppendOptimistic } =
        prepareAttachmentOptimisticTransaction({
          optimistic,
          file,
          tempIdPrefix,
          stableKeySuffix,
          captionText,
          currentChannelId,
          user,
          targetUser,
          replyToId: replyingMessageId,
          buildOptimisticMessage,
        });
      const {
        tempId,
        stableKey,
        normalizedCaptionText,
        hasAttachmentCaption,
        captionTempId,
        captionStableKey,
      } = optimisticThread;
      const pendingSend = registerPendingSend(tempId);
      pendingImagePreviewUrlsRef.current.set(tempId, localPreviewUrl);
      onBeforeAppendOptimistic?.(optimisticThread.optimisticMessage);

      if (shouldAppendOptimistic) {
        setMessages(previousMessages =>
          appendOptimisticAttachmentThread(previousMessages, optimisticThread)
        );
        triggerSendSuccessGlow();
        scheduleScrollMessagesToBottom();
      }

      let uploadedStoragePath: string | null = null;
      let uploadedStoragePaths: string[] = [];

      try {
        const persistedAttachment = await persistAttachmentMessage({
          uploadAsset,
          createPersistedMessage,
          mapPersistedMessage,
          stableKey,
        });
        uploadedStoragePath = persistedAttachment.uploadedStoragePath;
        uploadedStoragePaths = persistedAttachment.uploadedStoragePaths;

        if (!persistedAttachment.realMessage || persistedAttachment.error) {
          if (pendingSend.isCancelled()) {
            await cleanupUncommittedStorageFiles(uploadedStoragePaths);
            return null;
          }

          if (
            !pendingSend.isCancelled() &&
            isCurrentConversationScopeActive()
          ) {
            setMessages(previousMessages =>
              removeOptimisticAttachmentThread(
                previousMessages,
                tempId,
                captionTempId
              )
            );
          }

          const didCleanupStorage = await cleanupUncommittedStorageFiles(
            uploadedStoragePaths,
            {
              toastMessage:
                'Pengiriman gagal dan file sementara tidak dapat dibersihkan',
              shouldToast: !pendingSend.isCancelled(),
            }
          );

          if (
            didCleanupStorage &&
            !pendingSend.isCancelled() &&
            isCurrentConversationScopeActive()
          ) {
            toast.error(sendFailureToast, {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }

          return null;
        }

        const realMessage = persistedAttachment.realMessage;

        if (pendingSend.isCancelled()) {
          try {
            await rollbackPersistedAttachmentThread(
              realMessage.id,
              uploadedStoragePaths,
              conversationScopeKey
            );
          } catch (rollbackError) {
            console.error(
              'Error cancelling temp attachment thread after persistence:',
              rollbackError
            );
            await reconcileCurrentConversationMessages();
          }
          return null;
        }

        if (hasAttachmentCaption && captionTempId) {
          const persistedCaption = await persistAttachmentCaptionMessage({
            user,
            targetUser,
            currentChannelId,
            realMessage,
            normalizedCaptionText,
            captionStableKey: captionStableKey!,
          });

          if (
            !persistedCaption.error &&
            persistedCaption.mappedCaptionMessage
          ) {
            if (pendingSend.isCancelled()) {
              try {
                await rollbackPersistedAttachmentThread(
                  realMessage.id,
                  uploadedStoragePaths,
                  conversationScopeKey
                );
              } catch (rollbackError) {
                console.error(
                  'Error cancelling temp attachment thread after caption persistence:',
                  rollbackError
                );
                await reconcileCurrentConversationMessages();
              }
              return null;
            }

            runInCurrentConversationScope(() => {
              setMessages(previousMessages =>
                commitOptimisticAttachmentThread({
                  previousMessages,
                  tempId,
                  realMessage,
                  captionTempId,
                  mappedCaptionMessage: persistedCaption.mappedCaptionMessage,
                })
              );
            });
          } else {
            if (
              !pendingSend.isCancelled() &&
              isCurrentConversationScopeActive()
            ) {
              setMessages(previousMessages =>
                removeOptimisticAttachmentThread(
                  previousMessages,
                  tempId,
                  captionTempId
                )
              );
            }

            try {
              await rollbackPersistedAttachmentThread(
                realMessage.id,
                uploadedStoragePaths,
                conversationScopeKey
              );
            } catch (rollbackError) {
              console.error(
                'Error rolling back attachment thread:',
                rollbackError
              );
              await reconcileCurrentConversationMessages();
            }

            if (
              !pendingSend.isCancelled() &&
              isCurrentConversationScopeActive()
            ) {
              toast.error(captionFailureToast, {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }

            return null;
          }
        } else {
          runInCurrentConversationScope(() => {
            setMessages(previousMessages =>
              commitOptimisticAttachmentThread({
                previousMessages,
                tempId,
                realMessage,
                captionTempId: null,
                mappedCaptionMessage: null,
              })
            );
          });
        }

        if (uploadedStoragePath) {
          await onAfterCommit?.(
            realMessage,
            stableKey,
            uploadedStoragePath,
            conversationScopeKey,
            tempId
          );
        }

        return realMessage.id;
      } catch (error) {
        console.error('Error sending attachment message:', error);

        if (!pendingSend.isCancelled() && isCurrentConversationScopeActive()) {
          setMessages(previousMessages =>
            removeOptimisticAttachmentThread(
              previousMessages,
              tempId,
              captionTempId
            )
          );
        }

        const didCleanupStorage = await cleanupUncommittedStorageFiles(
          uploadedStoragePaths,
          {
            toastMessage:
              'Pengiriman gagal dan file sementara tidak dapat dibersihkan',
            shouldToast: !pendingSend.isCancelled(),
          }
        );

        if (
          didCleanupStorage &&
          !pendingSend.isCancelled() &&
          isCurrentConversationScopeActive()
        ) {
          toast.error(sendFailureToast, {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }

        return null;
      } finally {
        pendingSend.complete();
        releasePendingPreviewUrl(tempId, shouldDelayPreviewCleanup);
      }
    },
    [
      cleanupUncommittedStorageFiles,
      conversationScopeKey,
      currentChannelId,
      editingMessageId,
      replyingMessageId,
      isCurrentConversationScopeActive,
      pendingImagePreviewUrlsRef,
      reconcileCurrentConversationMessages,
      registerPendingSend,
      releasePendingPreviewUrl,
      rollbackPersistedAttachmentThread,
      runInCurrentConversationScope,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  return sendAttachmentMessage;
};
