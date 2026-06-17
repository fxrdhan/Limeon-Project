import { useCallback, useEffect, useRef, useState } from 'react';
import { type ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { useChatMessageSearchContext } from './useChatMessageSearchContext';
import { useChatMessageSearchResults } from './useChatMessageSearchResults';

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

export const useChatMessageSearchMode = ({
  isOpen,
  currentChannelId,
  messages,
  mergeSearchContextMessages,
  user,
  targetUser,
}: UseChatMessageSearchModeProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInputFocusFrameRef = useRef<number | null>(null);
  const searchInputFocusRequestRef = useRef(0);
  const [isMessageSearchMode, setIsMessageSearchMode] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const normalizedMessageSearchQuery = messageSearchQuery.trim().toLowerCase();
  const userId = user?.id ?? null;
  const targetUserId = targetUser?.id ?? null;

  const searchResults = useChatMessageSearchResults({
    isOpen,
    isMessageSearchMode,
    currentChannelId,
    normalizedMessageSearchQuery,
    userId,
    targetUserId,
  });
  const {
    activeSearchMessageId,
    searchNavigationTick,
    searchMatchedMessageIds,
    searchMatchedMessageIdSet,
    activeSearchResultIndex,
    canNavigateSearchUp,
    canNavigateSearchDown,
    hasMoreSearchResults,
    messageSearchState,
    handleNavigateSearchUp: navigateSearchUp,
    handleNavigateSearchDown: navigateSearchDown,
    setSearchError,
    bumpSearchNavigationTick,
    resetSearchResults,
  } = searchResults;

  const clearPendingSearchInputFocusFrame = useCallback(() => {
    searchInputFocusRequestRef.current += 1;

    if (searchInputFocusFrameRef.current === null) {
      return;
    }

    cancelAnimationFrame(searchInputFocusFrameRef.current);
    searchInputFocusFrameRef.current = null;
  }, []);

  const scheduleSearchInputFocus = useCallback(() => {
    clearPendingSearchInputFocusFrame();

    const focusRequestId = searchInputFocusRequestRef.current + 1;
    let didRunSynchronously = false;
    searchInputFocusRequestRef.current = focusRequestId;

    const frameId = requestAnimationFrame(() => {
      didRunSynchronously = true;

      if (searchInputFocusRequestRef.current !== focusRequestId) {
        return;
      }

      searchInputFocusFrameRef.current = null;
      searchInputRef.current?.focus();
    });

    if (didRunSynchronously) {
      return;
    }

    searchInputFocusFrameRef.current = frameId;
  }, [clearPendingSearchInputFocusFrame]);

  useEffect(() => {
    if (!isMessageSearchMode) return;

    scheduleSearchInputFocus();

    return () => {
      clearPendingSearchInputFocusFrame();
    };
  }, [
    clearPendingSearchInputFocusFrame,
    isMessageSearchMode,
    scheduleSearchInputFocus,
  ]);

  useChatMessageSearchContext({
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
  });

  const resetSearchModeState = useCallback(() => {
    clearPendingSearchInputFocusFrame();
    resetSearchResults();
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
  }, [clearPendingSearchInputFocusFrame, resetSearchResults]);

  useEffect(() => {
    if (isOpen) return;
    resetSearchModeState();
  }, [isOpen, resetSearchModeState]);

  useEffect(() => {
    resetSearchModeState();
  }, [currentChannelId, resetSearchModeState]);

  const handleEnterMessageSearchMode = useCallback(() => {
    setIsMessageSearchMode(true);
  }, []);

  const handleExitMessageSearchMode = useCallback(() => {
    resetSearchModeState();
  }, [resetSearchModeState]);

  const handleFocusSearchInput = useCallback(() => {
    if (!isMessageSearchMode) return;
    scheduleSearchInputFocus();
  }, [isMessageSearchMode, scheduleSearchInputFocus]);

  useEffect(
    () => () => {
      clearPendingSearchInputFocusFrame();
    },
    [clearPendingSearchInputFocusFrame]
  );

  const handleMessageSearchQueryChange = useCallback((nextQuery: string) => {
    setMessageSearchQuery(nextQuery);
  }, []);

  const handleNavigateSearchUp = useCallback(() => {
    navigateSearchUp();
  }, [navigateSearchUp]);

  const handleNavigateSearchDown = useCallback(() => {
    navigateSearchDown();
  }, [navigateSearchDown]);

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
