import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useRef } from 'react';
import { type ChatMessage } from '../data/chatSidebarGateway';
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

    if (!hasPendingAttachments && !messageText) {
      return;
    }

    isSendingRef.current = true;

    try {
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
