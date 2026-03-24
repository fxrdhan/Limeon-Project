import type { ChatHeaderModel } from '../models';
import type { ChatSidebarRuntimeState } from './useChatSidebarRuntimeState';

export const useChatHeaderModel = (
  runtime: ChatSidebarRuntimeState
): ChatHeaderModel => ({
  targetUser: runtime.targetUser,
  displayTargetPhotoUrl: runtime.displayTargetPhotoUrl,
  isTargetOnline: runtime.session.isTargetOnline,
  targetUserPresence: runtime.session.targetUserPresence,
  targetUserPresenceError: runtime.session.targetUserPresenceError,
  isSearchMode: runtime.interaction.isMessageSearchMode,
  searchQuery: runtime.interaction.messageSearchQuery,
  searchState: runtime.interaction.messageSearchState,
  searchResultCount: runtime.interaction.searchMatchedMessageIds.length,
  canNavigateSearchUp: runtime.interaction.canNavigateSearchUp,
  canNavigateSearchDown: runtime.interaction.canNavigateSearchDown,
  hasMoreSearchResults: runtime.interaction.hasMoreSearchResults,
  isSelectionMode: runtime.interaction.isSelectionMode,
  selectedMessageCount: runtime.interaction.selectedVisibleMessages.length,
  canDeleteSelectedMessages: runtime.interaction.canDeleteSelectedMessages,
  searchInputRef: runtime.interaction.searchInputRef,
  onEnterSearchMode: runtime.interaction.handleEnterMessageSearchMode,
  onExitSearchMode: runtime.interaction.handleExitMessageSearchMode,
  onEnterSelectionMode: runtime.interaction.handleEnterMessageSelectionMode,
  onClearSelectedMessages: runtime.interaction.handleClearSelectedMessages,
  onExitSelectionMode: runtime.interaction.handleExitMessageSelectionMode,
  onSearchQueryChange: runtime.interaction.handleMessageSearchQueryChange,
  onNavigateSearchUp: runtime.interaction.handleNavigateSearchUp,
  onNavigateSearchDown: runtime.interaction.handleNavigateSearchDown,
  onFocusSearchInput: runtime.interaction.handleFocusSearchInput,
  onCopySelectedMessages: runtime.interaction.handleCopySelectedMessages,
  onDeleteSelectedMessages: runtime.actions.handleDeleteSelectedMessages,
  onClose: runtime.actions.handleClose,
  getInitials: runtime.actions.getInitials,
  getInitialsColor: runtime.actions.getInitialsColor,
  activeSearchResultIndex: Math.max(
    runtime.interaction.activeSearchResultIndex,
    0
  ),
});
