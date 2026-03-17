import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { type ChatMessage } from '../data/chatSidebarGateway';
import {
  extractEmbeddedComposerLinkFromMessageText,
  fetchEmbeddedComposerRemoteFile,
} from '../utils/composer-embedded-link';
import { buildPendingFileComposerAttachment } from '../utils/pending-composer-attachment';
import { useChatAttachmentSend } from './useChatAttachmentSend';
import { useChatPdfPreviewSync } from './useChatPdfPreviewSync';
import { sendTextChatMessage } from '../utils/text-message-send';
import type {
  ChatSidebarPanelTargetUser,
  PendingSendRegistration,
  PendingComposerAttachment,
} from '../types';

interface ChatComposerSendMutationScope {
  conversationScopeKey: string | null;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
  isCurrentConversationScopeActive: () => boolean;
  reconcileCurrentConversationMessages: (options?: {
    fallbackMessages?: ChatMessage[];
  }) => Promise<void>;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

interface UseChatComposerSendProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  editingMessageId: string | null;
  pendingComposerAttachments: PendingComposerAttachment[];
  clearPendingComposerAttachments: () => void;
  restorePendingComposerAttachments: (
    attachments: PendingComposerAttachment[]
  ) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  registerPendingSend: (tempMessageId: string) => PendingSendRegistration;
  mutationScope: ChatComposerSendMutationScope;
}

