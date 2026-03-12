import { useMemo } from 'react';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import type { ChatHeaderModel } from '../components/ChatHeader';
import type { UserPresence } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';

interface HeaderSessionState {
  isTargetOnline: boolean;
  targetUserPresence: UserPresence | null;
  targetUserPresenceError: string | null;
}

interface HeaderInteractionState {
  isMessageSearchMode: boolean;
  messageSearchQuery: string;
  messageSearchState: ChatHeaderModel['searchState'];
  searchMatchedMessageIds: string[];
  activeSearchResultIndex: number;
  canNavigateSearchUp: boolean;
  canNavigateSearchDown: boolean;
  hasMoreSearchResults: boolean;
  isSelectionMode: boolean;
  selectedVisibleMessages: Array<unknown>;
  canDeleteSelectedMessages: boolean;
  searchInputRef: ChatHeaderModel['searchInputRef'];
  handleEnterMessageSearchMode: () => void;
  handleExitMessageSearchMode: () => void;
  handleEnterMessageSelectionMode: () => void;
  handleExitMessageSelectionMode: () => void;
  handleMessageSearchQueryChange: (value: string) => void;
  handleNavigateSearchUp: () => void;
  handleNavigateSearchDown: () => void;
  handleFocusSearchInput: () => void;
  handleCopySelectedMessages: () => void;
}

interface UseChatSidebarHeaderModelProps {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  session: HeaderSessionState;
  interaction: HeaderInteractionState;
  handleDeleteSelectedMessages: () => void;
  handleClose: () => void;
}

export const useChatSidebarHeaderModel = ({
  targetUser,
  displayTargetPhotoUrl,
  session,
  interaction,
  handleDeleteSelectedMessages,
  handleClose,
}: UseChatSidebarHeaderModelProps) =>
  useMemo<ChatHeaderModel>(
    () => ({
      targetUser,
      displayTargetPhotoUrl,
      isTargetOnline: session.isTargetOnline,
      targetUserPresence: session.targetUserPresence,
      targetUserPresenceError: session.targetUserPresenceError,
      isSearchMode: interaction.isMessageSearchMode,
      searchQuery: interaction.messageSearchQuery,
      searchState: interaction.messageSearchState,
      searchResultCount: interaction.searchMatchedMessageIds.length,
      activeSearchResultIndex: Math.max(interaction.activeSearchResultIndex, 0),
      canNavigateSearchUp: interaction.canNavigateSearchUp,
      canNavigateSearchDown: interaction.canNavigateSearchDown,
      hasMoreSearchResults: interaction.hasMoreSearchResults,
      isSelectionMode: interaction.isSelectionMode,
      selectedMessageCount: interaction.selectedVisibleMessages.length,
      canDeleteSelectedMessages: interaction.canDeleteSelectedMessages,
      searchInputRef: interaction.searchInputRef,
      onEnterSearchMode: interaction.handleEnterMessageSearchMode,
      onExitSearchMode: interaction.handleExitMessageSearchMode,
      onEnterSelectionMode: interaction.handleEnterMessageSelectionMode,
      onExitSelectionMode: interaction.handleExitMessageSelectionMode,
      onSearchQueryChange: interaction.handleMessageSearchQueryChange,
      onNavigateSearchUp: interaction.handleNavigateSearchUp,
      onNavigateSearchDown: interaction.handleNavigateSearchDown,
      onFocusSearchInput: interaction.handleFocusSearchInput,
      onCopySelectedMessages: interaction.handleCopySelectedMessages,
      onDeleteSelectedMessages: handleDeleteSelectedMessages,
      onClose: handleClose,
      getInitials,
      getInitialsColor,
    }),
    [
      displayTargetPhotoUrl,
      handleClose,
      handleDeleteSelectedMessages,
      interaction.activeSearchResultIndex,
      interaction.canDeleteSelectedMessages,
      interaction.canNavigateSearchDown,
      interaction.canNavigateSearchUp,
      interaction.hasMoreSearchResults,
      interaction.handleCopySelectedMessages,
      interaction.handleEnterMessageSearchMode,
      interaction.handleEnterMessageSelectionMode,
      interaction.handleExitMessageSearchMode,
      interaction.handleExitMessageSelectionMode,
      interaction.handleFocusSearchInput,
      interaction.handleMessageSearchQueryChange,
      interaction.handleNavigateSearchDown,
      interaction.handleNavigateSearchUp,
      interaction.isMessageSearchMode,
      interaction.isSelectionMode,
      interaction.messageSearchQuery,
      interaction.messageSearchState,
      interaction.searchInputRef,
      interaction.searchMatchedMessageIds.length,
      interaction.selectedVisibleMessages.length,
      session.isTargetOnline,
      session.targetUserPresence,
      session.targetUserPresenceError,
      targetUser,
    ]
  );
