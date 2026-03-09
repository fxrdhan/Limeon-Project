import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
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
import {
  applyConversationSnapshot as applyConversationSnapshotToState,
  isConversationMessageForPair,
  mapConversationMessageForDisplay,
  reconcileInsertedConversationMessage,
} from '../utils/conversation-sync';

type PendingConversationRealtimeEvent =
  | {
      type: 'insert';
      message: ChatMessage;
    }
  | {
      type: 'update';
      message: Partial<ChatMessage> & { id: string };
    }
  | {
      type: 'delete';
      messageId: string;
    };

const replayPendingConversationRealtimeEvents = ({
  previousMessages,
  pendingEvents,
  currentChannelId,
}: {
  previousMessages: ChatMessage[];
  pendingEvents: PendingConversationRealtimeEvent[];
  currentChannelId: string | null;
}) =>
  pendingEvents.reduce<ChatMessage[]>((nextMessages, pendingEvent) => {
    if (pendingEvent.type === 'insert') {
      return reconcileInsertedConversationMessage({
        previousMessages: nextMessages,
        insertedMessage: pendingEvent.message,
        currentChannelId,
      });
    }

    if (pendingEvent.type === 'update') {
      return nextMessages.map(previousMessage =>
        previousMessage.id === pendingEvent.message.id
          ? {
              ...previousMessage,
              ...pendingEvent.message,
              stableKey: previousMessage.stableKey,
            }
          : previousMessage
      );
    }

    return nextMessages.filter(
      messageItem => messageItem.id !== pendingEvent.messageId
    );
  }, previousMessages);

interface UseChatConversationRuntimeProps {
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
  applyMessageUpdate: (
    updatedMessage: Partial<ChatMessage> & { id: string }
  ) => void;
  markMessageIdsAsDelivered: (
    messageIds: string[],
    sessionToken?: number
  ) => Promise<void>;
  markConversationRecoverySuccess: () => void;
  scheduleConversationRecovery: () => boolean;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  conversationChannelRef: MutableRefObject<RealtimeChannel | null>;
  hasCompletedInitialOpenLoadRef: MutableRefObject<boolean>;
  activeSessionTokenRef: MutableRefObject<number>;
  oldestLoadedMessageCreatedAtRef: MutableRefObject<string | null>;
  isInitialConversationLoadPendingRef: MutableRefObject<boolean>;
  pendingConversationRealtimeEventsRef: MutableRefObject<
    PendingConversationRealtimeEvent[]
  >;
}

export const useChatConversationRuntime = ({
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
  applyMessageUpdate,
  markMessageIdsAsDelivered,
  markConversationRecoverySuccess,
  scheduleConversationRecovery,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  conversationChannelRef,
  hasCompletedInitialOpenLoadRef,
  activeSessionTokenRef,
  oldestLoadedMessageCreatedAtRef,
  isInitialConversationLoadPendingRef,
  pendingConversationRealtimeEventsRef,
}: UseChatConversationRuntimeProps) => {
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

          if (isInitialConversationLoadPendingRef.current) {
            pendingConversationRealtimeEventsRef.current.push({
              type: 'insert',
              message: mappedInsertedMessage,
            });
          }

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
          const mappedUpdatedMessage =
            mapMessageForActiveConversation(updatedMessage);

          if (isInitialConversationLoadPendingRef.current) {
            pendingConversationRealtimeEventsRef.current.push({
              type: 'update',
              message: mappedUpdatedMessage,
            });
          }

          applyMessageUpdate(mappedUpdatedMessage);
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

          if (isInitialConversationLoadPendingRef.current) {
            pendingConversationRealtimeEventsRef.current.push({
              type: 'delete',
              messageId: deletedMessageId,
            });
          }

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
        if (status === 'SUBSCRIBED') {
          markConversationRecoverySuccess();
          return;
        }

        if (status === 'CHANNEL_ERROR') {
          console.error('Failed to connect to chat channel');
          if (conversationChannelRef.current === channel) {
            conversationChannelRef.current = null;
            void chatSidebarGateway.removeRealtimeChannel(channel);
          }
          if (scheduleConversationRecovery()) {
            setLoadError('Realtime chat terputus. Mencoba menyambungkan ulang');
          }
          return;
        }

        if (status === 'TIMED_OUT') {
          console.error('Timed out while connecting to chat channel');
          if (conversationChannelRef.current === channel) {
            conversationChannelRef.current = null;
            void chatSidebarGateway.removeRealtimeChannel(channel);
          }
          if (scheduleConversationRecovery()) {
            setLoadError('Realtime chat terputus. Mencoba menyambungkan ulang');
          }
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
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setLoadError,
    setLoading,
    setMessages,
    setOlderMessagesError,
    conversationChannelRef,
    hasCompletedInitialOpenLoadRef,
    activeSessionTokenRef,
    oldestLoadedMessageCreatedAtRef,
    isInitialConversationLoadPendingRef,
    pendingConversationRealtimeEventsRef,
  ]);
};
