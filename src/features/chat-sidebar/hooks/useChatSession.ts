import type { UserDetails } from '@/types/database';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
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
  accessToken,
  targetUser,
  currentChannelId,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
}: UseChatSessionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const hasCompletedInitialOpenLoadRef = useRef(false);
  const activeSessionTokenRef = useRef(0);
  const activeConversationChannelIdRef = useRef<string | null>(
    currentChannelId
  );

  useEffect(() => {
    activeConversationChannelIdRef.current = currentChannelId;
  }, [currentChannelId]);

  const broadcastNewMessage = useCallback((message: ChatMessage) => {
    if (!conversationChannelRef.current) return;

    void conversationChannelRef.current.send({
      type: 'broadcast',
      event: 'new_message',
      payload: message,
    });
  }, []);

  const broadcastUpdatedMessage = useCallback((message: ChatMessage) => {
    if (!conversationChannelRef.current) return;
    if (
      message.channel_id &&
      message.channel_id !== activeConversationChannelIdRef.current
    ) {
      return;
    }

    void conversationChannelRef.current.send({
      type: 'broadcast',
      event: 'update_message',
      payload: message,
    });
  }, []);

  const broadcastDeletedMessage = useCallback((messageId: string) => {
    if (!conversationChannelRef.current) return;

    void conversationChannelRef.current.send({
      type: 'broadcast',
      event: 'delete_message',
      payload: { id: messageId },
    });
  }, []);

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

  const { targetUserPresence, performClose, broadcastReceiptUpdate } =
    useChatSessionPresence({
      isOpen,
      user,
      accessToken,
      targetUser,
      currentChannelId,
      applyReceiptUpdate: applyMessageUpdate,
    });

  const {
    mergeAndBroadcastMessageUpdates,
    markMessageIdsAsDelivered,
    markMessageIdsAsRead,
  } = useChatSessionReceipts({
    applyMessageUpdate,
    broadcastConversationUpdate: broadcastUpdatedMessage,
    broadcastReceiptUpdate,
    isSessionTokenActive,
  });

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      hasCompletedInitialOpenLoadRef.current = false;
      setLoading(false);
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
      }

      try {
        const { data: existingMessages, error } =
          await chatSidebarGateway.fetchConversationMessages(
            user.id,
            targetUser.id,
            currentChannelId
          );

        if (!isActiveSession()) {
          return;
        }

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        const transformedMessages = applyConversationSnapshot(
          existingMessages || []
        );
        if (!isActiveSession()) {
          return;
        }

        setConversationCacheEntry(currentChannelId, transformedMessages);

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
        `chat_${currentChannelId}`,
        {
          config: {
            broadcast: { self: true },
          },
        }
      );

      channel.on('broadcast', { event: 'new_message' }, payload => {
        const newMessage = payload.payload as ChatMessage;
        setMessages(previousMessages => {
          const exists = previousMessages.some(msg => msg.id === newMessage.id);
          if (exists) return previousMessages;
          return [...previousMessages, newMessage];
        });
      });

      channel.on('broadcast', { event: 'update_message' }, payload => {
        const updatedMessage = payload.payload as ChatMessage;
        applyMessageUpdate(updatedMessage);
      });

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

      channel.on('broadcast', { event: 'delete_message' }, payload => {
        const deletedMessage = payload.payload as { id: string };
        setMessages(previousMessages =>
          previousMessages.filter(
            messageItem => messageItem.id !== deletedMessage.id
          )
        );
      });

      channel.on('broadcast', { event: 'typing' }, () => {});

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
  ]);

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
    targetUserPresence,
    performClose,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    broadcastDeletedMessage,
    mergeAndBroadcastMessageUpdates,
    markMessageIdsAsRead,
    hasCompletedInitialOpenLoadRef,
  };
};
