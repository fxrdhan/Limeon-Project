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
  isConversationMessageForPair,
  mapConversationMessageForDisplay,
  reconcileInsertedConversationMessage,
} from '../utils/conversation-sync';
import { useChatSessionPresence } from './useChatSessionPresence';
import { useChatSessionReceipts } from './useChatSessionReceipts';

interface UseChatSessionProps {
  isOpen: boolean;
  user: UserDetails | null;
  accessToken?: string | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
}

export const useChatSession = ({
  isOpen,
  user,
  accessToken: _accessToken,
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

  const broadcastNewMessage = useCallback((_message: ChatMessage) => {}, []);

  const broadcastUpdatedMessage = useCallback(
    (_message: ChatMessage) => {},
    []
  );

  const broadcastDeletedMessage = useCallback((_messageId: string) => {}, []);

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

  const { targetUserPresence, targetUserPresenceError, performClose } =
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

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      hasCompletedInitialOpenLoadRef.current = false;
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

    const mapMessageForActiveConversation = (messageItem: ChatMessage) =>
      mapConversationMessageForDisplay(
        messageItem,
        user,
        targetUser,
        messageItem.stableKey || messageItem.id
      );

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

        setConversationCacheEntry(currentChannelId, transformedMessages);
        oldestLoadedMessageCreatedAtRef.current =
          transformedMessages[0]?.created_at ?? null;
        setHasOlderMessages(existingMessagesPayload?.hasMore ?? false);
        setLoadError(null);

        const undeliveredIncomingMessageIds = transformedMessages
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
          hasCompletedInitialOpenLoadRef.current = true;
          setLoading(false);
        }
      }
    };

    const setupConversationSubscription = () => {
      if (conversationChannelRef.current) {
        void chatSidebarGateway.removeRealtimeChannel(
          conversationChannelRef.current
        );
      }

      const channel = chatSidebarGateway.createRealtimeChannel(
        `chat_${currentChannelId}`
      );

      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${currentChannelId}`,
        },
        payload => {
          const insertedMessage = payload.new as ChatMessage;
          if (!insertedMessage?.id) {
            return;
          }

          if (
            !isConversationMessageForPair(
              insertedMessage,
              user.id,
              targetUser.id
            )
          ) {
            return;
          }

          const mappedInsertedMessage =
            mapMessageForActiveConversation(insertedMessage);

          setMessages(previousMessages =>
            reconcileInsertedConversationMessage({
              previousMessages,
              insertedMessage: mappedInsertedMessage,
              currentChannelId,
            })
          );
        }
      );

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${currentChannelId}`,
        },
        payload => {
          const updatedMessage = payload.new as ChatMessage;
          if (!updatedMessage?.id) return;
          applyMessageUpdate(updatedMessage);
        }
      );

      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${currentChannelId}`,
        },
        payload => {
          const deletedMessage = payload.old as
            | Partial<ChatMessage>
            | undefined;
          const deletedMessageId = deletedMessage?.id;
          if (!deletedMessageId) return;

          setMessages(previousMessages => {
            if (
              !previousMessages.some(
                messageItem => messageItem.id === deletedMessageId
              )
            ) {
              return previousMessages;
            }

            return previousMessages.filter(
              messageItem => messageItem.id !== deletedMessageId
            );
          });
        }
      );

      channel.subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Failed to connect to chat channel');
        }
      });

      conversationChannelRef.current = channel;
    };

    setupConversationSubscription();
    void loadMessages();

    return () => {
      isCancelled = true;
      if (activeSessionTokenRef.current === sessionToken) {
        activeSessionTokenRef.current += 1;
      }
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
    markMessageIdsAsDelivered,
    targetUser,
    user,
    retryInitialLoadTick,
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
    targetUserPresence,
    targetUserPresenceError,
    performClose,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    broadcastDeletedMessage,
    markMessageIdsAsRead,
    hasCompletedInitialOpenLoadRef,
  };
};
