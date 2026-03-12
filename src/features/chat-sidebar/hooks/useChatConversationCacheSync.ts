import type { MutableRefObject } from 'react';
import { useEffect } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';

interface UseChatConversationCacheSyncProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  hasOlderMessages: boolean;
  hasCompletedInitialOpenLoadRef: MutableRefObject<boolean>;
  excludedMessageIdsRef?: MutableRefObject<Set<string>>;
}

export const useChatConversationCacheSync = ({
  isOpen,
  currentChannelId,
  messages,
  hasOlderMessages,
  hasCompletedInitialOpenLoadRef,
  excludedMessageIdsRef,
}: UseChatConversationCacheSyncProps) => {
  useEffect(() => {
    const excludedMessageIds = excludedMessageIdsRef?.current ?? null;

    if (
      !isOpen ||
      !currentChannelId ||
      !hasCompletedInitialOpenLoadRef.current
    ) {
      return;
    }

    const persistedMessages = messages.filter(
      messageItem =>
        !messageItem.id.startsWith('temp_') &&
        !excludedMessageIds?.has(messageItem.id)
    );

    chatRuntimeCache.conversation.setEntry(
      currentChannelId,
      persistedMessages,
      hasOlderMessages
    );
  }, [
    currentChannelId,
    excludedMessageIdsRef,
    hasCompletedInitialOpenLoadRef,
    hasOlderMessages,
    isOpen,
    messages,
  ]);
};
