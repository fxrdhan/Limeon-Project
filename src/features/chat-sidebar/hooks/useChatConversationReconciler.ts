import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { CHAT_CONVERSATION_PAGE_SIZE } from '../constants';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { reconcileConversationMessages } from '../utils/conversation-sync';

interface UseChatConversationReconcilerProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
}

interface ReconcileConversationFromServerOptions {
  conversationScopeKey: string | null;
  fallbackMessages?: ChatMessage[];
}

const CHAT_CONVERSATION_RECONCILE_BATCH_SIZE = 200;

const countPersistedConversationMessages = (
  messages: ChatMessage[],
  currentChannelId: string | null
) =>
  messages.filter(messageItem => {
    if (messageItem.id.startsWith('temp_')) {
      return false;
    }

    if (currentChannelId && messageItem.channel_id !== currentChannelId) {
      return false;
    }

    return true;
  }).length;

export const useChatConversationReconciler = ({
  user,
  targetUser,
  currentChannelId,
  messages,
  setMessages,
  isConversationScopeActive,
}: UseChatConversationReconcilerProps) =>
  useCallback(
    async ({
      conversationScopeKey,
      fallbackMessages,
    }: ReconcileConversationFromServerOptions) => {
      if (!isConversationScopeActive(conversationScopeKey)) {
        return;
      }

      if (!user || !targetUser || !currentChannelId) {
        if (
          fallbackMessages &&
          isConversationScopeActive(conversationScopeKey)
        ) {
          setMessages(fallbackMessages);
        }
        return;
      }

      try {
        const currentMessages = fallbackMessages ?? messages;
        const targetPersistedMessageCount = Math.max(
          countPersistedConversationMessages(currentMessages, currentChannelId),
          CHAT_CONVERSATION_PAGE_SIZE
        );
        const reconciledSnapshot: ChatMessage[] = [];
        let beforeCreatedAt: string | null = null;
        let beforeId: string | null = null;
        let hasMoreMessages = true;
        let error: unknown = null;

        while (
          hasMoreMessages &&
          reconciledSnapshot.length < targetPersistedMessageCount
        ) {
          const { data: latestMessagesPage, error: fetchError } =
            await chatSidebarMessagesGateway.fetchConversationMessages(
              targetUser.id,
              {
                beforeCreatedAt,
                beforeId,
                limit: Math.max(
                  CHAT_CONVERSATION_PAGE_SIZE,
                  Math.min(
                    targetPersistedMessageCount - reconciledSnapshot.length,
                    CHAT_CONVERSATION_RECONCILE_BATCH_SIZE
                  )
                ),
              }
            );

          if (!isConversationScopeActive(conversationScopeKey)) {
            return;
          }

          if (fetchError || !latestMessagesPage) {
            error = fetchError;
            break;
          }

          if (latestMessagesPage.messages.length === 0) {
            hasMoreMessages = false;
            break;
          }

          reconciledSnapshot.unshift(...latestMessagesPage.messages);
          hasMoreMessages = latestMessagesPage.hasMore;

          const oldestLoadedMessage = reconciledSnapshot[0];
          beforeCreatedAt = oldestLoadedMessage?.created_at ?? null;
          beforeId = oldestLoadedMessage?.id ?? null;
        }

        if (!isConversationScopeActive(conversationScopeKey)) {
          return;
        }

        if (error) {
          if (fallbackMessages) {
            setMessages(fallbackMessages);
          }
          return;
        }

        reconcileConversationMessages({
          latestMessages: reconciledSnapshot,
          user,
          targetUser,
          currentChannelId,
          setMessages,
        });
      } catch (error) {
        console.error('Error reconciling conversation:', error);
        if (
          fallbackMessages &&
          isConversationScopeActive(conversationScopeKey)
        ) {
          setMessages(fallbackMessages);
        }
      }
    },
    [
      currentChannelId,
      isConversationScopeActive,
      messages,
      setMessages,
      targetUser,
      user,
    ]
  );
