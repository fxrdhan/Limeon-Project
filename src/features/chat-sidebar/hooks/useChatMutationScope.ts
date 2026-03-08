import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { getConversationScopeKey } from '../utils/conversation-scope';
import { useActiveConversationScope } from './useActiveConversationScope';
import { useChatConversationReconciler } from './useChatConversationReconciler';

interface UseChatMutationScopeProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

export const useChatMutationScope = ({
  user,
  targetUser,
  currentChannelId,
  setMessages,
}: UseChatMutationScopeProps) => {
  const conversationScopeKey = useMemo(
    () => getConversationScopeKey(user?.id, targetUser?.id, currentChannelId),
    [currentChannelId, targetUser?.id, user?.id]
  );

  const { isConversationScopeActive } = useActiveConversationScope({
    userId: user?.id,
    targetUserId: targetUser?.id,
    channelId: currentChannelId,
  });

  const reconcileMessagesFromServer = useChatConversationReconciler({
    user,
    targetUser,
    currentChannelId,
    setMessages,
    isConversationScopeActive,
  });

  const runIfConversationScopeActive = useCallback(
    (targetConversationScopeKey: string | null, effect: () => void) => {
      if (!isConversationScopeActive(targetConversationScopeKey)) {
        return false;
      }

      effect();
      return true;
    },
    [isConversationScopeActive]
  );

  return {
    conversationScopeKey,
    isConversationScopeActive,
    reconcileMessagesFromServer,
    runIfConversationScopeActive,
  };
};
