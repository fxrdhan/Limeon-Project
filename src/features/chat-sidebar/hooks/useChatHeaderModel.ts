import { useMemo } from 'react';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import { isPresenceFresh } from '../components/header/presence';
import type { ChatHeaderModel } from '../components/ChatHeader';
import { useChatSidebarControllerContext } from './useChatSidebarControllerContext';

export const useChatHeaderModel = () => {
  const {
    targetUser,
    displayTargetPhotoUrl,
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    isMessageSearchMode,
    messageSearchQuery,
    messageSearchState,
    searchMatchedMessageIds,
    activeSearchResultIndex,
    canNavigateSearchUp,
    canNavigateSearchDown,
    isSelectionMode,
    selectedVisibleMessages,
    canDeleteSelectedMessages,
    searchInputRef,
    handleEnterMessageSearchMode,
    handleExitMessageSearchMode,
    handleEnterMessageSelectionMode,
    handleExitMessageSelectionMode,
    handleMessageSearchQueryChange,
    handleNavigateSearchUp,
    handleNavigateSearchDown,
    handleFocusSearchInput,
    handleCopySelectedMessages,
    handleDeleteSelectedMessages,
    handleClose,
  } = useChatSidebarControllerContext();

  return useMemo<ChatHeaderModel>(
    () => ({
      targetUser,
      displayTargetPhotoUrl,
      isTargetOnline:
        typeof isTargetOnline === 'boolean'
          ? isTargetOnline
          : targetUserPresence?.is_online === true &&
            isPresenceFresh(targetUserPresence.last_seen),
      targetUserPresence,
      targetUserPresenceError,
      isSearchMode: isMessageSearchMode,
      searchQuery: messageSearchQuery,
      searchState: messageSearchState,
      searchResultCount: searchMatchedMessageIds.length,
      activeSearchResultIndex: Math.max(activeSearchResultIndex, 0),
      canNavigateSearchUp,
      canNavigateSearchDown,
      isSelectionMode,
      selectedMessageCount: selectedVisibleMessages.length,
      canDeleteSelectedMessages,
      searchInputRef,
      onEnterSearchMode: handleEnterMessageSearchMode,
      onExitSearchMode: handleExitMessageSearchMode,
      onEnterSelectionMode: handleEnterMessageSelectionMode,
      onExitSelectionMode: handleExitMessageSelectionMode,
      onSearchQueryChange: handleMessageSearchQueryChange,
      onNavigateSearchUp: handleNavigateSearchUp,
      onNavigateSearchDown: handleNavigateSearchDown,
      onFocusSearchInput: handleFocusSearchInput,
      onCopySelectedMessages: handleCopySelectedMessages,
      onDeleteSelectedMessages: handleDeleteSelectedMessages,
      onClose: handleClose,
      getInitials,
      getInitialsColor,
    }),
    [
      activeSearchResultIndex,
      canDeleteSelectedMessages,
      canNavigateSearchDown,
      canNavigateSearchUp,
      displayTargetPhotoUrl,
      handleClose,
      handleCopySelectedMessages,
      handleDeleteSelectedMessages,
      handleEnterMessageSearchMode,
      handleEnterMessageSelectionMode,
      handleExitMessageSearchMode,
      handleExitMessageSelectionMode,
      handleFocusSearchInput,
      handleMessageSearchQueryChange,
      handleNavigateSearchDown,
      handleNavigateSearchUp,
      isMessageSearchMode,
      isSelectionMode,
      isTargetOnline,
      messageSearchQuery,
      messageSearchState,
      searchInputRef,
      searchMatchedMessageIds.length,
      selectedVisibleMessages.length,
      targetUser,
      targetUserPresence,
      targetUserPresenceError,
    ]
  );
};