export const useChatComposerSend = ({
  user,
  targetUser,
  currentChannelId,
  message,
  setMessage,
  editingMessageId,
  pendingComposerAttachments,
  clearPendingComposerAttachments,
  restorePendingComposerAttachments,
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  pendingImagePreviewUrlsRef,
  registerPendingSend,
  mutationScope,
}: UseChatComposerSendProps) => {
  const isSendingRef = useRef(false);
  const {
    isCurrentConversationScopeActive,
    reconcileCurrentConversationMessages,
    runInCurrentConversationScope,
  } = mutationScope;
  const { isPdfPendingFile, syncPersistedPdfPreview } = useChatPdfPreviewSync({
    setMessages,
    isCurrentConversationScopeActive,
    runInCurrentConversationScope,
  });
  const { sendImageMessage, sendFileMessage } = useChatAttachmentSend({
    user,
    targetUser,
    currentChannelId,
    editingMessageId,
    setMessages,
    scheduleScrollMessagesToBottom,
    triggerSendSuccessGlow,
    pendingImagePreviewUrlsRef,
    registerPendingSend,
    mutationScope,
    isPdfPendingFile,
    syncPersistedPdfPreview,
  });

  const sendTextMessage = useCallback(
    async (messageText: string, replyToId?: string | null) => {
      if (!user || !targetUser || !currentChannelId) {
        return false;
      }

      return sendTextChatMessage({
        user,
        targetUser,
        currentChannelId,
        messageText,
        replyToId,
        setMessage,
        setMessages,
        scheduleScrollMessagesToBottom,
        triggerSendSuccessGlow,
        registerPendingSend,
        isCurrentConversationScopeActive,
        runInCurrentConversationScope,
        reconcileCurrentConversationMessages,
      });
    },
    [
      currentChannelId,
      isCurrentConversationScopeActive,
      reconcileCurrentConversationMessages,
      registerPendingSend,
      runInCurrentConversationScope,
      scheduleScrollMessagesToBottom,
      setMessage,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  const sendEmbeddedLinkMessage = useCallback(
    async (embeddedLink: string, originalMessageText: string) => {
      setMessage('');

      try {
        const embeddedRemoteFile =
          await fetchEmbeddedComposerRemoteFile(embeddedLink);
        if (!embeddedRemoteFile) {
          if (isCurrentConversationScopeActive()) {
            setMessage(currentMessage =>
              currentMessage.length === 0 ? originalMessageText : currentMessage
            );
            toast.error('Link harus mengarah ke gambar atau PDF yang valid', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
          return false;
        }

        const didSend =
          embeddedRemoteFile.fileKind === 'image'
            ? await sendImageMessage(embeddedRemoteFile.file)
            : await sendFileMessage(
                (() => {
                  const pendingAttachment = buildPendingFileComposerAttachment(
                    embeddedRemoteFile.file,
                    'document'
                  );

                  return {
                    file: pendingAttachment.file,
                    fileName: pendingAttachment.fileName,
                    fileTypeLabel: pendingAttachment.fileTypeLabel,
                    fileKind: 'document' as const,
                    mimeType: pendingAttachment.mimeType,
                  };
                })()
              );

        if (!didSend && isCurrentConversationScopeActive()) {
          setMessage(currentMessage =>
            currentMessage.length === 0 ? originalMessageText : currentMessage
          );
        }

        return Boolean(didSend);
      } catch (error) {
        console.error('Error sending embedded composer link:', error);
        if (isCurrentConversationScopeActive()) {
          setMessage(currentMessage =>
            currentMessage.length === 0 ? originalMessageText : currentMessage
          );
          toast.error('Gagal mengambil file dari link', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
        return false;
      }
    },
    [
      isCurrentConversationScopeActive,
      sendFileMessage,
      sendImageMessage,
      setMessage,
    ]
  );

  const handleSendMessage = useCallback(async () => {
    if (editingMessageId || isSendingRef.current) {
      return;
    }
    if (!user || !targetUser || !currentChannelId) {
      return;
    }

    const hasPendingAttachments = pendingComposerAttachments.length > 0;
    const attachmentsToSend = [...pendingComposerAttachments];
    const messageText = message.trim();
    const embeddedLink = hasPendingAttachments
      ? null
      : extractEmbeddedComposerLinkFromMessageText(messageText);

    if (!hasPendingAttachments && !messageText) {
      return;
    }

    isSendingRef.current = true;

    try {
      if (embeddedLink) {
        await sendEmbeddedLinkMessage(embeddedLink.url, messageText);
        return;
      }

      const shouldAttachCaption =
        hasPendingAttachments && messageText.length > 0;

      if (shouldAttachCaption) {
        setMessage('');
      }

      if (hasPendingAttachments) {
        clearPendingComposerAttachments();
      }

      const lastAttachmentIndex = attachmentsToSend.length - 1;

      for (const [
        attachmentIndex,
        pendingAttachment,
      ] of attachmentsToSend.entries()) {
        const captionForAttachment =
          shouldAttachCaption && attachmentIndex === lastAttachmentIndex
            ? messageText
            : undefined;
        const sentAttachmentMessageId =
          pendingAttachment.fileKind === 'image'
            ? await sendImageMessage(
                pendingAttachment.file,
                captionForAttachment
              )
            : await sendFileMessage(
                {
                  file: pendingAttachment.file,
                  fileName: pendingAttachment.fileName,
                  fileTypeLabel: pendingAttachment.fileTypeLabel,
                  fileKind: pendingAttachment.fileKind,
                  mimeType: pendingAttachment.mimeType,
                },
                captionForAttachment
              );

        if (!sentAttachmentMessageId) {
          if (isCurrentConversationScopeActive()) {
            restorePendingComposerAttachments(
              attachmentsToSend.slice(attachmentIndex)
            );
          }

          if (shouldAttachCaption && isCurrentConversationScopeActive()) {
            setMessage(messageText);
          }

          return;
        }
      }

      if (messageText && !shouldAttachCaption) {
        await sendTextMessage(messageText);
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [
    clearPendingComposerAttachments,
    currentChannelId,
    editingMessageId,
    isCurrentConversationScopeActive,
    message,
    pendingComposerAttachments,
    restorePendingComposerAttachments,
    sendEmbeddedLinkMessage,
    sendFileMessage,
    sendImageMessage,
    sendTextMessage,
    setMessage,
    targetUser,
    user,
  ]);

  return {
    handleSendMessage,
  };
};
