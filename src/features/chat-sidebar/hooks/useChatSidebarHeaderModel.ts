import { useMemo } from 'react';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import type { ChatHeaderModel } from '../components/ChatHeader';
import type { ChatSidebarPanelTargetUser } from '../types';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';

type HeaderSessionState = Pick<
  ReturnType<typeof useChatSession>,
  'isTargetOnline' | 'targetUserPresence' | 'targetUserPresenceError'
>;

type HeaderInteractionState = Pick<
  ReturnType<typeof useChatInteractionModes>,
  | 'isMessageSearchMode'
  | 'messageSearchQuery'
  | 'messageSearchState'
  | 'searchMatchedMessageIds'
  | 'activeSearchResultIndex'
  | 'canNavigateSearchUp'
  | 'canNavigateSearchDown'
  | 'isSelectionMode'
  | 'selectedVisibleMessages'
  | 'canDeleteSelectedMessages'
  | 'searchInputRef'
  | 'handleEnterMessageSearchMode'
  | 'handleExitMessageSearchMode'
  | 'handleEnterMessageSelectionMode'
  | 'handleExitMessageSelectionMode'
  | 'handleMessageSearchQueryChange'
  | 'handleNavigateSearchUp'
  | 'handleNavigateSearchDown'
  | 'handleFocusSearchInput'
  | 'handleCopySelectedMessages'
>;

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
