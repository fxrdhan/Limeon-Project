import { useCallback, useEffect, useRef, useState } from 'react';
import { TbCheckbox, TbSearch } from 'react-icons/tb';
import type { ChatSidebarRuntimeState } from '../hooks/useChatSidebarRuntimeState';
import ConversationHeaderContent from './header/ConversationHeaderContent';
import SearchHeaderContent from './header/SearchHeaderContent';
import SelectionHeaderContent from './header/SelectionHeaderContent';

type ChatHeaderRuntime = Pick<
  ChatSidebarRuntimeState,
  'targetUser' | 'displayTargetPhotoUrl' | 'session' | 'interaction' | 'actions'
>;

interface ChatHeaderProps {
  runtime: ChatHeaderRuntime;
}

const ChatHeader = ({ runtime }: ChatHeaderProps) => {
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  const closeOptionsMenu = useCallback(() => {
    setIsOptionsMenuOpen(false);
  }, []);

  const toggleOptionsMenu = useCallback(() => {
    setIsOptionsMenuOpen(previousOpen => !previousOpen);
  }, []);

  useEffect(() => {
    if (!isOptionsMenuOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (optionsMenuRef.current?.contains(target)) {
        return;
      }
      if (optionsButtonRef.current?.contains(target)) {
        return;
      }
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
        runtime.interaction.handleEnterMessageSelectionMode();
      },
    },
    {
      label: 'Cari',
      icon: <TbSearch className="h-4 w-4" />,
      onClick: () => {
        closeOptionsMenu();
        runtime.interaction.handleEnterMessageSearchMode();
      },
    },
  ];

  const searchResultCount = runtime.interaction.searchMatchedMessageIds.length;
  const activeSearchResultIndex = Math.max(
    runtime.interaction.activeSearchResultIndex,
    0
  );
  const searchResultPositionLabel =
    searchResultCount === 0
      ? '0/0'
      : `${activeSearchResultIndex + 1}/${searchResultCount}${
          runtime.interaction.hasMoreSearchResults ? '+' : ''
        }`;

  return (
    <div className="px-3 pt-4 pb-2.5">
      {runtime.interaction.isSelectionMode ? (
        <SelectionHeaderContent
          selectedMessageCount={
            runtime.interaction.selectedVisibleMessages.length
          }
          canDeleteSelectedMessages={
            runtime.interaction.canDeleteSelectedMessages
          }
          onCopySelectedMessages={
            runtime.interaction.handleCopySelectedMessages
          }
          onDeleteSelectedMessages={
            runtime.actions.handleDeleteSelectedMessages
          }
          onClearSelectedMessages={
            runtime.interaction.handleClearSelectedMessages
          }
          onExitSelectionMode={
            runtime.interaction.handleExitMessageSelectionMode
          }
          onClose={runtime.actions.handleClose}
        />
      ) : runtime.interaction.isMessageSearchMode ? (
        <SearchHeaderContent
          searchQuery={runtime.interaction.messageSearchQuery}
          searchState={runtime.interaction.messageSearchState}
          searchResultPositionLabel={searchResultPositionLabel}
          searchResultCount={searchResultCount}
          canNavigateSearchUp={runtime.interaction.canNavigateSearchUp}
          canNavigateSearchDown={runtime.interaction.canNavigateSearchDown}
          searchInputRef={runtime.interaction.searchInputRef}
          onSearchQueryChange={
            runtime.interaction.handleMessageSearchQueryChange
          }
          onNavigateSearchUp={runtime.interaction.handleNavigateSearchUp}
          onNavigateSearchDown={runtime.interaction.handleNavigateSearchDown}
          onFocusSearchInput={runtime.interaction.handleFocusSearchInput}
          onExitSearchMode={runtime.interaction.handleExitMessageSearchMode}
          onClose={runtime.actions.handleClose}
        />
      ) : (
        <ConversationHeaderContent
          targetUser={runtime.targetUser}
          displayTargetPhotoUrl={runtime.displayTargetPhotoUrl}
          isTargetOnline={runtime.session.isTargetOnline}
          targetUserPresence={runtime.session.targetUserPresence}
          targetUserPresenceError={runtime.session.targetUserPresenceError}
          isOptionsMenuOpen={isOptionsMenuOpen}
          optionsButtonRef={optionsButtonRef}
          optionsMenuRef={optionsMenuRef}
          optionsActions={optionsActions}
          onToggleOptionsMenu={toggleOptionsMenu}
          onClose={runtime.actions.handleClose}
          getInitials={runtime.actions.getInitials}
          getInitialsColor={runtime.actions.getInitialsColor}
        />
      )}
    </div>
  );
};

export default ChatHeader;
