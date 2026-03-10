import {
  SEARCH_CONSTANTS,
  SEARCH_STATES,
  type SearchState,
} from '@/components/search-bar/constants';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  mapConversationMessageForDisplay,
  mergeConversationContextWithExisting,
} from '../utils/conversation-sync';

interface UseChatMessageSearchModeProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  user?: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
}

export const useChatMessageSearchMode = ({
  isOpen,
  currentChannelId,
  messages,
  setMessages,
  user,
  targetUser,
}: UseChatMessageSearchModeProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeSearchRequestIdRef = useRef(0);
  const activeSearchContextRequestIdRef = useRef(0);
  const loadingSearchContextMessageIdRef = useRef<string | null>(null);
  const [isMessageSearchMode, setIsMessageSearchMode] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchMatchedMessageIds, setSearchMatchedMessageIds] = useState<
    string[]
  >([]);
  const [activeSearchMessageId, setActiveSearchMessageId] = useState<
    string | null
  >(null);
  const [searchNavigationTick, setSearchNavigationTick] = useState(0);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const normalizedMessageSearchQuery = messageSearchQuery.trim().toLowerCase();
  const userId = user?.id ?? null;
  const userName = user?.name ?? 'You';
  const targetUserId = targetUser?.id ?? null;
  const targetUserName = targetUser?.name ?? 'Unknown';

  useEffect(() => {
    if (isOpen) return;
    activeSearchRequestIdRef.current += 1;
    activeSearchContextRequestIdRef.current += 1;
    loadingSearchContextMessageIdRef.current = null;
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
    setSearchMatchedMessageIds([]);
    setActiveSearchMessageId(null);
    setSearchNavigationTick(0);
    setIsSearchLoading(false);
  }, [isOpen]);

  useEffect(() => {
    activeSearchRequestIdRef.current += 1;
    activeSearchContextRequestIdRef.current += 1;
    loadingSearchContextMessageIdRef.current = null;
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
    setSearchMatchedMessageIds([]);
    setActiveSearchMessageId(null);
    setSearchNavigationTick(0);
    setIsSearchLoading(false);
  }, [currentChannelId]);

  useEffect(() => {
    if (!isMessageSearchMode) return;

    const rafId = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isMessageSearchMode]);

  useEffect(() => {
    if (!isMessageSearchMode) {
      return;
    }

    if (!normalizedMessageSearchQuery) {
      activeSearchRequestIdRef.current += 1;
      setSearchMatchedMessageIds([]);
      setActiveSearchMessageId(null);
      setIsSearchLoading(false);
      return;
    }

    if (!userId || !targetUserId || !currentChannelId) {
      setSearchMatchedMessageIds([]);
      setActiveSearchMessageId(null);
      setIsSearchLoading(false);
      return;
    }

    const requestId = activeSearchRequestIdRef.current + 1;
    activeSearchRequestIdRef.current = requestId;
    setIsSearchLoading(true);

    const searchTimerId = window.setTimeout(() => {
      void (async () => {
        const { data: matchedMessages, error } =
          await chatSidebarGateway.searchConversationMessages(
            targetUserId,
            normalizedMessageSearchQuery
          );

        if (activeSearchRequestIdRef.current !== requestId) {
          return;
        }

        if (error) {
          console.error('Error searching conversation messages:', error);
          setSearchMatchedMessageIds([]);
          setActiveSearchMessageId(null);
          setIsSearchLoading(false);
          return;
        }

        const nextMatchedMessageIds = (matchedMessages || []).map(
          messageItem => messageItem.id
        );

        setSearchMatchedMessageIds(nextMatchedMessageIds);
        setActiveSearchMessageId(currentMessageId => {
          if (
            currentMessageId &&
            nextMatchedMessageIds.includes(currentMessageId)
          ) {
            return currentMessageId;
          }

          return nextMatchedMessageIds[0] ?? null;
        });
        setIsSearchLoading(false);
      })();
    }, SEARCH_CONSTANTS.DEBOUNCE_DELAY);

    return () => {
      window.clearTimeout(searchTimerId);
    };
  }, [
    currentChannelId,
    isMessageSearchMode,
    normalizedMessageSearchQuery,
    targetUserId,
    userId,
  ]);

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

    void (async () => {
      try {
        const { data: searchContextMessages, error } =
          await chatSidebarGateway.fetchConversationMessageContext(
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
          return;
        }

        const mappedContextMessages = searchContextMessages.map(messageItem =>
          mapConversationMessageForDisplay(
            messageItem,
            {
              id: userId,
              name: userName,
            },
            {
              id: targetUserId,
              name: targetUserName,
              email: targetUser?.email ?? '',
              profilephoto: targetUser?.profilephoto ?? null,
            },
            messageItem.stableKey || messageItem.id
          )
        );

        setMessages(previousMessages =>
          mergeConversationContextWithExisting(
            previousMessages,
            mappedContextMessages,
            currentChannelId
          )
        );
        setSearchNavigationTick(previousTick => previousTick + 1);
      } finally {
        if (activeSearchContextRequestIdRef.current === requestId) {
          loadingSearchContextMessageIdRef.current = null;
        }
      }
    })();
  }, [
    activeSearchMessageId,
    currentChannelId,
    isMessageSearchMode,
    isOpen,
    messages,
    normalizedMessageSearchQuery,
    setMessages,
    targetUser?.email,
    targetUser?.profilephoto,
    targetUserId,
    targetUserName,
    userId,
    userName,
  ]);

  const navigateToSearchResult = useCallback(
    (direction: 'up' | 'down') => {
      if (searchMatchedMessageIds.length === 0) return;

      setActiveSearchMessageId(currentMessageId => {
        const currentIndex =
          currentMessageId === null
            ? -1
            : searchMatchedMessageIds.findIndex(
                messageId => messageId === currentMessageId
              );
        const fallbackIndex =
          direction === 'up' ? searchMatchedMessageIds.length - 1 : 0;
        const safeCurrentIndex =
          currentIndex >= 0 ? currentIndex : fallbackIndex;
        const nextIndex =
          direction === 'up'
            ? Math.max(0, safeCurrentIndex - 1)
            : Math.min(
                searchMatchedMessageIds.length - 1,
                safeCurrentIndex + 1
              );

        return searchMatchedMessageIds[nextIndex];
      });
      setSearchNavigationTick(previousTick => previousTick + 1);
    },
    [searchMatchedMessageIds]
  );

  const handleEnterMessageSearchMode = useCallback(() => {
    setIsMessageSearchMode(true);
  }, []);

  const handleExitMessageSearchMode = useCallback(() => {
    activeSearchRequestIdRef.current += 1;
    activeSearchContextRequestIdRef.current += 1;
    loadingSearchContextMessageIdRef.current = null;
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
    setSearchMatchedMessageIds([]);
    setActiveSearchMessageId(null);
    setSearchNavigationTick(0);
    setIsSearchLoading(false);
  }, []);

  const handleFocusSearchInput = useCallback(() => {
    if (!isMessageSearchMode) return;
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isMessageSearchMode]);

  const handleMessageSearchQueryChange = useCallback((nextQuery: string) => {
    setMessageSearchQuery(nextQuery);
  }, []);

  const handleNavigateSearchUp = useCallback(() => {
    navigateToSearchResult('up');
  }, [navigateToSearchResult]);

  const handleNavigateSearchDown = useCallback(() => {
    navigateToSearchResult('down');
  }, [navigateToSearchResult]);

  const activeSearchResultIndex = searchMatchedMessageIds.findIndex(
    messageId => messageId === activeSearchMessageId
  );
  const canNavigateSearchUp = activeSearchResultIndex > 0;
  const canNavigateSearchDown =
    activeSearchResultIndex >= 0 &&
    activeSearchResultIndex < searchMatchedMessageIds.length - 1;
  const messageSearchState: SearchState = !normalizedMessageSearchQuery
    ? SEARCH_STATES.IDLE
    : isSearchLoading
      ? SEARCH_STATES.TYPING
      : searchMatchedMessageIds.length > 0
        ? SEARCH_STATES.FOUND
        : SEARCH_STATES.NOT_FOUND;
  const searchMatchedMessageIdSet = useMemo(
    () => new Set(searchMatchedMessageIds),
    [searchMatchedMessageIds]
  );

  return {
    searchInputRef,
    isMessageSearchMode,
    messageSearchQuery,
    activeSearchMessageId,
    searchNavigationTick,
    normalizedMessageSearchQuery,
    searchMatchedMessageIds,
    searchMatchedMessageIdSet,
    activeSearchResultIndex,
    canNavigateSearchUp,
    canNavigateSearchDown,
    messageSearchState,
    handleEnterMessageSearchMode,
    handleExitMessageSearchMode,
    handleFocusSearchInput,
    handleMessageSearchQueryChange,
    handleNavigateSearchUp,
    handleNavigateSearchDown,
  };
};
