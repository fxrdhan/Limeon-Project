import { useMemo } from 'react';
import type { ChatHeaderModel } from '../models';
import type { ChatSidebarPanelTargetUser } from '../types';
import type { UserPresence } from '../data/chatSidebarGateway';
import type { SearchState } from '@/components/search-bar/constants';

interface UseChatHeaderModelProps {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  isTargetOnline: boolean;
  targetUserPresence: UserPresence | null;
  targetUserPresenceError: string | null;
  isSearchMode: boolean;
  searchQuery: string;
  searchState: SearchState;
  searchResultCount: number;
  activeSearchResultIndex: number;
  canNavigateSearchUp: boolean;
  canNavigateSearchDown: boolean;
  hasMoreSearchResults?: boolean;
  isSelectionMode: boolean;
  selectedMessageCount: number;
  canDeleteSelectedMessages: boolean;
  searchInputRef: ChatHeaderModel['searchInputRef'];
  onEnterSearchMode: ChatHeaderModel['onEnterSearchMode'];
  onExitSearchMode: ChatHeaderModel['onExitSearchMode'];
  onEnterSelectionMode: ChatHeaderModel['onEnterSelectionMode'];
  onExitSelectionMode: ChatHeaderModel['onExitSelectionMode'];
  onSearchQueryChange: ChatHeaderModel['onSearchQueryChange'];
  onNavigateSearchUp: ChatHeaderModel['onNavigateSearchUp'];
  onNavigateSearchDown: ChatHeaderModel['onNavigateSearchDown'];
  onFocusSearchInput: ChatHeaderModel['onFocusSearchInput'];
  onCopySelectedMessages: ChatHeaderModel['onCopySelectedMessages'];
  onDeleteSelectedMessages: ChatHeaderModel['onDeleteSelectedMessages'];
  onClose: ChatHeaderModel['onClose'];
  getInitials: ChatHeaderModel['getInitials'];
  getInitialsColor: ChatHeaderModel['getInitialsColor'];
}

export const useChatHeaderModel = ({
  targetUser,
  displayTargetPhotoUrl,
  isTargetOnline,
  targetUserPresence,
  targetUserPresenceError,
  isSearchMode,
  searchQuery,
  searchState,
  searchResultCount,
  activeSearchResultIndex,
  canNavigateSearchUp,
  canNavigateSearchDown,
  hasMoreSearchResults,
  isSelectionMode,
  selectedMessageCount,
  canDeleteSelectedMessages,
  searchInputRef,
  onEnterSearchMode,
  onExitSearchMode,
  onEnterSelectionMode,
  onExitSelectionMode,
  onSearchQueryChange,
  onNavigateSearchUp,
  onNavigateSearchDown,
  onFocusSearchInput,
  onCopySelectedMessages,
  onDeleteSelectedMessages,
  onClose,
  getInitials,
  getInitialsColor,
}: UseChatHeaderModelProps): ChatHeaderModel =>
  useMemo(
    () => ({
      targetUser,
      displayTargetPhotoUrl,
      isTargetOnline,
      targetUserPresence,
      targetUserPresenceError,
      isSearchMode,
      searchQuery,
      searchState,
      searchResultCount,
      activeSearchResultIndex: Math.max(activeSearchResultIndex, 0),
      canNavigateSearchUp,
      canNavigateSearchDown,
      hasMoreSearchResults,
      isSelectionMode,
      selectedMessageCount,
      canDeleteSelectedMessages,
      searchInputRef,
      onEnterSearchMode,
      onExitSearchMode,
      onEnterSelectionMode,
      onExitSelectionMode,
      onSearchQueryChange,
      onNavigateSearchUp,
      onNavigateSearchDown,
      onFocusSearchInput,
      onCopySelectedMessages,
      onDeleteSelectedMessages,
      onClose,
      getInitials,
      getInitialsColor,
    }),
    [
      activeSearchResultIndex,
      canDeleteSelectedMessages,
      canNavigateSearchDown,
      canNavigateSearchUp,
      displayTargetPhotoUrl,
      getInitials,
      getInitialsColor,
      hasMoreSearchResults,
      isSearchMode,
      isSelectionMode,
      isTargetOnline,
      onClose,
      onCopySelectedMessages,
      onDeleteSelectedMessages,
      onEnterSearchMode,
      onEnterSelectionMode,
      onExitSearchMode,
      onExitSelectionMode,
      onFocusSearchInput,
      onNavigateSearchDown,
      onNavigateSearchUp,
      onSearchQueryChange,
      searchInputRef,
      searchQuery,
      searchResultCount,
      searchState,
      selectedMessageCount,
      targetUser,
      targetUserPresence,
      targetUserPresenceError,
    ]
  );
