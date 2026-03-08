import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
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
          await chatSidebarGateway.fetchConversationMessages(
            user.id,
            targetUser.id,
            currentChannelId
          );

        if (!isConversationScopeActive(conversationScopeKey)) {
          return;
        }

        if (error || !latestMessages) {
          if (fallbackMessages) {
            setMessages(fallbackMessages);
          }
          return;
        }

        reconcileConversationMessages({
          latestMessages,
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
    [currentChannelId, isConversationScopeActive, setMessages, targetUser, user]
  );
