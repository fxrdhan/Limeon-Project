import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatAttachmentCleanup } from './useChatAttachmentCleanup';
import {
  appendOptimisticAttachmentThread,
  commitOptimisticAttachmentThread,
  createOptimisticAttachmentThread,
  removeOptimisticAttachmentThread,
} from '../utils/attachment-send';
import { buildChatFilePath, buildChatImagePath } from '../utils/attachment';
import {
  buildFailedAttachmentPreviewFields,
  buildReadyImagePreviewFields,
  buildReadyPdfPreviewFields,
  prepareImagePreviewPersistence,
  preparePdfPreviewPersistence,
} from '../utils/attachment-preview-persistence';
import { chatRuntime } from '../utils/chatRuntime';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import { buildPdfMessagePreviewCacheKey } from '../utils/pdf-message-preview';
import {
  markMessageAsAttachmentCaption,
  toAttachmentCaptionInsertInput,
} from '../utils/message-relations';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
  PendingComposerFile,
  PendingSendRegistration,
} from '../types';
import { useChatImagePreviewSync } from './useChatImagePreviewSync';
import { useChatPdfPreviewSync } from './useChatPdfPreviewSync';
import type { AttachmentComposerRemoteFile } from '../utils/composer-attachment-link';

interface ChatAttachmentMutationScope {
  conversationScopeKey: string | null;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
  isCurrentConversationScopeActive: () => boolean;
  reconcileCurrentConversationMessages: (options?: {
    fallbackMessages?: ChatMessage[];
  }) => Promise<void>;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

interface UseChatAttachmentSendProps {
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
  mutationScope: ChatAttachmentMutationScope;
}

export type SendableComposerAttachment =
  | AttachmentComposerRemoteFile
  | PendingComposerAttachment
  | PendingComposerFile;

interface PersistedAttachmentResult {
  uploadedStoragePath: string;
  uploadedStoragePaths: string[];
  realMessage: ChatMessage | null;
  error: unknown;
}

interface PersistedAttachmentCaptionResult {
  mappedCaptionMessage: ChatMessage | null;
  error: unknown;
}

interface SendAttachmentMessageOptions {
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
}

const persistAttachmentMessage = async ({
  uploadAsset,
  createPersistedMessage,
  mapPersistedMessage,
  stableKey,
}: Pick<
  SendAttachmentMessageOptions,
  'uploadAsset' | 'createPersistedMessage' | 'mapPersistedMessage'
> & {
  stableKey: string;
}): Promise<PersistedAttachmentResult> => {
  const uploadResult = await uploadAsset();
  const uploadedStoragePath = uploadResult.path;
  const uploadedStoragePaths = [
    uploadedStoragePath,
    ...(uploadResult.additionalStoragePaths ?? []),
  ]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));
  const { data: persistedMessage, error } =
    await createPersistedMessage(uploadedStoragePath);

  if (error || !persistedMessage) {
    return {
      uploadedStoragePath,
      uploadedStoragePaths,
      realMessage: null,
      error,
    };
  }

  return {
    uploadedStoragePath,
    uploadedStoragePaths,
    realMessage: mapPersistedMessage(
      persistedMessage,
      uploadedStoragePath,
      stableKey
    ),
    error: null,
  };
};

const persistAttachmentCaptionMessage = async ({
  user,
  targetUser,
  currentChannelId,
  realMessage,
  normalizedCaptionText,
  captionStableKey,
}: {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  realMessage: ChatMessage;
  normalizedCaptionText: string;
  captionStableKey: string;
}): Promise<PersistedAttachmentCaptionResult> => {
  if (!user || !targetUser || !currentChannelId) {
    return {
      mappedCaptionMessage: null,
      error: new Error('Missing active chat participants'),
    };
  }

  const { data: captionMessage, error } =
    await chatSidebarMessagesGateway.createMessage(
      toAttachmentCaptionInsertInput({
        receiver_id: targetUser.id,
        message: normalizedCaptionText,
        message_type: 'text',
        reply_to_id: realMessage.id,
      })
    );

  if (error || !captionMessage) {
    return {
      mappedCaptionMessage: null,
      error,
    };
  }

  return {
    mappedCaptionMessage: markMessageAsAttachmentCaption(
      mapPersistedMessageForDisplay(
        captionMessage,
        user,
        targetUser,
        captionStableKey
      ),
      realMessage.id
    ),
    error: null,
  };
};

