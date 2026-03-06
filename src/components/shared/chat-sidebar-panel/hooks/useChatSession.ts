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
import { mapConversationMessagesForDisplay } from '../utils/message-display';

type ConversationCacheEntry = {
  messages: ChatMessage[];
  cachedAt: number;
};

interface UseChatSessionProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
}

interface UpdateUserChatCloseOptions {
  keepOnline: boolean;
  timestamp?: string;
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
  const activeSessionTokenRef = useRef(0);
  const activeTargetUserIdRef = useRef<string | null>(targetUser?.id ?? null);
  const activeConversationChannelIdRef = useRef<string | null>(
    currentChannelId
  );

  useEffect(() => {
    activeTargetUserIdRef.current = targetUser?.id ?? null;
    activeConversationChannelIdRef.current = currentChannelId;
  }, [currentChannelId, targetUser?.id]);

  const updateUserChatClose = useCallback(
    async ({ keepOnline, timestamp }: UpdateUserChatCloseOptions) => {
      if (!user) return;

      const eventTimestamp = timestamp ?? new Date().toISOString();

      try {
        const { error } = await chatService.updateUserPresence(user.id, {
          is_online: keepOnline,
          current_chat_channel: null,
          last_seen: eventTimestamp,
          updated_at: eventTimestamp,
        });

        if (error) {
          console.error('❌ Error updating user chat close:', error);
        }
      } catch (error) {
        console.error('❌ Caught error updating user chat close:', error);
      }
    },
    [user]
  );

  const performClose = useCallback(async () => {
    if (!user) return;
    if (hasClosedRef.current) {
      return;
    }

    const eventTimestamp = new Date().toISOString();
    hasClosedRef.current = true;

    if (globalPresenceChannelRef.current) {
      const broadcastPayload = {
        user_id: user.id,
        is_online: true,
        current_chat_channel: null,
        last_seen: eventTimestamp,
      };

      void globalPresenceChannelRef.current.send({
        type: 'broadcast',
        event: 'presence_changed',
        payload: broadcastPayload,
      });
    }

    try {
      await updateUserChatClose({
        keepOnline: true,
        timestamp: eventTimestamp,
      });
    } catch (error) {
      console.error('❌ Database update failed:', error);
    }
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
    (updatedMessages: ChatMessage[], sessionToken?: number) => {
      if (updatedMessages.length === 0) return;
      if (
        typeof sessionToken === 'number' &&
        activeSessionTokenRef.current !== sessionToken
      ) {
        return;
      }

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
        if (
          channelRef.current &&
          updatedMessage.channel_id &&
          updatedMessage.channel_id === activeConversationChannelIdRef.current
        ) {
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
    async (messageIds: string[], sessionToken?: number) => {
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

        mergeAndBroadcastMessageUpdates(deliveredMessages, sessionToken);
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
    async (messageIds: string[], sessionToken?: number) => {
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
        mergeAndBroadcastMessageUpdates(readMessages, sessionToken);
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

  useEffect(() => {
    const previousIsOpen = previousIsOpenRef.current;
    previousIsOpenRef.current = isOpen;

    if (previousIsOpen && !isOpen && user && !hasClosedRef.current) {
      void performClose();
    }
  }, [isOpen, performClose, user]);

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      setLoading(false);
      setTargetUserPresence(null);
      return;
    }

    const sessionToken = activeSessionTokenRef.current + 1;
    activeSessionTokenRef.current = sessionToken;
    let isCancelled = false;
    const isActiveSession = () =>
      !isCancelled && activeSessionTokenRef.current === sessionToken;

    const loadMessages = async () => {
      const applyConversationSnapshot = (snapshotMessages: ChatMessage[]) => {
        if (!isActiveSession()) {
          return [];
        }

        const transformedMessages = mapConversationMessagesForDisplay(
          snapshotMessages,
          {
            currentUserId: user.id,
            currentUserName: user.name || 'You',
            targetUserName: targetUser.name || 'Unknown',
          }
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
      } else if (isActiveSession()) {
        setMessages([]);
      }

      if (isActiveSession()) {
        setLoading(!hasCachedConversation);
      }
      try {
        const { data: existingMessages, error } =
          await chatService.fetchMessagesBetweenUsers(
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

    const loadTargetUserPresenceForSession = async () => {
      try {
        const { data: presence, error } = await chatService.getUserPresence(
          targetUser.id
        );
        if (!isActiveSession()) {
          return;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error loading target user presence:', error);
          return;
        }

        setTargetUserPresence(presence ?? null);
      } catch (error) {
        if (!isActiveSession()) {
          return;
        }
        console.error('❌ Caught error loading target user presence:', error);
        setTargetUserPresence(null);
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

    setupRealtimeSubscription();
    void loadMessages();
    setupPresenceSubscription();

    hasClosedRef.current = false;
    setTargetUserPresence(null);
    void updateUserChatOpen();
    void loadTargetUserPresenceForSession();

    presenceRefreshIntervalRef.current = setInterval(() => {
      void updateUserChatOpen();
      void loadTargetUserPresenceForSession();
    }, 30000);

    return () => {
      isCancelled = true;
      if (activeSessionTokenRef.current === sessionToken) {
        activeSessionTokenRef.current += 1;
      }
      if (channelRef.current) {
        void realtimeService.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (presenceChannelRef.current) {
        void realtimeService.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
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
    markMessageIdsAsDelivered,
    targetUser,
    updateUserChatOpen,
    user,
  ]);

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    if (globalPresenceChannelRef.current) {
      void realtimeService.removeChannel(globalPresenceChannelRef.current);
    }
    if (incomingMessagesChannelRef.current) {
      void realtimeService.removeChannel(incomingMessagesChannelRef.current);
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
        if (presenceUpdate.user_id !== activeTargetUserIdRef.current) {
          return;
        }

        setTargetUserPresence(previousPresence =>
          previousPresence
            ? { ...previousPresence, ...presenceUpdate }
            : {
                user_id: presenceUpdate.user_id!,
                is_online: presenceUpdate.is_online || false,
                last_seen: presenceUpdate.last_seen || new Date().toISOString(),
                current_chat_channel:
                  presenceUpdate.current_chat_channel || null,
              }
        );
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

    return () => {
      if (globalPresenceChannelRef.current) {
        void realtimeService.removeChannel(globalPresenceChannelRef.current);
        globalPresenceChannelRef.current = null;
      }
      if (incomingMessagesChannelRef.current) {
        void realtimeService.removeChannel(incomingMessagesChannelRef.current);
        incomingMessagesChannelRef.current = null;
      }
    };
  }, [isOpen, markMessageIdsAsDelivered, user]);

  useEffect(() => {
    return () => {
      if (!hasClosedRef.current && user) {
        void performClose();
      }
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
        void updateUserChatClose({ keepOnline: false });
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
    markMessageIdsAsRead,
    hasCompletedInitialOpenLoadRef,
  };
};
