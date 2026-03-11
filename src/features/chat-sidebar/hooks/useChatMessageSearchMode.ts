import {
  SEARCH_CONSTANTS,
  SEARCH_STATES,
  type SearchState,
} from '@/components/search-bar/constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';

interface UseChatMessageSearchModeProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  mergeSearchContextMessages: (searchContextMessages: ChatMessage[]) => void;
  user?: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
}

interface SearchCursor {
  afterCreatedAt: string;
  afterId: string;
}

const CHAT_MESSAGE_SEARCH_PAGE_SIZE = 200;

export const useChatMessageSearchMode = ({
  isOpen,
  currentChannelId,
  messages,
  mergeSearchContextMessages,
  user,
  targetUser,
}: UseChatMessageSearchModeProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeSearchRequestIdRef = useRef(0);
  const activeSearchContextRequestIdRef = useRef(0);
  const loadingSearchContextMessageIdRef = useRef<string | null>(null);
  const searchMatchedMessageIdsRef = useRef<string[]>([]);
  const searchCursorRef = useRef<SearchCursor | null>(null);
  const isLoadingMoreSearchResultsRef = useRef(false);
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const normalizedMessageSearchQuery = messageSearchQuery.trim().toLowerCase();
  const userId = user?.id ?? null;
  const targetUserId = targetUser?.id ?? null;

  useEffect(() => {
    searchMatchedMessageIdsRef.current = searchMatchedMessageIds;
  }, [searchMatchedMessageIds]);

  const resetSearchResults = useCallback(() => {
    activeSearchRequestIdRef.current += 1;
    activeSearchContextRequestIdRef.current += 1;
    loadingSearchContextMessageIdRef.current = null;
    searchCursorRef.current = null;
    isLoadingMoreSearchResultsRef.current = false;
    setSearchMatchedMessageIds([]);
    setActiveSearchMessageId(null);
    setSearchNavigationTick(0);
    setIsSearchLoading(false);
    setSearchError(null);
    setHasMoreSearchResults(false);
  }, []);

  const updateSearchCursor = useCallback(
    (matchedMessages: ChatMessage[], nextHasMoreSearchResults: boolean) => {
      const lastMatchedMessage =
        matchedMessages[matchedMessages.length - 1] ?? null;

      if (!nextHasMoreSearchResults || !lastMatchedMessage) {
        searchCursorRef.current = null;
        setHasMoreSearchResults(false);
        return;
      }

      searchCursorRef.current = {
        afterCreatedAt: lastMatchedMessage.created_at,
        afterId: lastMatchedMessage.id,
      };
      setHasMoreSearchResults(true);
    },
    []
  );

  const loadMoreSearchMatches = useCallback(
    async ({
      selectNextResult = false,
    }: {
      selectNextResult?: boolean;
    } = {}) => {
      if (
        !normalizedMessageSearchQuery ||
        !userId ||
        !targetUserId ||
        !currentChannelId ||
        !hasMoreSearchResults ||
        isLoadingMoreSearchResultsRef.current
      ) {
        return false;
      }

      const searchCursor = searchCursorRef.current;
      if (!searchCursor) {
        setHasMoreSearchResults(false);
        return false;
      }

      const requestId = activeSearchRequestIdRef.current;
      isLoadingMoreSearchResultsRef.current = true;

      try {
        const { data: matchedMessagesPage, error } =
          await chatSidebarMessagesGateway.searchConversationMessages(
            targetUserId,
            normalizedMessageSearchQuery,
            {
              afterCreatedAt: searchCursor.afterCreatedAt,
              afterId: searchCursor.afterId,
              limit: CHAT_MESSAGE_SEARCH_PAGE_SIZE,
            }
          );

        if (activeSearchRequestIdRef.current !== requestId) {
          return false;
        }

        if (error || !matchedMessagesPage) {
          if (error) {
            console.error('Error loading more conversation matches:', error);
          }
          return false;
        }

        updateSearchCursor(
          matchedMessagesPage.messages,
          matchedMessagesPage.hasMore
        );

        const existingMessageIds = new Set(searchMatchedMessageIdsRef.current);
        const appendedMatchIds = matchedMessagesPage.messages
          .map(messageItem => messageItem.id)
          .filter(messageId => !existingMessageIds.has(messageId));

        if (appendedMatchIds.length === 0) {
          return false;
        }

        setSearchMatchedMessageIds(previousMessageIds => [
          ...previousMessageIds,
          ...appendedMatchIds,
        ]);

        if (selectNextResult) {
          setActiveSearchMessageId(appendedMatchIds[0] ?? null);
          setSearchNavigationTick(previousTick => previousTick + 1);
        }

        return true;
      } finally {
        if (activeSearchRequestIdRef.current === requestId) {
          isLoadingMoreSearchResultsRef.current = false;
        }
      }
    },
    [
      currentChannelId,
      hasMoreSearchResults,
      normalizedMessageSearchQuery,
      targetUserId,
      updateSearchCursor,
      userId,
    ]
  );

  useEffect(() => {
    if (isOpen) return;
    resetSearchResults();
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
  }, [isOpen, resetSearchResults]);

  useEffect(() => {
    resetSearchResults();
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
  }, [currentChannelId, resetSearchResults]);

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

    activeSearchContextRequestIdRef.current += 1;
    loadingSearchContextMessageIdRef.current = null;

    if (!normalizedMessageSearchQuery) {
      resetSearchResults();
      return;
    }

    if (!userId || !targetUserId || !currentChannelId) {
      setSearchMatchedMessageIds([]);
      setActiveSearchMessageId(null);
      setIsSearchLoading(false);
      setSearchError(null);
      setHasMoreSearchResults(false);
      return;
    }

    const requestId = activeSearchRequestIdRef.current + 1;
    activeSearchRequestIdRef.current = requestId;
    searchCursorRef.current = null;
    isLoadingMoreSearchResultsRef.current = false;
    setIsSearchLoading(true);
    setSearchError(null);
    setHasMoreSearchResults(false);

    const searchTimerId = window.setTimeout(() => {
      void (async () => {
        const { data: matchedMessagesPage, error } =
          await chatSidebarMessagesGateway.searchConversationMessages(
            targetUserId,
            normalizedMessageSearchQuery,
            {
              limit: CHAT_MESSAGE_SEARCH_PAGE_SIZE,
            }
          );

        if (activeSearchRequestIdRef.current !== requestId) {
          return;
        }

        if (error || !matchedMessagesPage) {
          console.error('Error searching conversation messages:', error);
          setSearchMatchedMessageIds([]);
          setActiveSearchMessageId(null);
          setHasMoreSearchResults(false);
          setIsSearchLoading(false);
          setSearchError('Gagal mencari pesan');
          return;
        }

        const nextMatchedMessageIds = matchedMessagesPage.messages.map(
          messageItem => messageItem.id
        );

        updateSearchCursor(
          matchedMessagesPage.messages,
          matchedMessagesPage.hasMore
        );
        setSearchMatchedMessageIds(nextMatchedMessageIds);
        setSearchError(null);
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
    resetSearchResults,
    targetUserId,
    updateSearchCursor,
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
        setSearchNavigationTick(previousTick => previousTick + 1);
        setSearchError(null);
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
    mergeSearchContextMessages,
    normalizedMessageSearchQuery,
    targetUserId,
    userId,
  ]);

  const navigateToSearchResult = useCallback(
    (direction: 'up' | 'down') => {
      if (searchMatchedMessageIds.length === 0) return;

      const currentIndex =
        activeSearchMessageId === null
          ? -1
          : searchMatchedMessageIds.findIndex(
              messageId => messageId === activeSearchMessageId
            );

      if (
        direction === 'down' &&
        currentIndex === searchMatchedMessageIds.length - 1 &&
        hasMoreSearchResults
      ) {
        void loadMoreSearchMatches({
          selectNextResult: true,
        });
        return;
      }

      setActiveSearchMessageId(() => {
        if (currentIndex < 0) {
          return direction === 'up'
            ? (searchMatchedMessageIds[searchMatchedMessageIds.length - 1] ??
                null)
            : (searchMatchedMessageIds[0] ?? null);
        }

        const nextIndex =
          direction === 'up'
            ? Math.max(0, currentIndex - 1)
            : Math.min(searchMatchedMessageIds.length - 1, currentIndex + 1);

        return searchMatchedMessageIds[nextIndex] ?? null;
      });
      setSearchNavigationTick(previousTick => previousTick + 1);
    },
    [
      activeSearchMessageId,
      hasMoreSearchResults,
      loadMoreSearchMatches,
      searchMatchedMessageIds,
    ]
  );

  const handleEnterMessageSearchMode = useCallback(() => {
    setIsMessageSearchMode(true);
  }, []);

  const handleExitMessageSearchMode = useCallback(() => {
    resetSearchResults();
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
  }, [resetSearchResults]);

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
  const canNavigateSearchUp =
    searchMatchedMessageIds.length > 0 && activeSearchResultIndex !== 0;
  const canNavigateSearchDown =
    searchMatchedMessageIds.length > 0 &&
    (activeSearchResultIndex < searchMatchedMessageIds.length - 1 ||
      hasMoreSearchResults);
  const messageSearchState: SearchState = !normalizedMessageSearchQuery
    ? SEARCH_STATES.IDLE
    : searchError
      ? SEARCH_STATES.ERROR
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
    hasMoreSearchResults,
    messageSearchState,
    handleEnterMessageSearchMode,
    handleExitMessageSearchMode,
    handleFocusSearchInput,
    handleMessageSearchQueryChange,
    handleNavigateSearchUp,
    handleNavigateSearchDown,
  };
};
