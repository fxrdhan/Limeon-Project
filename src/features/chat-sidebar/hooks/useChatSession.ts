import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import type { UserDetails } from '@/types/database';
import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { type ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { mapConversationMessageForDisplay } from '../utils/conversation-sync';
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
    getActiveSessionToken,
    isSessionTokenActive,
    hasOlderMessages,
    isLoadingOlderMessages,
    oldestLoadedMessageCreatedAtRef,
    oldestLoadedMessageIdRef,
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
  };
};
