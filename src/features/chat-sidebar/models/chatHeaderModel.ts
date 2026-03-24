import type { SearchState } from '@/components/search-bar/constants';
import type { RefObject } from 'react';
import type { UserPresence } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';

export interface ChatHeaderModel {
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
  searchInputRef: RefObject<HTMLInputElement | null>;
  onEnterSearchMode: () => void;
  onExitSearchMode: () => void;
  onEnterSelectionMode: () => void;
  onClearSelectedMessages: () => void;
  onExitSelectionMode: () => void;
  onSearchQueryChange: (value: string) => void;
  onNavigateSearchUp: () => void;
  onNavigateSearchDown: () => void;
  onFocusSearchInput: () => void;
  onCopySelectedMessages: () => void;
  onDeleteSelectedMessages: () => void;
  onClose: () => void;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
}
