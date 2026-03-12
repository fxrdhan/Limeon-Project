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

interface SearchCursor {
  afterCreatedAt: string;
  afterId: string;
}

interface UseChatMessageSearchResultsProps {
  isOpen: boolean;
  isMessageSearchMode: boolean;
  currentChannelId: string | null;
  normalizedMessageSearchQuery: string;
  userId: string | null;
  targetUserId: string | null;
}

const CHAT_MESSAGE_SEARCH_PAGE_SIZE = 200;

export const useChatMessageSearchResults = ({
  isOpen,
  isMessageSearchMode,
  currentChannelId,
  normalizedMessageSearchQuery,
  userId,
  targetUserId,
}: UseChatMessageSearchResultsProps) => {
  const activeSearchRequestIdRef = useRef(0);
  const searchMatchedMessageIdsRef = useRef<string[]>([]);
  const searchCursorRef = useRef<SearchCursor | null>(null);
  const isLoadingMoreSearchResultsRef = useRef(false);
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

  useEffect(() => {
    searchMatchedMessageIdsRef.current = searchMatchedMessageIds;
  }, [searchMatchedMessageIds]);

  const resetSearchResults = useCallback(() => {
    activeSearchRequestIdRef.current += 1;
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
  }, [isOpen, resetSearchResults]);

  useEffect(() => {
    resetSearchResults();
  }, [currentChannelId, resetSearchResults]);

  useEffect(() => {
    if (!isMessageSearchMode) {
      return;
    }

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

  const handleNavigateSearchUp = useCallback(() => {
    navigateToSearchResult('up');
  }, [navigateToSearchResult]);

  const handleNavigateSearchDown = useCallback(() => {
    navigateToSearchResult('down');
  }, [navigateToSearchResult]);

  const bumpSearchNavigationTick = useCallback(() => {
    setSearchNavigationTick(previousTick => previousTick + 1);
  }, []);

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
    searchMatchedMessageIds,
    searchMatchedMessageIdSet,
    activeSearchMessageId,
    searchNavigationTick,
    activeSearchResultIndex,
    canNavigateSearchUp,
    canNavigateSearchDown,
    hasMoreSearchResults,
    messageSearchState,
    handleNavigateSearchUp,
    handleNavigateSearchDown,
    setSearchError,
    bumpSearchNavigationTick,
    resetSearchResults,
  };
};
