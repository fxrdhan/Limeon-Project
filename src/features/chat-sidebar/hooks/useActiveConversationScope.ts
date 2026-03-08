import { useCallback, useEffect, useRef } from 'react';
import { getConversationScopeKey } from '../utils/conversation-scope';

interface UseActiveConversationScopeProps {
  userId?: string | null;
  targetUserId?: string | null;
  channelId?: string | null;
}

export const useActiveConversationScope = ({
  userId,
  targetUserId,
  channelId,
}: UseActiveConversationScopeProps) => {
  const activeConversationScopeKeyRef = useRef<string | null>(
    getConversationScopeKey(userId, targetUserId, channelId)
  );

  useEffect(() => {
    activeConversationScopeKeyRef.current = getConversationScopeKey(
      userId,
      targetUserId,
      channelId
    );
  }, [channelId, targetUserId, userId]);

  const isConversationScopeActive = useCallback(
    (conversationScopeKey: string | null) =>
      Boolean(conversationScopeKey) &&
      activeConversationScopeKeyRef.current === conversationScopeKey,
    []
  );

  return {
    isConversationScopeActive,
  };
};
