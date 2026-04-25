import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { CHAT_SIDEBAR_TOASTER_ID } from "../constants";
import { type ChatMessage } from "../data/chatSidebarGateway";
import {
  type AttachmentComposerRemoteFile,
  extractAttachmentComposerLinkFromMessageText,
  fetchAttachmentComposerRemoteFile,
} from "../utils/composer-attachment-link";
import { buildPendingFileComposerAttachment } from "../utils/pending-composer-attachment";
import { clearPersistedComposerDraftAttachments } from "../utils/composer-draft-persistence";
import {
  appendOptimisticAttachmentThread,
  createOptimisticAttachmentThread,
} from "../utils/attachment-send";
import {
  useChatAttachmentSend,
  type PreparedComposerAttachmentOptimisticState,
  type SendableComposerAttachment,
} from "./useChatAttachmentSend";
import { sendTextChatMessage } from "../utils/text-message-send";
import type {
  ChatSidebarPanelTargetUser,
  PendingSendRegistration,
  PendingComposerAttachment,
} from "../types";

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
  replyingMessageId?: string | null;
  rawAttachmentUrl: string | null;
  pendingComposerAttachments: PendingComposerAttachment[];
  clearPendingComposerAttachments: () => void;
  restorePendingComposerAttachments: (attachments: PendingComposerAttachment[]) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  registerPendingSend: (tempMessageId: string) => PendingSendRegistration;
  mutationScope: ChatComposerSendMutationScope;
}

const buildRemoteComposerAttachment = (
  attachmentRemoteFile: AttachmentComposerRemoteFile,
): SendableComposerAttachment => {
  if (attachmentRemoteFile.fileKind === "image") {
    return attachmentRemoteFile;
  }

  const pendingAttachment = buildPendingFileComposerAttachment(
    attachmentRemoteFile.file,
    "document",
  );

  return {
    file: pendingAttachment.file,
    fileName: pendingAttachment.fileName,
    fileTypeLabel: pendingAttachment.fileTypeLabel,
    fileKind: "document" as const,
    mimeType: pendingAttachment.mimeType,
    pdfCoverUrl: pendingAttachment.pdfCoverUrl,
    pdfPageCount: pendingAttachment.pdfPageCount,
  };
};

const buildPendingAttachmentSendPlan = (
  attachments: PendingComposerAttachment[],
  messageText: string,
) => {
  const shouldAttachCaption = attachments.length > 0 && messageText.trim().length > 0;
  const lastAttachmentIndex = attachments.length - 1;

  return {
    shouldAttachCaption,
    jobs: attachments.map((attachment, attachmentIndex) => ({
      attachment,
      captionText:
        shouldAttachCaption && attachmentIndex === lastAttachmentIndex ? messageText : undefined,
    })),
  };
};

const shouldPreappendBulkImageOptimisticBatch = (attachments: PendingComposerAttachment[]) =>
  attachments.length > 1 && attachments.every((attachment) => attachment.fileKind === "image");

