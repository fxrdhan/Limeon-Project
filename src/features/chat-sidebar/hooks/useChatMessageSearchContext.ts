import { useEffect, useRef } from 'react';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';

interface UseChatMessageSearchContextProps {
  isOpen: boolean;
  isMessageSearchMode: boolean;
  normalizedMessageSearchQuery: string;
  activeSearchMessageId: string | null;
  userId: string | null;
  targetUserId: string | null;
  currentChannelId: string | null;
  messages: ChatMessage[];
  mergeSearchContextMessages: (searchContextMessages: ChatMessage[]) => void;
  setSearchError: (value: string | null) => void;
  bumpSearchNavigationTick: () => void;
}

export const useChatMessageSearchContext = ({
  isOpen,
  isMessageSearchMode,
  normalizedMessageSearchQuery,
  activeSearchMessageId,
  userId,
  targetUserId,
  currentChannelId,
  messages,
  mergeSearchContextMessages,
  setSearchError,
  bumpSearchNavigationTick,
}: UseChatMessageSearchContextProps) => {
  const activeSearchContextRequestIdRef = useRef(0);
  const loadingSearchContextMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isOpen ||
      !isMessageSearchMode ||
      !normalizedMessageSearchQuery ||
      !activeSearchMessageId ||
      !userId ||
      !targetUserId ||
      !currentChannelId
    ) {
      activeSearchContextRequestIdRef.current += 1;
      loadingSearchContextMessageIdRef.current = null;
      return;
    }

    if (
      messages.some(messageItem => messageItem.id === activeSearchMessageId)
    ) {
      return;
    }

    if (loadingSearchContextMessageIdRef.current === activeSearchMessageId) {
      return;
    }

    const requestId = activeSearchContextRequestIdRef.current + 1;
    activeSearchContextRequestIdRef.current = requestId;
    loadingSearchContextMessageIdRef.current = activeSearchMessageId;
    setSearchError(null);

    void (async () => {
      try {
        const { data: searchContextMessages, error } =
          await chatSidebarMessagesGateway.fetchConversationMessageContext(
            targetUserId,
            activeSearchMessageId
          );

        if (activeSearchContextRequestIdRef.current !== requestId) {
          return;
        }

        if (error || !searchContextMessages) {
          if (error) {
            console.error('Error loading search message context:', error);
          }
          setSearchError('Gagal memuat konteks pencarian');
          return;
        }

        mergeSearchContextMessages(searchContextMessages);
        bumpSearchNavigationTick();
        setSearchError(null);
      } finally {
        if (activeSearchContextRequestIdRef.current === requestId) {
          loadingSearchContextMessageIdRef.current = null;
        }
      }
    })();
  }, [
    activeSearchMessageId,
    bumpSearchNavigationTick,
    currentChannelId,
    isMessageSearchMode,
    isOpen,
    messages,
    mergeSearchContextMessages,
    normalizedMessageSearchQuery,
    setSearchError,
    targetUserId,
    userId,
  ]);
};
