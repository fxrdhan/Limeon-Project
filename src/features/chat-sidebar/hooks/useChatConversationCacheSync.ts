import type { MutableRefObject } from 'react';
import { useEffect } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { setConversationCacheEntry } from '../utils/conversation-cache';

interface UseChatConversationCacheSyncProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  hasOlderMessages: boolean;
  hasCompletedInitialOpenLoadRef: MutableRefObject<boolean>;
}

export const useChatConversationCacheSync = ({
  isOpen,
  currentChannelId,
  messages,
  hasOlderMessages,
  hasCompletedInitialOpenLoadRef,
}: UseChatConversationCacheSyncProps) => {
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

    setConversationCacheEntry(
      currentChannelId,
      persistedMessages,
      hasOlderMessages
    );
  }, [
    currentChannelId,
    hasCompletedInitialOpenLoadRef,
    hasOlderMessages,
    isOpen,
    messages,
  ]);
};
