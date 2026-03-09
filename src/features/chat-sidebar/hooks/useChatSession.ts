import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import type { UserDetails } from '@/types/database';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { CHAT_CONVERSATION_PAGE_SIZE } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { setConversationCacheEntry } from '../utils/conversation-cache';
import { mapConversationMessageForDisplay } from '../utils/conversation-sync';
import { useChatConversationRuntime } from './useChatConversationRuntime';
import { useChatSessionPresence } from './useChatSessionPresence';
import { useChatSessionReceipts } from './useChatSessionReceipts';

interface UseChatSessionProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
}

export const useChatSession = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
}: UseChatSessionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(
    null
  );
  const [retryInitialLoadTick, setRetryInitialLoadTick] = useState(0);
  const conversationChannelRef = useRef<ReturnType<
    typeof chatSidebarGateway.createRealtimeChannel
  > | null>(null);
  const hasCompletedInitialOpenLoadRef = useRef(false);
  const activeSessionTokenRef = useRef(0);
  const oldestLoadedMessageCreatedAtRef = useRef<string | null>(null);
  const isInitialConversationLoadPendingRef = useRef(false);
  const pendingConversationRealtimeEventsRef = useRef<
    Array<
      | { type: 'insert'; message: ChatMessage }
      | { type: 'update'; message: Partial<ChatMessage> & { id: string } }
      | { type: 'delete'; messageId: string }
    >
  >([]);
  const {
    recoveryTick: realtimeRecoveryTick,
    scheduleRecovery: scheduleConversationRecovery,
    markRecoverySuccess: markConversationRecoverySuccess,
  } = useRealtimeChannelRecovery();

  const isSessionTokenActive = useCallback(
    (sessionToken: number) => activeSessionTokenRef.current === sessionToken,
    []
  );

  const applyMessageUpdate = useCallback(
    (updatedMessage: Partial<ChatMessage> & { id: string }) => {
      setMessages(previousMessages =>
        previousMessages.map(previousMessage =>
          previousMessage.id === updatedMessage.id
            ? {
                ...previousMessage,
                ...updatedMessage,
                stableKey: previousMessage.stableKey,
              }
            : previousMessage
        )
      );
    },
    []
  );

  const { targetUserPresence, targetUserPresenceError } =
    useChatSessionPresence({
      isOpen,
      user,
      targetUser,
      currentChannelId,
    });

  const { markMessageIdsAsDelivered, markMessageIdsAsRead } =
    useChatSessionReceipts({
      applyMessageUpdate,
      isSessionTokenActive,
      receiptScopeResetKey:
        isOpen && user && targetUser && currentChannelId
          ? [
              user.id,
              targetUser.id,
              currentChannelId,
              retryInitialLoadTick,
              realtimeRecoveryTick,
            ].join('::')
          : null,
    });

  const loadOlderMessages = useCallback(async () => {
    if (
      !isOpen ||
      !user ||
      !targetUser ||
      !currentChannelId ||
      !hasOlderMessages ||
      isLoadingOlderMessages ||
      !oldestLoadedMessageCreatedAtRef.current
    ) {
      return;
    }

    setIsLoadingOlderMessages(true);
    setOlderMessagesError(null);

    try {
      const { data: olderMessagesPage, error } =
        await chatSidebarGateway.fetchConversationMessages(
          user.id,
          targetUser.id,
          currentChannelId,
          {
            beforeCreatedAt: oldestLoadedMessageCreatedAtRef.current,
            limit: CHAT_CONVERSATION_PAGE_SIZE,
          }
        );

      const olderMessagesPayload = Array.isArray(olderMessagesPage)
        ? {
            messages: olderMessagesPage,
            hasMore: false,
          }
        : olderMessagesPage;

      if (error || !olderMessagesPayload?.messages) {
        if (error) {
          console.error('Error loading older messages:', error);
        }
        setOlderMessagesError('Gagal memuat pesan lama');
        return;
      }

      const olderMessages = olderMessagesPayload.messages.map(messageItem =>
        mapConversationMessageForDisplay(
          messageItem,
          user,
          targetUser,
          messageItem.stableKey || messageItem.id
        )
      );

      setMessages(previousMessages => {
        const seenMessageIds = new Set(previousMessages.map(({ id }) => id));
        const uniqueOlderMessages = olderMessages.filter(
          messageItem => !seenMessageIds.has(messageItem.id)
        );

        return uniqueOlderMessages.length > 0
          ? [...uniqueOlderMessages, ...previousMessages]
          : previousMessages;
      });

      oldestLoadedMessageCreatedAtRef.current =
        olderMessages[0]?.created_at ?? oldestLoadedMessageCreatedAtRef.current;
      setHasOlderMessages(olderMessagesPayload.hasMore);
      setOlderMessagesError(null);
    } catch (error) {
      console.error('Error loading older messages:', error);
      setOlderMessagesError('Gagal memuat pesan lama');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [
    currentChannelId,
    hasOlderMessages,
    isLoadingOlderMessages,
    isOpen,
    targetUser,
    user,
  ]);

  useChatConversationRuntime({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    retryInitialLoadTick,
    realtimeRecoveryTick,
    setMessages,
    setLoading,
    setLoadError,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setOlderMessagesError,
    applyMessageUpdate,
    markMessageIdsAsDelivered,
    markConversationRecoverySuccess,
    scheduleConversationRecovery,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    conversationChannelRef,
    hasCompletedInitialOpenLoadRef,
    activeSessionTokenRef,
    oldestLoadedMessageCreatedAtRef,
    isInitialConversationLoadPendingRef,
    pendingConversationRealtimeEventsRef,
  });

  const retryLoadMessages = useCallback(() => {
    setLoadError(null);
    setRetryInitialLoadTick(previousTick => previousTick + 1);
  }, []);

  useEffect(() => {
    if (
      !isOpen ||
      !currentChannelId ||
      !hasCompletedInitialOpenLoadRef.current
    ) {
      return;
    }

    const persistedMessages = messages.filter(
      messageItem => !messageItem.id.startsWith('temp_')
    );

    setConversationCacheEntry(currentChannelId, persistedMessages);
  }, [currentChannelId, isOpen, messages]);

  return {
    messages,
    setMessages,
    loading,
    loadError,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    loadOlderMessages,
    retryLoadMessages,
    targetUserPresence,
    targetUserPresenceError,
    markMessageIdsAsRead,
  };
};
