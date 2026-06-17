import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarForwardGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { useChatDirectoryRoster } from './useChatDirectoryRoster';

interface ForwardMessageDraft {
  message: ChatMessage;
  captionMessage: ChatMessage | null;
}

interface UseChatMessageForwardActionProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  messages: ChatMessage[];
  closeMessageMenu: () => void;
  reconcileCurrentConversationMessages: () => Promise<void>;
  resetKey?: string | null;
}

const buildAttachmentCaptionSnapshot = (
  messages: ChatMessage[],
  targetMessage: ChatMessage
) =>
  messages.find(
    messageItem =>
      messageItem.reply_to_id === targetMessage.id &&
      messageItem.message_relation_kind === 'attachment_caption'
  ) ?? null;

export const useChatMessageForwardAction = ({
  user,
  targetUser,
  messages,
  closeMessageMenu,
  reconcileCurrentConversationMessages,
  resetKey = null,
}: UseChatMessageForwardActionProps) => {
  const [forwardDraft, setForwardDraft] = useState<ForwardMessageDraft | null>(
    null
  );
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedResetKey = resetKey?.trim() || null;
  const activeForwardResetKeyRef = useRef<string | null>(normalizedResetKey);
  const forwardScopeVersionRef = useRef(0);
  const isForwardScopeMountedRef = useRef(true);
  const {
    portalOrderedUsers,
    isDirectoryLoading,
    directoryError,
    hasMoreDirectoryUsers,
    retryLoadDirectory,
    loadMoreDirectoryUsers,
  } = useChatDirectoryRoster(Boolean(forwardDraft));

  const availableRecipients = useMemo(
    () => portalOrderedUsers.filter(portalUser => portalUser.id !== user?.id),
    [portalOrderedUsers, user?.id]
  );

  const resetForwardState = useCallback(() => {
    forwardScopeVersionRef.current += 1;
    setForwardDraft(null);
    setSelectedRecipientIds(new Set());
    setIsSubmitting(false);
  }, []);

  const isForwardScopeActive = useCallback(
    (scopeVersion: number) =>
      isForwardScopeMountedRef.current &&
      forwardScopeVersionRef.current === scopeVersion,
    []
  );

  useEffect(() => {
    const previousResetKey = activeForwardResetKeyRef.current;
    activeForwardResetKeyRef.current = normalizedResetKey;

    if (previousResetKey !== normalizedResetKey) {
      resetForwardState();
    }
  }, [normalizedResetKey, resetForwardState]);

  useEffect(
    () => () => {
      isForwardScopeMountedRef.current = false;
      forwardScopeVersionRef.current += 1;
    },
    []
  );

  const closeForwardPicker = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setForwardDraft(null);
    setSelectedRecipientIds(new Set());
  }, [isSubmitting]);

  const openForwardPicker = useCallback(
    (targetMessage: ChatMessage) => {
      closeMessageMenu();
      forwardScopeVersionRef.current += 1;

      setForwardDraft({
        message: targetMessage,
        captionMessage: buildAttachmentCaptionSnapshot(messages, targetMessage),
      });
      setSelectedRecipientIds(new Set());
    },
    [closeMessageMenu, messages]
  );

  const toggleForwardRecipient = useCallback((recipientId: string) => {
    setSelectedRecipientIds(previousRecipientIds => {
      const nextRecipientIds = new Set(previousRecipientIds);
      if (nextRecipientIds.has(recipientId)) {
        nextRecipientIds.delete(recipientId);
      } else {
        nextRecipientIds.add(recipientId);
      }

      return nextRecipientIds;
    });
  }, []);

  const submitForwardMessage = useCallback(async () => {
    if (!forwardDraft || !user) {
      return;
    }

    const recipientIds = [...selectedRecipientIds];
    if (recipientIds.length === 0) {
      toast.error('Pilih minimal satu penerima', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    setIsSubmitting(true);
    const submitScopeVersion = forwardScopeVersionRef.current;

    const recipientsToSend = availableRecipients.filter(recipient =>
      selectedRecipientIds.has(recipient.id)
    );
    const successfulRecipientIds: string[] = [];
    const failedRecipientIds: string[] = [];

    try {
      const { data, error } = await chatSidebarForwardGateway.forwardMessage({
        messageId: forwardDraft.message.id,
        recipientIds: recipientsToSend.map(recipient => recipient.id),
      });

      if (!isForwardScopeActive(submitScopeVersion)) {
        return;
      }

      if (error || !data) {
        console.error('Failed to forward chat message', {
          error,
          messageId: forwardDraft.message.id,
          recipientIds,
        });
        toast.error('Gagal meneruskan pesan', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      successfulRecipientIds.push(...data.forwardedRecipientIds);
      failedRecipientIds.push(...data.failedRecipientIds);

      if (targetUser?.id && successfulRecipientIds.includes(targetUser.id)) {
        try {
          await reconcileCurrentConversationMessages();
        } catch (error) {
          if (!isForwardScopeActive(submitScopeVersion)) {
            return;
          }

          console.error(
            'Failed to reconcile current conversation after forwarding chat message',
            {
              error,
              messageId: forwardDraft.message.id,
              targetUserId: targetUser.id,
            }
          );
        }
      }

      if (!isForwardScopeActive(submitScopeVersion)) {
        return;
      }

      if (
        successfulRecipientIds.length > 0 &&
        failedRecipientIds.length === 0
      ) {
        toast.success(
          successfulRecipientIds.length === 1
            ? 'Pesan berhasil diteruskan'
            : `Pesan berhasil diteruskan ke ${successfulRecipientIds.length} pengguna`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        setForwardDraft(null);
        setSelectedRecipientIds(new Set());
        return;
      }

      if (successfulRecipientIds.length > 0) {
        toast.error(
          `${successfulRecipientIds.length} forward berhasil, ${failedRecipientIds.length} gagal`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        setSelectedRecipientIds(new Set(failedRecipientIds));
        return;
      }

      toast.error('Gagal meneruskan pesan', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    } catch (error) {
      if (!isForwardScopeActive(submitScopeVersion)) {
        return;
      }

      console.error('Unexpected error while forwarding chat message', {
        error,
        messageId: forwardDraft.message.id,
        recipientIds,
      });
      toast.error('Gagal meneruskan pesan', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    } finally {
      if (isForwardScopeActive(submitScopeVersion)) {
        setIsSubmitting(false);
      }
    }
  }, [
    availableRecipients,
    forwardDraft,
    isForwardScopeActive,
    reconcileCurrentConversationMessages,
    selectedRecipientIds,
    targetUser?.id,
    user,
  ]);

  return {
    isForwardPickerOpen: forwardDraft !== null,
    forwardTargetMessage: forwardDraft?.message ?? null,
    forwardCaptionMessage: forwardDraft?.captionMessage ?? null,
    availableForwardRecipients: availableRecipients,
    selectedForwardRecipientIds: selectedRecipientIds,
    isForwardDirectoryLoading: isDirectoryLoading,
    forwardDirectoryError: directoryError,
    hasMoreForwardDirectoryUsers: hasMoreDirectoryUsers,
    isSubmittingForwardMessage: isSubmitting,
    openForwardPicker,
    closeForwardPicker,
    toggleForwardRecipient,
    retryLoadForwardDirectory: retryLoadDirectory,
    loadMoreForwardDirectoryUsers: loadMoreDirectoryUsers,
    submitForwardMessage,
  };
};