export const useChatAttachmentSend = ({
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
  mutationScope,
}: UseChatAttachmentSendProps) => {
  const {
    conversationScopeKey,
    isConversationScopeActive,
    isCurrentConversationScopeActive,
    reconcileCurrentConversationMessages,
    runInCurrentConversationScope,
  } = mutationScope;
  const { isPdfPendingFile, syncPersistedPdfPreview } = useChatPdfPreviewSync({
    isCurrentConversationScopeActive,
  });
  const { isImagePendingFile, syncPersistedImagePreview } =
    useChatImagePreviewSync({
      currentChannelId,
      isCurrentConversationScopeActive,
    });
  const {
    deleteUploadedStorageFilesOrThrow,
    rollbackPersistedAttachmentThread,
    releasePendingPreviewUrl,
  } = useChatAttachmentCleanup({
    currentChannelId,
    setMessages,
    pendingImagePreviewUrlsRef,
    isConversationScopeActive,
  });

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

      const timestamp = new Date().toISOString();
      const localPreviewUrl = URL.createObjectURL(file);
      const optimisticThread = createOptimisticAttachmentThread({
        tempIdPrefix,
        stableKeySuffix,
        captionText,
        currentChannelId,
        localPreviewUrl,
        timestamp,
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

      setMessages(previousMessages =>
        appendOptimisticAttachmentThread(previousMessages, optimisticThread)
      );
      triggerSendSuccessGlow();
      scheduleScrollMessagesToBottom();

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

  const seedLocalPdfPreviewCache = useCallback(
    (message: ChatMessage, pendingFile: PendingComposerFile) => {
      const pdfCoverUrl = pendingFile.pdfCoverUrl?.trim();
      if (!isPdfPendingFile(pendingFile) || !pdfCoverUrl) {
        return;
      }

      const cacheKey = buildPdfMessagePreviewCacheKey(
        {
          ...message,
          file_name: message.file_name ?? pendingFile.fileName,
          file_mime_type: message.file_mime_type ?? pendingFile.mimeType,
          file_size: message.file_size ?? pendingFile.file.size,
        },
        pendingFile.fileName
      );

      chatRuntime.pdfPreviews.set(message.id, {
        cacheKey,
        coverDataUrl: pdfCoverUrl,
        pageCount: Math.max(pendingFile.pdfPageCount ?? 1, 1),
      });
    },
    [isPdfPendingFile]
  );

  const sendImageMessage = useCallback(
    async (
      file: File,
      captionText?: string,
      replyToId?: string | null
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

  const sendFileMessage = useCallback(
    async (
      pendingFile: PendingComposerFile,
      captionText?: string,
      replyToId?: string | null
    ): Promise<string | null> => {
      if (!user || !targetUser || !currentChannelId) {
        return null;
      }

      const filePath = buildChatFilePath(
        currentChannelId,
        user.id,
        pendingFile.file,
        pendingFile.fileKind
      );
      const sendFailureToast =
        pendingFile.fileKind === 'audio'
          ? 'Gagal mengirim audio'
          : 'Gagal mengirim dokumen';
      const shouldPersistImagePreview = isImagePendingFile(pendingFile);
      const shouldPersistPdfPreview = isPdfPendingFile(pendingFile);
      const preparedImagePreview = shouldPersistImagePreview
        ? await prepareImagePreviewPersistence(
            pendingFile.file,
            filePath
          ).catch(error => {
            console.error(
              'Error preparing chat document image preview:',
              error
            );
            return null;
          })
        : null;
      const preparedPdfPreview = shouldPersistPdfPreview
        ? await preparePdfPreviewPersistence(pendingFile.file, filePath).catch(
            error => {
              console.error('Error preparing chat PDF preview:', error);
              return null;
            }
          )
        : null;
      let filePreviewFields =
        shouldPersistImagePreview || shouldPersistPdfPreview
          ? buildFailedAttachmentPreviewFields(
              shouldPersistImagePreview
                ? 'Thumbnail gambar tidak tersedia'
                : 'Preview dokumen tidak tersedia'
            )
          : null;
      const resolvedPdfPendingFile =
        preparedPdfPreview &&
        (!pendingFile.pdfCoverUrl || !pendingFile.pdfPageCount)
          ? {
              ...pendingFile,
              pdfCoverUrl:
                pendingFile.pdfCoverUrl ?? preparedPdfPreview.coverDataUrl,
              pdfPageCount:
                pendingFile.pdfPageCount ?? preparedPdfPreview.pageCount,
            }
          : pendingFile;

      return sendAttachmentMessage({
        tempIdPrefix: 'temp_file',
        stableKeySuffix: 'file',
        file: pendingFile.file,
        captionText,
        sendFailureToast,
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
          message_type: 'file',
          file_name: pendingFile.fileName,
          file_kind: pendingFile.fileKind,
          file_mime_type: pendingFile.mimeType,
          file_size: pendingFile.file.size,
          file_storage_path: filePath,
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: optimisticReplyToId ?? null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        }),
        onBeforeAppendOptimistic: optimisticMessage => {
          seedLocalPdfPreviewCache(optimisticMessage, resolvedPdfPendingFile);
        },
        uploadAsset: async () => {
          const { path } = await chatSidebarAssetsGateway.uploadAttachment(
            pendingFile.file,
            filePath,
            pendingFile.mimeType || undefined
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
              filePreviewFields = buildReadyImagePreviewFields(previewPath);
            } catch (error) {
              console.error(
                'Error uploading chat document image preview:',
                error
              );
            }
          }

          if (preparedPdfPreview) {
            try {
              const { path: previewPath } =
                await chatSidebarAssetsGateway.uploadPdfPreview(
                  preparedPdfPreview.file,
                  preparedPdfPreview.storagePath
                );

              additionalStoragePaths.push(previewPath);
              filePreviewFields = buildReadyPdfPreviewFields(
                previewPath,
                preparedPdfPreview.pageCount
              );
            } catch (error) {
              console.error('Error uploading chat PDF preview:', error);
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
            message: filePath,
            message_type: 'file',
            reply_to_id: replyToId ?? undefined,
            file_name: pendingFile.fileName,
            file_kind: pendingFile.fileKind,
            file_mime_type: pendingFile.mimeType,
            file_size: pendingFile.file.size,
            file_storage_path: filePath,
            ...filePreviewFields,
          }),
        mapPersistedMessage: (persistedMessage, _uploadedPath, stableKey) =>
          mapPersistedMessageForDisplay(
            {
              ...persistedMessage,
              file_name: pendingFile.fileName,
              file_kind: pendingFile.fileKind,
              file_mime_type: pendingFile.mimeType,
              file_size: pendingFile.file.size,
              file_storage_path: filePath,
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
          if (shouldPersistImagePreview) {
            pendingImagePreviewUrlsRef.current.delete(tempMessageId);
            await syncPersistedImagePreview({
              realMessage: {
                ...realMessage,
                sender_id: user.id,
                file_name: pendingFile.fileName,
                file_mime_type: pendingFile.mimeType,
                file_storage_path: realMessage.file_storage_path || filePath,
              },
              file: pendingFile.file,
            });
          }

          if (!shouldPersistPdfPreview) {
            return;
          }

          seedLocalPdfPreviewCache(realMessage, resolvedPdfPendingFile);
          await syncPersistedPdfPreview({
            realMessage: {
              ...realMessage,
              sender_id: user.id,
              file_name: pendingFile.fileName,
              file_mime_type: pendingFile.mimeType,
              file_storage_path: realMessage.file_storage_path || filePath,
            },
            pendingFile: resolvedPdfPendingFile,
          });
        },
      });
    },
    [
      currentChannelId,
      isImagePendingFile,
      isPdfPendingFile,
      pendingImagePreviewUrlsRef,
      seedLocalPdfPreviewCache,
      sendAttachmentMessage,
      syncPersistedImagePreview,
      syncPersistedPdfPreview,
      targetUser,
      user,
    ]
  );

  const sendComposerAttachment = useCallback(
    async (
      attachment: SendableComposerAttachment,
      captionText?: string,
      replyToId?: string | null
    ): Promise<string | null> => {
      if (attachment.fileKind === 'image') {
        return sendImageMessage(attachment.file, captionText, replyToId);
      }

      return sendFileMessage(
        attachment as PendingComposerFile,
        captionText,
        replyToId
      );
    },
    [sendFileMessage, sendImageMessage]
  );

  return {
    sendComposerAttachment,
  };
};
