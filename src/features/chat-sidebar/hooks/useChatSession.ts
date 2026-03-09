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
  type RealtimeChannel,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  getFreshConversationCacheEntry,
  setConversationCacheEntry,
} from '../utils/conversation-cache';
import {
  applyConversationSnapshot as applyConversationSnapshotToState,
  mapConversationMessageForDisplay,
} from '../utils/conversation-sync';
import { useChatSessionPresence } from './useChatSessionPresence';
import {
  replayPendingConversationRealtimeEvents,
  useChatConversationRealtime,
  type PendingConversationRealtimeEvent,
} from './useChatConversationRealtime';
import { useChatConversationPagination } from './useChatConversationPagination';
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

  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const hasCompletedInitialOpenLoadRef = useRef(false);
  const activeSessionTokenRef = useRef(0);
  const oldestLoadedMessageCreatedAtRef = useRef<string | null>(null);
  const isInitialConversationLoadPendingRef = useRef(false);
  const pendingConversationRealtimeEventsRef = useRef<
    PendingConversationRealtimeEvent[]
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

  const { isTargetOnline, targetUserPresence, targetUserPresenceError } =
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

  const mapMessageForActiveConversation = useCallback(
    (messageItem: ChatMessage) =>
      user && targetUser
        ? mapConversationMessageForDisplay(
            messageItem,
            user,
            targetUser,
            messageItem.stableKey || messageItem.id
          )
        : messageItem,
    [targetUser, user]
  );

  const loadOlderMessages = useChatConversationPagination({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    hasOlderMessages,
    isLoadingOlderMessages,
    oldestLoadedMessageCreatedAtRef,
    setMessages,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setOlderMessagesError,
  });

  useChatConversationRealtime({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    recoveryTick: realtimeRecoveryTick,
    conversationChannelRef,
    isInitialConversationLoadPendingRef,
    pendingConversationRealtimeEventsRef,
    mapMessageForActiveConversation,
    applyMessageUpdate,
    setMessages,
    setLoadError,
    markConversationRecoverySuccess,
    scheduleConversationRecovery,
  });

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      markConversationRecoverySuccess();
      hasCompletedInitialOpenLoadRef.current = false;
      isInitialConversationLoadPendingRef.current = false;
      pendingConversationRealtimeEventsRef.current = [];
      setLoading(false);
      setLoadError(null);
      setHasOlderMessages(false);
      setIsLoadingOlderMessages(false);
      setOlderMessagesError(null);
      oldestLoadedMessageCreatedAtRef.current = null;
      return;
    }

    const sessionToken = activeSessionTokenRef.current + 1;
    activeSessionTokenRef.current = sessionToken;
    hasCompletedInitialOpenLoadRef.current = false;
    isInitialConversationLoadPendingRef.current = true;
    pendingConversationRealtimeEventsRef.current = [];
    let isCancelled = false;

    const isActiveSession = () =>
      !isCancelled && activeSessionTokenRef.current === sessionToken;

    const applyConversationSnapshot = (snapshotMessages: ChatMessage[]) => {
      if (!isActiveSession()) {
        return [];
      }

      return applyConversationSnapshotToState({
        snapshotMessages,
        user,
        targetUser,
        currentChannelId,
        setMessages,
        initialMessageAnimationKeysRef,
        initialOpenJumpAnimationKeysRef,
      });
    };

    const loadMessages = async () => {
      const cachedConversation =
        getFreshConversationCacheEntry(currentChannelId);
      const hasCachedConversation = Boolean(cachedConversation);

      if (cachedConversation) {
        applyConversationSnapshot(cachedConversation.messages);
        hasCompletedInitialOpenLoadRef.current = true;
      } else if (isActiveSession()) {
        setMessages([]);
      }

      if (isActiveSession()) {
        setLoading(!hasCachedConversation);
        setLoadError(null);
      }

      try {
        const { data: existingMessages, error } =
          await chatSidebarGateway.fetchConversationMessages(
            user.id,
            targetUser.id,
            currentChannelId,
            {
              limit: CHAT_CONVERSATION_PAGE_SIZE,
            }
          );

        if (!isActiveSession()) {
          return;
        }

        if (error) {
          console.error('Error loading messages:', error);
          setLoadError(
            hasCachedConversation
              ? 'Gagal menyegarkan percakapan'
              : 'Gagal memuat percakapan'
          );
          return;
        }

        const existingMessagesPayload = Array.isArray(existingMessages)
          ? {
              messages: existingMessages,
              hasMore: false,
            }
          : existingMessages;
        const transformedMessages = applyConversationSnapshot(
          existingMessagesPayload?.messages || []
        );

        if (!isActiveSession()) {
          return;
        }

        const pendingConversationRealtimeEvents =
          pendingConversationRealtimeEventsRef.current;
        isInitialConversationLoadPendingRef.current = false;
        pendingConversationRealtimeEventsRef.current = [];

        if (pendingConversationRealtimeEvents.length > 0) {
          setMessages(previousMessages =>
            replayPendingConversationRealtimeEvents({
              previousMessages,
              pendingEvents: pendingConversationRealtimeEvents,
              currentChannelId,
            })
          );
        }

        const latestPersistedMessages =
          pendingConversationRealtimeEvents.length > 0
            ? replayPendingConversationRealtimeEvents({
                previousMessages: transformedMessages,
                pendingEvents: pendingConversationRealtimeEvents,
                currentChannelId,
              })
            : transformedMessages;

        setConversationCacheEntry(currentChannelId, latestPersistedMessages);
        oldestLoadedMessageCreatedAtRef.current =
          latestPersistedMessages[0]?.created_at ?? null;
        setHasOlderMessages(existingMessagesPayload?.hasMore ?? false);
        setLoadError(null);

        const undeliveredIncomingMessageIds = latestPersistedMessages
          .filter(
            messageItem =>
              messageItem.sender_id === targetUser.id &&
              messageItem.receiver_id === user.id &&
              !messageItem.is_delivered
          )
          .map(messageItem => messageItem.id);

        await markMessageIdsAsDelivered(
          undeliveredIncomingMessageIds,
          sessionToken
        );
      } catch (error) {
        console.error('Error loading messages:', error);
        setLoadError(
          hasCachedConversation
            ? 'Gagal menyegarkan percakapan'
            : 'Gagal memuat percakapan'
        );
      } finally {
        if (isActiveSession()) {
          isInitialConversationLoadPendingRef.current = false;
          pendingConversationRealtimeEventsRef.current = [];
          hasCompletedInitialOpenLoadRef.current = true;
          setLoading(false);
        }
      }
    };
    void loadMessages();

    return () => {
      isCancelled = true;
      if (activeSessionTokenRef.current === sessionToken) {
        activeSessionTokenRef.current += 1;
      }
      isInitialConversationLoadPendingRef.current = false;
      pendingConversationRealtimeEventsRef.current = [];

      if (conversationChannelRef.current) {
        void chatSidebarGateway.removeRealtimeChannel(
          conversationChannelRef.current
        );
        conversationChannelRef.current = null;
      }
    };
  }, [
    applyMessageUpdate,
    currentChannelId,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    isOpen,
    markConversationRecoverySuccess,
    markMessageIdsAsDelivered,
    realtimeRecoveryTick,
    scheduleConversationRecovery,
    targetUser,
    user,
    retryInitialLoadTick,
    mapMessageForActiveConversation,
  ]);

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
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    markMessageIdsAsRead,
  };
};