export const useChatComposerSend = ({
  user,
  targetUser,
  currentChannelId,
  message,
  setMessage,
  editingMessageId,
  replyingMessageId = null,
  rawAttachmentUrl,
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
  const { sendComposerAttachment } = useChatAttachmentSend({
    user,
    targetUser,
    currentChannelId,
    editingMessageId,
    replyingMessageId,
    setMessages,
    scheduleScrollMessagesToBottom,
    triggerSendSuccessGlow,
    pendingImagePreviewUrlsRef,
    registerPendingSend,
    mutationScope,
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
    ],
  );

  const sendAttachmentMessage = useCallback(
    async (attachmentLink: string, originalMessageText: string, replyToId?: string | null) => {
      setMessage("");

      try {
        const attachmentRemoteFile = await fetchAttachmentComposerRemoteFile(attachmentLink);
        if (!attachmentRemoteFile) {
          if (isCurrentConversationScopeActive()) {
            setMessage((currentMessage) =>
              currentMessage.length === 0 ? originalMessageText : currentMessage,
            );
            toast.error("Link harus mengarah ke gambar atau PDF yang valid", {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
          return false;
        }

        const didSend = await sendComposerAttachment(
          buildRemoteComposerAttachment(attachmentRemoteFile),
          undefined,
          replyToId,
        );

        if (!didSend && isCurrentConversationScopeActive()) {
          setMessage((currentMessage) =>
            currentMessage.length === 0 ? originalMessageText : currentMessage,
          );
        }

        return Boolean(didSend);
      } catch (error) {
        console.error("Error sending attachment composer link:", error);
        if (isCurrentConversationScopeActive()) {
          setMessage((currentMessage) =>
            currentMessage.length === 0 ? originalMessageText : currentMessage,
          );
          toast.error("Gagal mengambil file dari link", {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
        return false;
      }
    },
    [isCurrentConversationScopeActive, sendComposerAttachment, setMessage],
  );

  const sendPendingComposerAttachments = useCallback(
    async (
      attachmentsToSend: PendingComposerAttachment[],
      messageText: string,
      replyToId?: string | null,
    ) => {
      const sendPlan = buildPendingAttachmentSendPlan(attachmentsToSend, messageText);

      if (sendPlan.shouldAttachCaption) {
        setMessage("");
      }

      clearPendingComposerAttachments();

      const optimisticAttachmentStateById = new Map<
        string,
        PreparedComposerAttachmentOptimisticState
      >();

      if (
        user &&
        targetUser &&
        currentChannelId &&
        shouldPreappendBulkImageOptimisticBatch(attachmentsToSend)
      ) {
        const baseTimestamp = Date.now();
        let optimisticMessagesBatch: ChatMessage[] | null = null;

        sendPlan.jobs.forEach(({ attachment, captionText }, attachmentIndex) => {
          const localPreviewUrl = URL.createObjectURL(attachment.file);
          const timestamp = new Date(baseTimestamp + attachmentIndex).toISOString();
          const optimisticThread = createOptimisticAttachmentThread({
            tempIdPrefix: "temp_image",
            stableKeySuffix: "image",
            captionText,
            currentChannelId,
            localPreviewUrl,
            timestamp,
            user,
            targetUser,
            replyToId,
            buildOptimisticMessage: ({
              tempId,
              stableKey,
              localPreviewUrl: optimisticPreviewUrl,
              timestamp: optimisticTimestamp,
              replyToId: optimisticReplyToId,
            }) => ({
              id: tempId,
              sender_id: user.id,
              receiver_id: targetUser.id,
              channel_id: currentChannelId,
              message: optimisticPreviewUrl,
              message_type: "image",
              created_at: optimisticTimestamp,
              updated_at: optimisticTimestamp,
              is_read: false,
              reply_to_id: optimisticReplyToId ?? null,
              sender_name: user.name || "You",
              receiver_name: targetUser.name || "Unknown",
              stableKey,
            }),
          });

          optimisticAttachmentStateById.set(attachment.id, {
            appendBeforeSend: false,
            localPreviewUrl,
            thread: optimisticThread,
          });

          optimisticMessagesBatch = appendOptimisticAttachmentThread(
            optimisticMessagesBatch ?? [],
            optimisticThread,
          );
        });

        if (optimisticMessagesBatch) {
          const nextOptimisticMessagesBatch = optimisticMessagesBatch;

          setMessages((previousMessages) => [...previousMessages, ...nextOptimisticMessagesBatch]);
          triggerSendSuccessGlow();
          scheduleScrollMessagesToBottom();
        }
      }

      const attachmentResults: Array<{
        pendingAttachment: PendingComposerAttachment;
        sentAttachmentMessageId: string | null;
      }> = [];

      for (const { attachment, captionText } of sendPlan.jobs) {
        attachmentResults.push({
          pendingAttachment: attachment,
          sentAttachmentMessageId: await sendComposerAttachment(
            attachment,
            captionText,
            replyToId,
            {
              optimistic: optimisticAttachmentStateById.get(attachment.id),
            },
          ),
        });
      }
      const failedAttachments = attachmentResults
        .filter((attachmentResult) => !attachmentResult.sentAttachmentMessageId)
        .map((attachmentResult) => attachmentResult.pendingAttachment);

      if (failedAttachments.length > 0) {
        if (isCurrentConversationScopeActive()) {
          restorePendingComposerAttachments(failedAttachments);
        }

        const didCaptionAttachmentFail =
          sendPlan.shouldAttachCaption &&
          !attachmentResults[attachmentResults.length - 1]?.sentAttachmentMessageId;

        if (didCaptionAttachmentFail && isCurrentConversationScopeActive()) {
          setMessage(messageText);
        }

        return {
          didSendAllAttachments: false,
          shouldAttachCaption: sendPlan.shouldAttachCaption,
        };
      }

      await clearPersistedComposerDraftAttachments(currentChannelId, user?.id);

      return {
        didSendAllAttachments: true,
        shouldAttachCaption: sendPlan.shouldAttachCaption,
      };
    },
    [
      clearPendingComposerAttachments,
      currentChannelId,
      isCurrentConversationScopeActive,
      restorePendingComposerAttachments,
      sendComposerAttachment,
      scheduleScrollMessagesToBottom,
      setMessages,
      setMessage,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ],
  );

  const handleSendMessage = useCallback(async () => {
    if (editingMessageId || isSendingRef.current) {
      return false;
    }
    if (!user || !targetUser || !currentChannelId) {
      return false;
    }

    const hasPendingAttachments = pendingComposerAttachments.length > 0;
    const attachmentsToSend = [...pendingComposerAttachments];
    const messageText = message.trim();
    const attachmentLink =
      hasPendingAttachments ||
      ((rawAttachmentUrl?.trim().length ?? 0) > 0 && rawAttachmentUrl?.trim() === messageText)
        ? null
        : extractAttachmentComposerLinkFromMessageText(messageText);

    if (!hasPendingAttachments && !messageText) {
      return false;
    }

    isSendingRef.current = true;

    try {
      if (attachmentLink) {
        return (
          (await sendAttachmentMessage(attachmentLink.url, messageText, replyingMessageId)) !==
          false
        );
      }

      if (hasPendingAttachments) {
        const attachmentSendResult = await sendPendingComposerAttachments(
          attachmentsToSend,
          messageText,
          replyingMessageId,
        );

        if (!attachmentSendResult.didSendAllAttachments) {
          return false;
        }

        if (attachmentSendResult.shouldAttachCaption) {
          return true;
        }
      }

      if (messageText) {
        return await sendTextMessage(messageText, replyingMessageId);
      }

      return true;
    } finally {
      isSendingRef.current = false;
    }
  }, [
    currentChannelId,
    editingMessageId,
    message,
    pendingComposerAttachments,
    replyingMessageId,
    rawAttachmentUrl,
    sendAttachmentMessage,
    sendPendingComposerAttachments,
    sendTextMessage,
    targetUser,
    user,
  ]);

  return {
    handleSendMessage,
  };
};
