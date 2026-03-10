import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { CHAT_CONVERSATION_PAGE_SIZE } from '../constants';
import {
  chatSidebarGateway,
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
  messagesCount: number;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
}

interface ReconcileConversationFromServerOptions {
  conversationScopeKey: string | null;
  fallbackMessages?: ChatMessage[];
}

export const useChatConversationReconciler = ({
  user,
  targetUser,
  currentChannelId,
  messagesCount,
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
        const { data: latestMessages, error } =
          await chatSidebarGateway.fetchConversationMessages(targetUser.id, {
            limit: Math.max(messagesCount, CHAT_CONVERSATION_PAGE_SIZE),
          });

        if (!isConversationScopeActive(conversationScopeKey)) {
          return;
        }

        const latestMessagesPayload = Array.isArray(latestMessages)
          ? {
              messages: latestMessages,
              hasMore: false,
            }
          : latestMessages;

        if (error || !latestMessagesPayload?.messages) {
          if (fallbackMessages) {
            setMessages(fallbackMessages);
          }
          return;
        }

        reconcileConversationMessages({
          latestMessages: latestMessagesPayload.messages,
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
      messagesCount,
      setMessages,
      targetUser,
      user,
    ]
  );
