import type { UserDetails } from '@/types/database';
import { useCallback, useState, type MutableRefObject } from 'react';
import { type ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  mapConversationMessageForDisplay,
  mergeConversationContextWithExisting,
} from '../utils/conversation-sync';
import { useChatConversationCacheSync } from './useChatConversationCacheSync';
import { useChatConversationInitialLoad } from './useChatConversationInitialLoad';
import { useChatConversationRealtime } from './useChatConversationRealtime';
import { useChatConversationPagination } from './useChatConversationPagination';
import { useChatSessionEngine } from './useChatSessionEngine';

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

  const sessionEngine = useChatSessionEngine({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    retryInitialLoadTick,
    applyMessageUpdate,
  });
  const { conversationSession } = sessionEngine;

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
        conversationSession.oldestLoadedMessageCreatedAtRef.current &&
        conversationSession.oldestLoadedMessageIdRef.current
          ? {
              created_at:
                conversationSession.oldestLoadedMessageCreatedAtRef.current,
              id: conversationSession.oldestLoadedMessageIdRef.current,
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

          conversationSession.searchContextMessageIdsRef.current.add(
            messageItem.id
          );
          if (
            previousOldestMessage &&
            compareMessageOrder(messageItem, previousOldestMessage) < 0
          ) {
            injectedOlderPersistedMessage = true;
          }
        });

        conversationSession.oldestLoadedMessageCreatedAtRef.current =
          nextPersistedMessages[0]?.created_at ?? null;
        conversationSession.oldestLoadedMessageIdRef.current =
          nextPersistedMessages[0]?.id ?? null;

        return nextMessages;
      });

      if (injectedOlderPersistedMessage) {
        setHasOlderMessages(true);
      }
    },
    [conversationSession, currentChannelId, mapMessageForActiveConversation]
  );

  const loadOlderMessages = useChatConversationPagination({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    conversationSession,
    hasOlderMessages,
    isLoadingOlderMessages,
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
    recoveryTick: sessionEngine.realtimeRecoveryTick,
    conversationSession,
    mapMessageForActiveConversation,
    applyMessageUpdate,
    setMessages,
    setLoadError,
    markConversationRecoverySuccess:
      sessionEngine.markConversationRecoverySuccess,
    scheduleConversationRecovery: sessionEngine.scheduleConversationRecovery,
  });

  useChatConversationInitialLoad({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    retryInitialLoadTick,
    realtimeRecoveryTick: sessionEngine.realtimeRecoveryTick,
    setMessages,
    setLoading,
    setLoadError,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setOlderMessagesError,
    conversationSession,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    markConversationRecoverySuccess:
      sessionEngine.markConversationRecoverySuccess,
    markMessageIdsAsDelivered: sessionEngine.markMessageIdsAsDelivered,
  });

  useChatConversationCacheSync({
    isOpen,
    currentChannelId,
    messages,
    hasOlderMessages,
    hasCompletedInitialOpenLoadRef:
      conversationSession.hasCompletedInitialOpenLoadRef,
    excludedMessageIdsRef: conversationSession.searchContextMessageIdsRef,
  });

  const retryLoadMessages = useCallback(() => {
    setLoadError(null);
    setRetryInitialLoadTick(previousTick => previousTick + 1);
  }, []);

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
    isTargetOnline: sessionEngine.isTargetOnline,
    targetUserPresence: sessionEngine.targetUserPresence,
    targetUserPresenceError: sessionEngine.targetUserPresenceError,
    markMessageIdsAsRead: sessionEngine.markMessageIdsAsRead,
    mergeSearchContextMessages,
  };
};
