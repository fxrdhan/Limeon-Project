import type { SearchState } from '@/components/search-bar/constants';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { TbCheckbox, TbSearch } from 'react-icons/tb';
import type { UserPresence } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import ConversationHeaderContent from './header/ConversationHeaderContent';
import SearchHeaderContent from './header/SearchHeaderContent';
import SelectionHeaderContent from './header/SelectionHeaderContent';

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
  isSelectionMode: boolean;
  selectedMessageCount: number;
  canDeleteSelectedMessages: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onEnterSearchMode: () => void;
  onExitSearchMode: () => void;
  onEnterSelectionMode: () => void;
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

const ChatHeader = ({ model }: { model: ChatHeaderModel }) => {
  const {
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
  } = model;
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  const closeOptionsMenu = useCallback(() => {
    setIsOptionsMenuOpen(false);
  }, []);

  const toggleOptionsMenu = useCallback(() => {
    setIsOptionsMenuOpen(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isOptionsMenuOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (optionsMenuRef.current?.contains(target)) return;
      if (optionsButtonRef.current?.contains(target)) return;
      closeOptionsMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOptionsMenu();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOptionsMenu, isOptionsMenuOpen]);

  const optionsActions = [
    {
      label: 'Pilih pesan',
      icon: <TbCheckbox className="h-4 w-4" />,
      onClick: () => {
        closeOptionsMenu();
        onEnterSelectionMode();
      },
    },
    {
      label: 'Cari',
      icon: <TbSearch className="h-4 w-4" />,
      onClick: () => {
        closeOptionsMenu();
        onEnterSearchMode();
      },
    },
  ];

  const searchResultPositionLabel =
    searchResultCount === 0
      ? '0/0'
      : `${activeSearchResultIndex + 1}/${searchResultCount}`;

  return (
    <div className="px-3 pt-4 pb-2.5">
      {isSelectionMode ? (
        <SelectionHeaderContent
          selectedMessageCount={selectedMessageCount}
          canDeleteSelectedMessages={canDeleteSelectedMessages}
          onCopySelectedMessages={onCopySelectedMessages}
          onDeleteSelectedMessages={onDeleteSelectedMessages}
          onExitSelectionMode={onExitSelectionMode}
          onClose={onClose}
        />
      ) : isSearchMode ? (
        <SearchHeaderContent
          searchQuery={searchQuery}
          searchState={searchState}
          searchResultPositionLabel={searchResultPositionLabel}
          searchResultCount={searchResultCount}
          canNavigateSearchUp={canNavigateSearchUp}
          canNavigateSearchDown={canNavigateSearchDown}
          searchInputRef={searchInputRef}
          onSearchQueryChange={onSearchQueryChange}
          onNavigateSearchUp={onNavigateSearchUp}
          onNavigateSearchDown={onNavigateSearchDown}
          onFocusSearchInput={onFocusSearchInput}
          onExitSearchMode={onExitSearchMode}
          onClose={onClose}
        />
      ) : (
        <ConversationHeaderContent
          targetUser={targetUser}
          displayTargetPhotoUrl={displayTargetPhotoUrl}
          isTargetOnline={isTargetOnline}
          targetUserPresence={targetUserPresence}
          targetUserPresenceError={targetUserPresenceError}
          isOptionsMenuOpen={isOptionsMenuOpen}
          optionsButtonRef={optionsButtonRef}
          optionsMenuRef={optionsMenuRef}
          optionsActions={optionsActions}
          onToggleOptionsMenu={toggleOptionsMenu}
          onClose={onClose}
          getInitials={getInitials}
          getInitialsColor={getInitialsColor}
        />
      )}
    </div>
  );
};

export default ChatHeader;
