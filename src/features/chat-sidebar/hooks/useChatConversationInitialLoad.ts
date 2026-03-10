import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect } from 'react';
import type { UserDetails } from '@/types/database';
import { CHAT_CONVERSATION_PAGE_SIZE } from '../constants';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  getFreshConversationCacheEntry,
  setConversationCacheEntry,
} from '../utils/conversation-cache';
import {
  applyConversationSnapshot,
  mergeLatestConversationPageWithExisting,
} from '../utils/conversation-sync';
import { mapConversationMessagesForDisplay } from '../utils/message-display';
import {
  replayPendingConversationRealtimeEvents,
  type PendingConversationRealtimeEvent,
} from './useChatConversationRealtime';

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
  hasCompletedInitialOpenLoadRef: MutableRefObject<boolean>;
  activeSessionTokenRef: MutableRefObject<number>;
  oldestLoadedMessageCreatedAtRef: MutableRefObject<string | null>;
  oldestLoadedMessageIdRef: MutableRefObject<string | null>;
  isInitialConversationLoadPendingRef: MutableRefObject<boolean>;
  pendingConversationRealtimeEventsRef: MutableRefObject<
    PendingConversationRealtimeEvent[]
  >;
  searchContextMessageIdsRef: MutableRefObject<Set<string>>;
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
}: UseChatConversationInitialLoadProps) => {
  useEffect(() => {
    const activeSearchContextMessageIds = searchContextMessageIdsRef.current;

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
      activeSearchContextMessageIds.clear();
      return;
    }

    const sessionToken = activeSessionTokenRef.current + 1;
    activeSessionTokenRef.current = sessionToken;
    hasCompletedInitialOpenLoadRef.current = false;
    isInitialConversationLoadPendingRef.current = true;
    pendingConversationRealtimeEventsRef.current = [];
    activeSearchContextMessageIds.clear();
    setIsLoadingOlderMessages(false);
    setOlderMessagesError(null);
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
        oldestLoadedMessageCreatedAtRef.current =
          cachedConversation.messages[0]?.created_at ?? null;
        oldestLoadedMessageIdRef.current =
          cachedConversation.messages[0]?.id ?? null;
        setHasOlderMessages(cachedConversation.hasOlderMessages);
      } else if (isActiveSession()) {
        setMessages([]);
        setHasOlderMessages(false);
      }

      if (isActiveSession()) {
        setLoading(!hasCachedConversation);
        setLoadError(null);
      }

      try {
        const { data: existingMessagesPage, error } =
          await chatSidebarMessagesGateway.fetchConversationMessages(
            targetUser.id,
            {
              limit: CHAT_CONVERSATION_PAGE_SIZE,
            }
          );

        if (!isActiveSession()) {
          return;
        }

        if (error || !existingMessagesPage) {
          console.error('Error loading messages:', error);
          setLoadError(
            hasCachedConversation
              ? 'Gagal menyegarkan percakapan'
              : 'Gagal memuat percakapan'
          );
          return;
        }

        const cachedConversationMessages = cachedConversation?.messages || [];
        const transformedMessages = hasCachedConversation
          ? mapConversationMessagesForDisplay(existingMessagesPage.messages, {
              currentUserId: user.id,
              currentUserName: user.name || 'You',
              targetUserName: targetUser.name || 'Unknown',
            })
          : applyActiveConversationSnapshot(existingMessagesPage.messages);

        if (!isActiveSession()) {
          return;
        }

        const shouldPreserveCachedOlderMessages =
          cachedConversationMessages.length > transformedMessages.length;
        const mergedPersistedMessages = hasCachedConversation
          ? mergeLatestConversationPageWithExisting({
              previousMessages: cachedConversationMessages,
              latestMessages: transformedMessages,
              currentChannelId,
              preserveOlderPersistedMessages: shouldPreserveCachedOlderMessages,
            }).filter(messageItem => !messageItem.id.startsWith('temp_'))
          : transformedMessages;

        if (hasCachedConversation) {
          setMessages(previousMessages =>
            mergeLatestConversationPageWithExisting({
              previousMessages,
              latestMessages: transformedMessages,
              currentChannelId,
              preserveOlderPersistedMessages: shouldPreserveCachedOlderMessages,
            })
          );
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
                previousMessages: mergedPersistedMessages,
                pendingEvents: pendingConversationRealtimeEvents,
                currentChannelId,
              })
            : mergedPersistedMessages;
        latestPersistedMessages.forEach(messageItem => {
          activeSearchContextMessageIds.delete(messageItem.id);
        });

        const nextHasOlderMessages =
          shouldPreserveCachedOlderMessages && cachedConversation
            ? cachedConversation.hasOlderMessages
            : existingMessagesPage.hasMore;

        setConversationCacheEntry(
          currentChannelId,
          latestPersistedMessages,
          nextHasOlderMessages
        );
        oldestLoadedMessageCreatedAtRef.current =
          latestPersistedMessages[0]?.created_at ?? null;
        oldestLoadedMessageIdRef.current =
          latestPersistedMessages[0]?.id ?? null;
        setHasOlderMessages(nextHasOlderMessages);
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
      activeSearchContextMessageIds.clear();
    };
  }, [
    activeSessionTokenRef,
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
    searchContextMessageIdsRef,
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
