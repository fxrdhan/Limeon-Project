import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { type ChatMessage } from '../data/chatSidebarGateway';
import { useChatComposerSend } from './useChatComposerSend';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
  PendingSendRegistration,
} from '../types';
import { useChatMessageTransferActions } from './useChatMessageTransferActions';
import { useChatMutationScope } from './useChatMutationScope';
import { useChatMessageUpdateAction } from './useChatMessageUpdateAction';
import { useChatMessageDeleteAction } from './useChatMessageDeleteAction';
import { useChatMessageForwardAction } from './useChatMessageForwardAction';

type PendingSendRegistryRef = MutableRefObject<
  Map<string, { cancelled: boolean }>
>;

export interface ChatComposerKeyEvent {
  key: string;
  keyCode?: number;
  nativeEvent: {
    isComposing?: boolean;
  };
  preventDefault: () => void;
  shiftKey?: boolean;
}

interface UseChatConversationMutationsProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  editingMessageId: string | null;
  replyingMessageId: string | null;
  rawAttachmentUrl?: string | null;
  setEditingMessageId: Dispatch<SetStateAction<string | null>>;
  setReplyingMessageId: Dispatch<SetStateAction<string | null>>;
  pendingComposerAttachments: PendingComposerAttachment[];
  clearPendingComposerAttachments: () => void;
  restorePendingComposerAttachments: (
    attachments: PendingComposerAttachment[]
  ) => void;
  isComposerAttachmentLoading: boolean;
  closeMessageMenu: () => void;
  focusMessageComposer: () => void;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
}

const createPendingSendRegistration = (
  pendingSendRegistryRef: PendingSendRegistryRef,
  tempMessageId: string
): PendingSendRegistration => {
  const pendingEntry = { cancelled: false };
  pendingSendRegistryRef.current.set(tempMessageId, pendingEntry);

  return {
    complete: () => {
      const currentEntry = pendingSendRegistryRef.current.get(tempMessageId);
      if (currentEntry === pendingEntry) {
        pendingSendRegistryRef.current.delete(tempMessageId);
      }
    },
    isCancelled: () => pendingEntry.cancelled,
  };
};

