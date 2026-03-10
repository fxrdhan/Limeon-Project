import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect } from 'react';
import type { UserDetails } from '@/types/database';
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
import { applyConversationSnapshot } from '../utils/conversation-sync';
import {
  replayPendingConversationRealtimeEvents,
  type PendingConversationRealtimeEvent,
} from './useChatConversationRealtime';

type ConversationMessagesPageLike =
  | {
      messages: ChatMessage[];
      hasMore: boolean;
    }
  | ChatMessage[]
  | null
  | undefined;

const normalizeConversationMessagesPage = (
  payload: ConversationMessagesPageLike
) =>
  Array.isArray(payload)
    ? {
        messages: payload,
        hasMore: false,
      }
    : {
        messages: payload?.messages || [],
        hasMore: payload?.hasMore ?? false,
      };

interface UseChatConversationInitialLoadProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  retryInitialLoadTick: number;
  realtimeRecoveryTick: number;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  setHasOlderMessages: Dispatch<SetStateAction<boolean>>;
  setIsLoadingOlderMessages: Dispatch<SetStateAction<boolean>>;
  setOlderMessagesError: Dispatch<SetStateAction<string | null>>;
  conversationChannelRef: MutableRefObject<RealtimeChannel | null>;
  hasCompletedInitialOpenLoadRef: MutableRefObject<boolean>;
  activeSessionTokenRef: MutableRefObject<number>;
  oldestLoadedMessageCreatedAtRef: MutableRefObject<string | null>;
  oldestLoadedMessageIdRef: MutableRefObject<string | null>;
  isInitialConversationLoadPendingRef: MutableRefObject<boolean>;
  pendingConversationRealtimeEventsRef: MutableRefObject<
    PendingConversationRealtimeEvent[]
  >;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  markConversationRecoverySuccess: () => void;
  markMessageIdsAsDelivered: (
    messageIds: string[],
    sessionToken?: number
  ) => Promise<void>;
}

export const useChatConversationInitialLoad = ({
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
  conversationChannelRef,
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
}: UseChatConversationInitialLoadProps) => {
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
      oldestLoadedMessageIdRef.current = null;
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

    const applyActiveConversationSnapshot = (
      snapshotMessages: ChatMessage[]
    ) => {
      if (!isActiveSession()) {
        return [];
      }

      return applyConversationSnapshot({
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
        applyActiveConversationSnapshot(cachedConversation.messages);
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

        const existingMessagesPayload =
          normalizeConversationMessagesPage(existingMessages);
        const transformedMessages = applyActiveConversationSnapshot(
          existingMessagesPayload.messages
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
        oldestLoadedMessageIdRef.current =
          latestPersistedMessages[0]?.id ?? null;
        setHasOlderMessages(existingMessagesPayload.hasMore);
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
    activeSessionTokenRef,
    conversationChannelRef,
    currentChannelId,
    hasCompletedInitialOpenLoadRef,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    isInitialConversationLoadPendingRef,
    isOpen,
    markConversationRecoverySuccess,
    markMessageIdsAsDelivered,
    oldestLoadedMessageCreatedAtRef,
    oldestLoadedMessageIdRef,
    pendingConversationRealtimeEventsRef,
    realtimeRecoveryTick,
    retryInitialLoadTick,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setLoadError,
    setLoading,
    setMessages,
    setOlderMessagesError,
    targetUser,
    user,
  ]);
};
