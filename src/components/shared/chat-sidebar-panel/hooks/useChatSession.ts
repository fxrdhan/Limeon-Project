import type { UserDetails } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  chatService,
  type ChatMessage,
  type UserPresence,
} from '@/services/api/chat.service';
import { realtimeService } from '@/services/realtime/realtime.service';
import type { ChatSidebarPanelTargetUser } from '../types';

type ConversationCacheEntry = {
  messages: ChatMessage[];
  cachedAt: number;
};

interface VisibleBounds {
  containerRect: DOMRect;
  visibleBottom: number;
}

interface UseChatSessionProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
}

export const useChatSession = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  getVisibleMessagesBounds,
  messageBubbleRefs,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
}: UseChatSessionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetUserPresence, setTargetUserPresence] =
    useState<UserPresence | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const globalPresenceChannelRef = useRef<RealtimeChannel | null>(null);
  const incomingMessagesChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasClosedRef = useRef(false);
  const previousIsOpenRef = useRef(isOpen);
  const conversationCacheRef = useRef<Map<string, ConversationCacheEntry>>(
    new Map()
  );
  const pendingDeliveredReceiptMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingReadReceiptMessageIdsRef = useRef<Set<string>>(new Set());
  const hasCompletedInitialOpenLoadRef = useRef(false);

  const updateUserChatClose = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await chatService.updateUserPresence(user.id, {
        is_online: false,
        current_chat_channel: null,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('❌ Error updating user chat close:', error);
      }
    } catch (error) {
      console.error('❌ Caught error updating user chat close:', error);
    }
  }, [user]);

  const performClose = useCallback(async () => {
    if (hasClosedRef.current || !user) {
      return;
    }

    if (globalPresenceChannelRef.current) {
      const broadcastPayload = {
        user_id: user.id,
        is_online: false,
        current_chat_channel: null,
        last_seen: new Date().toISOString(),
      };

      hasClosedRef.current = true;

      void globalPresenceChannelRef.current.send({
        type: 'broadcast',
        event: 'presence_changed',
        payload: broadcastPayload,
      });
    }

    try {
      await updateUserChatClose();
    } catch (error) {
      console.error('❌ Database update failed:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }, [updateUserChatClose, user]);

  const updateUserChatOpen = useCallback(async () => {
    if (!user || !currentChannelId) {
      return;
    }

    try {
      const { data: updateData, error: updateError } =
        await chatService.updateUserPresence(user.id, {
          is_online: true,
          current_chat_channel: currentChannelId,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (updateError || !updateData || updateData.length === 0) {
        const { error: insertError } = await chatService.insertUserPresence({
          user_id: user.id,
          is_online: true,
          current_chat_channel: currentChannelId,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error('❌ Error inserting user presence:', insertError);
        }
      } else if (
        globalPresenceChannelRef.current &&
        updateData &&
        updateData.length > 0
      ) {
        const updatedPresence = updateData[0];
        const broadcastPayload = {
          user_id: user.id,
          is_online: true,
          current_chat_channel: currentChannelId,
          last_seen: updatedPresence.last_seen,
        };

        void globalPresenceChannelRef.current.send({
          type: 'broadcast',
          event: 'presence_changed',
          payload: broadcastPayload,
        });
      }
    } catch (error) {
      console.error('❌ Caught error updating user chat open:', error);
    }
  }, [currentChannelId, user]);

  const loadTargetUserPresence = useCallback(async () => {
    if (!targetUser) return;

    try {
      const { data: presence, error } = await chatService.getUserPresence(
        targetUser.id
      );

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading target user presence:', error);
        return;
      }

      if (presence) {
        setTargetUserPresence(presence);
      }
    } catch (error) {
      console.error('❌ Caught error loading target user presence:', error);
    }
  }, [targetUser]);

  const broadcastNewMessage = useCallback((message: ChatMessage) => {
    if (!channelRef.current) return;

    void channelRef.current.send({
      type: 'broadcast',
      event: 'new_message',
      payload: message,
    });
  }, []);

  const broadcastUpdatedMessage = useCallback((message: ChatMessage) => {
    if (!channelRef.current) return;

    void channelRef.current.send({
      type: 'broadcast',
      event: 'update_message',
      payload: message,
    });
  }, []);

  const broadcastDeletedMessage = useCallback((messageId: string) => {
    if (!channelRef.current) return;

    void channelRef.current.send({
      type: 'broadcast',
      event: 'delete_message',
      payload: { id: messageId },
    });
  }, []);

  const mergeAndBroadcastMessageUpdates = useCallback(
    (updatedMessages: ChatMessage[]) => {
      if (updatedMessages.length === 0) return;

      const updatedMessagesById = new Map(
        updatedMessages.map(updatedMessage => [
          updatedMessage.id,
          updatedMessage,
        ])
      );

      setMessages(previousMessages =>
        previousMessages.map(previousMessage => {
          const nextUpdatedMessage = updatedMessagesById.get(
            previousMessage.id
          );
          if (!nextUpdatedMessage) return previousMessage;
          return {
            ...previousMessage,
            ...nextUpdatedMessage,
            stableKey: previousMessage.stableKey,
          };
        })
      );

      updatedMessages.forEach(updatedMessage => {
        if (channelRef.current) {
          void channelRef.current.send({
            type: 'broadcast',
            event: 'update_message',
            payload: updatedMessage,
          });
        }

        if (globalPresenceChannelRef.current) {
          void globalPresenceChannelRef.current.send({
            type: 'broadcast',
            event: 'message_receipt_updated',
            payload: updatedMessage,
          });
        }
      });
    },
    []
  );

  const markMessageIdsAsDelivered = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return;

      const targetIds = messageIds.filter(messageId => {
        if (!messageId) return false;
        if (pendingDeliveredReceiptMessageIdsRef.current.has(messageId)) {
          return false;
        }
        pendingDeliveredReceiptMessageIdsRef.current.add(messageId);
        return true;
      });
      if (targetIds.length === 0) return;

      try {
        const { data: deliveredMessages, error } =
          await chatService.markMessageIdsAsDelivered(targetIds);
        if (error || !deliveredMessages || deliveredMessages.length === 0) {
          return;
        }

        mergeAndBroadcastMessageUpdates(deliveredMessages);
      } catch (error) {
        console.error('Error marking messages as delivered:', error);
      } finally {
        targetIds.forEach(messageId => {
          pendingDeliveredReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeAndBroadcastMessageUpdates]
  );

  const markMessageIdsAsRead = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return;

      const targetIds = messageIds.filter(messageId => {
        if (!messageId) return false;
        if (pendingReadReceiptMessageIdsRef.current.has(messageId)) {
          return false;
        }
        pendingReadReceiptMessageIdsRef.current.add(messageId);
        return true;
      });
      if (targetIds.length === 0) return;

      try {
        const { data: readMessages, error } =
          await chatService.markMessageIdsAsRead(targetIds);
        if (error || !readMessages || readMessages.length === 0) return;
        mergeAndBroadcastMessageUpdates(readMessages);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      } finally {
        targetIds.forEach(messageId => {
          pendingReadReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeAndBroadcastMessageUpdates]
  );

  const markVisibleIncomingMessagesAsRead = useCallback(async () => {
    if (!user || !targetUser) return;

    const bounds = getVisibleMessagesBounds();
    if (!bounds) return;

    const visibleUnreadIncomingMessageIds = messages
      .filter(
        messageItem =>
          messageItem.sender_id === targetUser.id &&
          messageItem.receiver_id === user.id &&
          !messageItem.is_read
      )
      .map(messageItem => {
        const bubbleElement = messageBubbleRefs.current.get(messageItem.id);
        if (!bubbleElement) return null;

        const bubbleRect = bubbleElement.getBoundingClientRect();
        const isVisible =
          bubbleRect.bottom > bounds.containerRect.top &&
          bubbleRect.top < bounds.visibleBottom;
        return isVisible ? messageItem.id : null;
      })
      .filter((messageId): messageId is string => Boolean(messageId));

    if (visibleUnreadIncomingMessageIds.length === 0) return;
    await markMessageIdsAsRead(visibleUnreadIncomingMessageIds);
  }, [
    getVisibleMessagesBounds,
    markMessageIdsAsRead,
    messageBubbleRefs,
    messages,
    targetUser,
    user,
  ]);

  useEffect(() => {
    const previousIsOpen = previousIsOpenRef.current;
    previousIsOpenRef.current = isOpen;

    if (previousIsOpen && !isOpen && user && !hasClosedRef.current) {
      void performClose();
    }
  }, [isOpen, performClose, user]);

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      return;
    }

    const loadMessages = async () => {
      const applyConversationSnapshot = (snapshotMessages: ChatMessage[]) => {
        const transformedMessages: ChatMessage[] = snapshotMessages.map(
          messageItem => ({
            ...messageItem,
            sender_name:
              messageItem.sender_id === user.id
                ? user.name || 'You'
                : targetUser.name || 'Unknown',
            receiver_name:
              messageItem.receiver_id === user.id
                ? user.name || 'You'
                : targetUser.name || 'Unknown',
          })
        );

        const initialMessageAnimationKeys = new Set(
          transformedMessages.map(
            messageItem => messageItem.stableKey || messageItem.id
          )
        );
        initialMessageAnimationKeysRef.current = initialMessageAnimationKeys;
        initialOpenJumpAnimationKeysRef.current = new Set(
          initialMessageAnimationKeys
        );

        setMessages(previousMessages => {
          if (previousMessages.length === 0) {
            return transformedMessages;
          }

          const transformedIds = new Set(
            transformedMessages.map(messageItem => messageItem.id)
          );
          const pendingMessages = previousMessages.filter(
            messageItem =>
              !transformedIds.has(messageItem.id) &&
              messageItem.id.startsWith('temp_')
          );

          return [...transformedMessages, ...pendingMessages];
        });

        return transformedMessages;
      };

      const cachedConversation =
        conversationCacheRef.current.get(currentChannelId);
      const hasCachedConversation = Boolean(cachedConversation);

      if (hasCachedConversation && cachedConversation) {
        applyConversationSnapshot(cachedConversation.messages);
        hasCompletedInitialOpenLoadRef.current = true;
      } else {
        setMessages([]);
      }

      setLoading(!hasCachedConversation);
      try {
        const { data: existingMessages, error } =
          await chatService.fetchMessagesBetweenUsers(user.id, targetUser.id);

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }
        const transformedMessages = applyConversationSnapshot(
          existingMessages || []
        );
        conversationCacheRef.current.set(currentChannelId, {
          messages: transformedMessages,
          cachedAt: Date.now(),
        });
        const undeliveredIncomingMessageIds = transformedMessages
          .filter(
            messageItem =>
              messageItem.sender_id === targetUser.id &&
              messageItem.receiver_id === user.id &&
              !messageItem.is_delivered
          )
          .map(messageItem => messageItem.id);
        await markMessageIdsAsDelivered(undeliveredIncomingMessageIds);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        hasCompletedInitialOpenLoadRef.current = true;
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = () => {
      if (channelRef.current) {
        void realtimeService.removeChannel(channelRef.current);
      }

      const channel = realtimeService.createChannel(
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
        if (
          newMessage.sender_id === targetUser.id &&
          newMessage.receiver_id === user.id &&
          !newMessage.is_delivered
        ) {
          void markMessageIdsAsDelivered([newMessage.id]);
        }
      });

      channel.on('broadcast', { event: 'update_message' }, payload => {
        const updatedMessage = payload.payload as ChatMessage;
        setMessages(previousMessages =>
          previousMessages.map(messageItem =>
            messageItem.id === updatedMessage.id
              ? { ...messageItem, ...updatedMessage }
              : messageItem
          )
        );
      });

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

          setMessages(previousMessages =>
            previousMessages.map(messageItem =>
              messageItem.id === updatedMessage.id
                ? {
                    ...messageItem,
                    ...updatedMessage,
                    stableKey: messageItem.stableKey,
                  }
                : messageItem
            )
          );
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

      channelRef.current = channel;
    };

    const setupPresenceSubscription = () => {
      if (presenceChannelRef.current) {
        void realtimeService.removeChannel(presenceChannelRef.current);
      }

      const presenceChannel = realtimeService.createChannel(
        'user_presence_changes',
        {
          config: {
            broadcast: { self: false },
          },
        }
      );

      presenceChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${targetUser.id}`,
        },
        payload => {
          if (
            payload.eventType === 'UPDATE' ||
            payload.eventType === 'INSERT'
          ) {
            setTargetUserPresence(payload.new as UserPresence);
          }
        }
      );

      presenceChannel.subscribe();
      presenceChannelRef.current = presenceChannel;
    };

    const setupGlobalPresenceSubscription = () => {
      if (globalPresenceChannelRef.current) {
        void realtimeService.removeChannel(globalPresenceChannelRef.current);
      }

      const globalPresenceChannel = realtimeService.createChannel(
        'global_presence_updates',
        {
          config: {
            broadcast: { self: true },
          },
        }
      );

      globalPresenceChannel.on(
        'broadcast',
        { event: 'presence_changed' },
        payload => {
          const presenceUpdate = payload.payload as Partial<UserPresence>;
          if (presenceUpdate.user_id === targetUser.id) {
            setTargetUserPresence(previousPresence =>
              previousPresence
                ? { ...previousPresence, ...presenceUpdate }
                : {
                    user_id: presenceUpdate.user_id!,
                    is_online: presenceUpdate.is_online || false,
                    last_seen:
                      presenceUpdate.last_seen || new Date().toISOString(),
                    current_chat_channel:
                      presenceUpdate.current_chat_channel || null,
                  }
            );
          }
        }
      );

      globalPresenceChannel.on(
        'broadcast',
        { event: 'message_receipt_updated' },
        payload => {
          const updatedMessage = payload.payload as Partial<ChatMessage>;
          if (!updatedMessage?.id) return;

          setMessages(previousMessages =>
            previousMessages.map(messageItem =>
              messageItem.id === updatedMessage.id
                ? {
                    ...messageItem,
                    ...updatedMessage,
                    stableKey: messageItem.stableKey,
                  }
                : messageItem
            )
          );
        }
      );

      globalPresenceChannel.subscribe();
      globalPresenceChannelRef.current = globalPresenceChannel;
    };

    const setupIncomingMessagesDeliveredSubscription = () => {
      if (incomingMessagesChannelRef.current) {
        void realtimeService.removeChannel(incomingMessagesChannelRef.current);
      }

      const incomingMessagesChannel = realtimeService.createChannel(
        `incoming_messages_${user.id}`
      );

      incomingMessagesChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        payload => {
          const incomingMessage = payload.new as ChatMessage | undefined;
          if (!incomingMessage?.id || incomingMessage.is_delivered) return;
          void markMessageIdsAsDelivered([incomingMessage.id]);
        }
      );

      incomingMessagesChannel.subscribe();
      incomingMessagesChannelRef.current = incomingMessagesChannel;
    };

    setupRealtimeSubscription();
    void loadMessages();
    setupPresenceSubscription();
    setupGlobalPresenceSubscription();
    setupIncomingMessagesDeliveredSubscription();

    hasClosedRef.current = false;
    void updateUserChatOpen();
    void loadTargetUserPresence();

    presenceRefreshIntervalRef.current = setInterval(() => {
      void updateUserChatOpen();
      void loadTargetUserPresence();
    }, 30000);

    return () => {
      if (channelRef.current) {
        void realtimeService.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (presenceChannelRef.current) {
        void realtimeService.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      if (globalPresenceChannelRef.current) {
        void realtimeService.removeChannel(globalPresenceChannelRef.current);
        globalPresenceChannelRef.current = null;
      }
      if (incomingMessagesChannelRef.current) {
        void realtimeService.removeChannel(incomingMessagesChannelRef.current);
        incomingMessagesChannelRef.current = null;
      }
      if (presenceRefreshIntervalRef.current) {
        clearInterval(presenceRefreshIntervalRef.current);
        presenceRefreshIntervalRef.current = null;
      }
    };
  }, [
    currentChannelId,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    isOpen,
    loadTargetUserPresence,
    markMessageIdsAsDelivered,
    targetUser,
    updateUserChatOpen,
    user,
  ]);

  useEffect(() => {
    return () => {
      if (!hasClosedRef.current && user) {
        void performClose();
      }

      if (presenceRefreshIntervalRef.current) {
        clearInterval(presenceRefreshIntervalRef.current);
        presenceRefreshIntervalRef.current = null;
      }

      setTimeout(() => {
        if (globalPresenceChannelRef.current) {
          void realtimeService.removeChannel(globalPresenceChannelRef.current);
          globalPresenceChannelRef.current = null;
        }
      }, 200);
    };
  }, [performClose, user]);

  useEffect(() => {
    if (
      !isOpen ||
      !currentChannelId ||
      !hasCompletedInitialOpenLoadRef.current
    ) {
      return;
    }

    const persistedMessages = messages
      .filter(messageItem => !messageItem.id.startsWith('temp_'))
      .map(messageItem => ({ ...messageItem }));

    conversationCacheRef.current.set(currentChannelId, {
      messages: persistedMessages,
      cachedAt: Date.now(),
    });
  }, [currentChannelId, isOpen, messages]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasClosedRef.current && user) {
        hasClosedRef.current = true;
        void updateUserChatClose();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updateUserChatClose, user]);

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
    markVisibleIncomingMessagesAsRead,
    hasCompletedInitialOpenLoadRef,
  };
};
