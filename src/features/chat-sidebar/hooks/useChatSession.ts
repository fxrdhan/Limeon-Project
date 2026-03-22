import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import type { UserDetails } from '@/types/database';
import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { type ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  mapConversationMessageForDisplay,
  mergeConversationContextWithExisting,
} from '../utils/conversation-sync';
import { useChatConversationCacheSync } from './useChatConversationCacheSync';
import { useChatConversationInitialLoad } from './useChatConversationInitialLoad';
import { useChatSessionPresence } from './useChatSessionPresence';
import {
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

const compareMessageOrder = (
  leftMessage: Pick<ChatMessage, 'created_at' | 'id'>,
  rightMessage: Pick<ChatMessage, 'created_at' | 'id'>
) => {
  const createdAtOrder = leftMessage.created_at.localeCompare(
    rightMessage.created_at
  );
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return leftMessage.id.localeCompare(rightMessage.id);
};

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

  const hasCompletedInitialOpenLoadRef = useRef(false);
  const activeSessionTokenRef = useRef(0);
  const oldestLoadedMessageCreatedAtRef = useRef<string | null>(null);
  const oldestLoadedMessageIdRef = useRef<string | null>(null);
  const isInitialConversationLoadPendingRef = useRef(false);
  const pendingConversationRealtimeEventsRef = useRef<
    PendingConversationRealtimeEvent[]
  >([]);
  const searchContextMessageIdsRef = useRef<Set<string>>(new Set());

  const {
    recoveryTick: realtimeRecoveryTick,
    scheduleRecovery: scheduleConversationRecovery,
    markRecoverySuccess: markConversationRecoverySuccess,
  } = useRealtimeChannelRecovery();

  const isSessionTokenActive = useCallback(
    (sessionToken: number) => activeSessionTokenRef.current === sessionToken,
    []
  );
  const getActiveSessionToken = useCallback(
    () => activeSessionTokenRef.current,
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
      currentUserId: user?.id,
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

  const mergeSearchContextMessages = useCallback(
    (searchContextMessages: ChatMessage[]) => {
      if (!currentChannelId || searchContextMessages.length === 0) {
        return;
      }

      const mappedContextMessages = searchContextMessages.map(messageItem =>
        mapMessageForActiveConversation(messageItem)
      );
      const previousOldestMessage =
        oldestLoadedMessageCreatedAtRef.current &&
        oldestLoadedMessageIdRef.current
          ? {
              created_at: oldestLoadedMessageCreatedAtRef.current,
              id: oldestLoadedMessageIdRef.current,
            }
          : null;
      let injectedOlderPersistedMessage = false;

      setMessages(previousMessages => {
        const knownPersistedMessageIds = new Set(
          previousMessages
            .filter(messageItem => !messageItem.id.startsWith('temp_'))
            .map(messageItem => messageItem.id)
        );
        const nextMessages = mergeConversationContextWithExisting(
          previousMessages,
          mappedContextMessages,
          currentChannelId
        );
        const nextPersistedMessages = nextMessages.filter(
          messageItem => !messageItem.id.startsWith('temp_')
        );

        mappedContextMessages.forEach(messageItem => {
          if (knownPersistedMessageIds.has(messageItem.id)) {
            return;
          }

          searchContextMessageIdsRef.current.add(messageItem.id);
          if (
            previousOldestMessage &&
            compareMessageOrder(messageItem, previousOldestMessage) < 0
          ) {
            injectedOlderPersistedMessage = true;
          }
        });

        oldestLoadedMessageCreatedAtRef.current =
          nextPersistedMessages[0]?.created_at ?? null;
        oldestLoadedMessageIdRef.current = nextPersistedMessages[0]?.id ?? null;

        return nextMessages;
      });

      if (injectedOlderPersistedMessage) {
        setHasOlderMessages(true);
      }
    },
    [
      currentChannelId,
      mapMessageForActiveConversation,
      oldestLoadedMessageCreatedAtRef,
      oldestLoadedMessageIdRef,
    ]
  );

  const loadOlderMessages = useChatConversationPagination({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    getActiveSessionToken,
    isSessionTokenActive,
    hasOlderMessages,
    isLoadingOlderMessages,
    oldestLoadedMessageCreatedAtRef,
    oldestLoadedMessageIdRef,
    searchContextMessageIdsRef,
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
    isInitialConversationLoadPendingRef,
    pendingConversationRealtimeEventsRef,
    mapMessageForActiveConversation,
    applyMessageUpdate,
    setMessages,
    setLoadError,
    markConversationRecoverySuccess,
    scheduleConversationRecovery,
  });

  useChatConversationInitialLoad({
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
    hasCompletedInitialOpenLoadRef,
    activeSessionTokenRef,
    oldestLoadedMessageCreatedAtRef,
    oldestLoadedMessageIdRef,
    isInitialConversationLoadPendingRef,
    pendingConversationRealtimeEventsRef,
    searchContextMessageIdsRef,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    markConversationRecoverySuccess,
    markMessageIdsAsDelivered,
  });

  const retryLoadMessages = useCallback(() => {
    setLoadError(null);
    setRetryInitialLoadTick(previousTick => previousTick + 1);
  }, []);

  useChatConversationCacheSync({
    isOpen,
    currentChannelId,
    messages,
    hasOlderMessages,
    hasCompletedInitialOpenLoadRef,
    excludedMessageIdsRef: searchContextMessageIdsRef,
  });

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
    mergeSearchContextMessages,
  };
};