export const useChatConversationMutations = ({
  user,
  targetUser,
  currentChannelId,
  messages,
  setMessages,
  message,
  setMessage,
  editingMessageId,
  replyingMessageId,
  rawAttachmentUrl = null,
  setEditingMessageId,
  setReplyingMessageId,
  pendingComposerAttachments,
  clearPendingComposerAttachments,
  restorePendingComposerAttachments,
  isComposerAttachmentLoading,
  closeMessageMenu,
  focusMessageComposer,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  pendingImagePreviewUrlsRef,
}: UseChatConversationMutationsProps) => {
  const pendingSendRegistryRef = useRef<Map<string, { cancelled: boolean }>>(
    new Map()
  );
  const scheduledComposerFocusFrameRef = useRef<number | null>(null);
  const scheduledComposerFocusTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const scheduledComposerFocusRequestRef = useRef(0);

  const {
    conversationScopeKey,
    isConversationScopeActive,
    isCurrentConversationScopeActive,
    reconcileCurrentConversationMessages,
    runInCurrentConversationScope,
  } = useChatMutationScope({
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
  });

  const send = useChatComposerSend({
    user,
    targetUser,
    currentChannelId,
    message,
    setMessage,
    editingMessageId,
    replyingMessageId,
    rawAttachmentUrl,
    pendingComposerAttachments,
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    setMessages,
    scheduleScrollMessagesToBottom,
    triggerSendSuccessGlow,
    pendingImagePreviewUrlsRef,
    registerPendingSend: tempMessageId =>
      createPendingSendRegistration(pendingSendRegistryRef, tempMessageId),
    mutationScope: {
      conversationScopeKey,
      isConversationScopeActive,
      isCurrentConversationScopeActive,
      reconcileCurrentConversationMessages,
      runInCurrentConversationScope,
    },
  });
  const {
    handleCopyMessage,
    handleDownloadMessage,
    handleDownloadImageGroup,
    handleDownloadDocumentGroup,
  } = useChatMessageTransferActions({
    closeMessageMenu,
    resetKey: currentChannelId,
  });
  const forward = useChatMessageForwardAction({
    user,
    targetUser,
    messages,
    closeMessageMenu,
    reconcileCurrentConversationMessages,
    resetKey: currentChannelId,
  });

  const { handleUpdateMessage } = useChatMessageUpdateAction({
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
    message,
    setMessage,
    editingMessageId,
    setEditingMessageId,
    closeMessageMenu,
    focusMessageComposer,
    isCurrentConversationScopeActive,
    runInCurrentConversationScope,
  });

  const clearScheduledComposerFocus = useCallback(() => {
    scheduledComposerFocusRequestRef.current += 1;

    if (scheduledComposerFocusFrameRef.current !== null) {
      cancelAnimationFrame(scheduledComposerFocusFrameRef.current);
      scheduledComposerFocusFrameRef.current = null;
    }

    if (scheduledComposerFocusTimerRef.current !== null) {
      clearTimeout(scheduledComposerFocusTimerRef.current);
      scheduledComposerFocusTimerRef.current = null;
    }
  }, []);

  const scheduleComposerFocus = useCallback(
    (includeDelayedRetry = false) => {
      clearScheduledComposerFocus();

      const focusRequestId = scheduledComposerFocusRequestRef.current + 1;
      let didRunSynchronously = false;
      scheduledComposerFocusRequestRef.current = focusRequestId;

      const frameId = requestAnimationFrame(() => {
        didRunSynchronously = true;

        if (scheduledComposerFocusRequestRef.current !== focusRequestId) {
          return;
        }

        scheduledComposerFocusFrameRef.current = null;
        focusMessageComposer();
      });

      if (!didRunSynchronously) {
        scheduledComposerFocusFrameRef.current = frameId;
      }

      if (!includeDelayedRetry) {
        return;
      }

      scheduledComposerFocusTimerRef.current = setTimeout(() => {
        if (scheduledComposerFocusRequestRef.current !== focusRequestId) {
          return;
        }

        scheduledComposerFocusTimerRef.current = null;
        focusMessageComposer();
      }, 60);
    },
    [clearScheduledComposerFocus, focusMessageComposer]
  );

  useEffect(() => {
    clearScheduledComposerFocus();
  }, [clearScheduledComposerFocus, currentChannelId]);

  useEffect(
    () => () => {
      clearScheduledComposerFocus();
    },
    [clearScheduledComposerFocus]
  );

  const { handleDeleteMessage, handleDeleteMessages } =
    useChatMessageDeleteAction({
      user,
      targetUser,
      currentChannelId,
      messages,
      setMessages,
      editingMessageId,
      setEditingMessageId,
      setMessage,
      closeMessageMenu,
      pendingSendRegistryRef,
      reconcileCurrentConversationMessages,
      isCurrentConversationScopeActive,
    });

  const handleEditMessage = useCallback(
    (targetMessage: ChatMessage) => {
      if (
        pendingComposerAttachments.length > 0 ||
        isComposerAttachmentLoading
      ) {
        closeMessageMenu();
        toast.error(
          'Selesaikan atau hapus lampiran draft sebelum mengedit pesan',
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return;
      }

      if (targetMessage.id.startsWith('temp_')) {
        closeMessageMenu();
        toast.error('Pesan yang masih dikirim belum bisa diedit', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      setEditingMessageId(targetMessage.id);
      setReplyingMessageId(null);
      setMessage(targetMessage.message);
      closeMessageMenu();
      scheduleComposerFocus(true);
    },
    [
      closeMessageMenu,
      isComposerAttachmentLoading,
      pendingComposerAttachments.length,
      scheduleComposerFocus,
      setEditingMessageId,
      setReplyingMessageId,
      setMessage,
    ]
  );

  const handleReplyMessage = useCallback(
    (targetMessage: ChatMessage) => {
      setReplyingMessageId(targetMessage.id);

      if (editingMessageId) {
        setEditingMessageId(null);
        setMessage('');
      }

      closeMessageMenu();
      scheduleComposerFocus(true);
    },
    [
      closeMessageMenu,
      editingMessageId,
      scheduleComposerFocus,
      setEditingMessageId,
      setMessage,
      setReplyingMessageId,
    ]
  );

  const handleCancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setMessage('');
    closeMessageMenu();
    scheduleComposerFocus();
  }, [
    closeMessageMenu,
    scheduleComposerFocus,
    setEditingMessageId,
    setMessage,
  ]);

  const handleCancelReplyMessage = useCallback(() => {
    setReplyingMessageId(null);
    closeMessageMenu();
    scheduleComposerFocus();
  }, [closeMessageMenu, scheduleComposerFocus, setReplyingMessageId]);

  const handleSendMessage = useCallback(async () => {
    if (isComposerAttachmentLoading) {
      return;
    }

    if (editingMessageId) {
      await handleUpdateMessage();
      return;
    }

    const didSend = await send.handleSendMessage();
    if (didSend) {
      setReplyingMessageId(null);
    }
  }, [
    setReplyingMessageId,
    editingMessageId,
    handleUpdateMessage,
    isComposerAttachmentLoading,
    send,
  ]);

  const handleKeyPress = useCallback(
    (event: ChatComposerKeyEvent) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (isComposerAttachmentLoading) {
          return;
        }
        void handleSendMessage();
      }
    },
    [handleSendMessage, isComposerAttachmentLoading]
  );

  return {
    handleEditMessage,
    handleReplyMessage,
    handleDeleteMessage,
    handleDeleteMessages,
    handleCancelEditMessage,
    handleCancelReplyMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleDownloadImageGroup,
    handleDownloadDocumentGroup,
    handleOpenForwardMessagePicker: forward.openForwardPicker,
    isForwardPickerOpen: forward.isForwardPickerOpen,
    forwardTargetMessage: forward.forwardTargetMessage,
    forwardCaptionMessage: forward.forwardCaptionMessage,
    availableForwardRecipients: forward.availableForwardRecipients,
    selectedForwardRecipientIds: forward.selectedForwardRecipientIds,
    isForwardDirectoryLoading: forward.isForwardDirectoryLoading,
    forwardDirectoryError: forward.forwardDirectoryError,
    hasMoreForwardDirectoryUsers: forward.hasMoreForwardDirectoryUsers,
    isSubmittingForwardMessage: forward.isSubmittingForwardMessage,
    handleCloseForwardMessagePicker: forward.closeForwardPicker,
    handleToggleForwardRecipient: forward.toggleForwardRecipient,
    handleRetryLoadForwardDirectory: forward.retryLoadForwardDirectory,
    handleLoadMoreForwardDirectoryUsers: forward.loadMoreForwardDirectoryUsers,
    handleSubmitForwardMessage: forward.submitForwardMessage,
    handleSendMessage,
    handleKeyPress,
  };
};
