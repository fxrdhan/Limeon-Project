import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
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

type PendingSendRegistryRef = MutableRefObject<
  Map<string, { cancelled: boolean }>
>;

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
  setEditingMessageId: Dispatch<SetStateAction<string | null>>;
  pendingComposerAttachments: PendingComposerAttachment[];
  clearPendingComposerAttachments: () => void;
  restorePendingComposerAttachments: (
    attachments: PendingComposerAttachment[]
  ) => void;
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
  setEditingMessageId,
  pendingComposerAttachments,
  clearPendingComposerAttachments,
  restorePendingComposerAttachments,
  closeMessageMenu,
  focusMessageComposer,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  pendingImagePreviewUrlsRef,
}: UseChatConversationMutationsProps) => {
  const pendingSendRegistryRef = useRef<Map<string, { cancelled: boolean }>>(
    new Map()
  );

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
  const { handleCopyMessage, handleDownloadMessage } =
    useChatMessageTransferActions({
      closeMessageMenu,
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
      if (pendingComposerAttachments.length > 0) {
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
      setMessage(targetMessage.message);
      closeMessageMenu();
      requestAnimationFrame(focusMessageComposer);
      setTimeout(focusMessageComposer, 60);
    },
    [
      closeMessageMenu,
      focusMessageComposer,
      pendingComposerAttachments.length,
      setEditingMessageId,
      setMessage,
    ]
  );

  const handleCancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setMessage('');
    closeMessageMenu();
    requestAnimationFrame(focusMessageComposer);
  }, [closeMessageMenu, focusMessageComposer, setEditingMessageId, setMessage]);

  const handleSendMessage = useCallback(async () => {
    if (editingMessageId) {
      await handleUpdateMessage();
      return;
    }

    await send.handleSendMessage();
  }, [editingMessageId, handleUpdateMessage, send]);

  const handleKeyPress = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  return {
    handleEditMessage,
    handleDeleteMessage,
    handleDeleteMessages,
    handleCancelEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleSendMessage,
    handleKeyPress,
  };
};
