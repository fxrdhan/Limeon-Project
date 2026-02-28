import type { SearchState } from '@/components/search-bar/constants';
import SearchBar from '@/components/search-bar/SearchBar';
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import type { UserPresence } from '@/services/api/chat.service';
import {
  TbChevronDown,
  TbChevronUp,
  TbCheckbox,
  TbDotsVertical,
  TbLayoutSidebarRightCollapse,
  TbSearch,
  TbX,
} from 'react-icons/tb';
import type { ChatSidebarPanelTargetUser } from '../types';

interface ChatHeaderProps {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  targetUserPresence: UserPresence | null;
  currentChannelId: string | null;
  isSearchMode: boolean;
  searchQuery: string;
  searchState: SearchState;
  searchResultCount: number;
  activeSearchResultIndex: number;
  canNavigateSearchUp: boolean;
  canNavigateSearchDown: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onEnterSearchMode: () => void;
  onExitSearchMode: () => void;
  onSearchQueryChange: (value: string) => void;
  onNavigateSearchUp: () => void;
  onNavigateSearchDown: () => void;
  onFocusSearchInput: () => void;
  onClose: () => void;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
}

const formatLastSeen = (lastSeen: string): string => {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMinutes = Math.floor(
    (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return lastSeenDate.toLocaleDateString();
};

const ChatHeader = ({
  targetUser,
  displayTargetPhotoUrl,
  targetUserPresence,
  currentChannelId,
  isSearchMode,
  searchQuery,
  searchState,
  searchResultCount,
  activeSearchResultIndex,
  canNavigateSearchUp,
  canNavigateSearchDown,
  searchInputRef,
  onEnterSearchMode,
  onExitSearchMode,
  onSearchQueryChange,
  onNavigateSearchUp,
  onNavigateSearchDown,
  onFocusSearchInput,
  onClose,
  getInitials,
  getInitialsColor,
}: ChatHeaderProps) => {
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

  const optionsActions: PopupMenuAction[] = [
    {
      label: 'Pilih pesan',
      icon: <TbCheckbox className="h-4 w-4" />,
      onClick: closeOptionsMenu,
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
  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onSearchQueryChange(event.target.value);
    },
    [onSearchQueryChange]
  );
  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onNavigateSearchUp();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onNavigateSearchDown();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) {
          onNavigateSearchUp();
        } else {
          onNavigateSearchDown();
        }
      }
    },
    [onNavigateSearchDown, onNavigateSearchUp]
  );

  return (
    <div className="px-4 py-3.5 border-b border-slate-100">
      {isSearchMode ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={onFocusSearchInput}
              placeholder="Cari pesan..."
              className="!mb-0"
              inputRef={searchInputRef}
              searchState={searchState}
              showNotFoundArrow={false}
            />
          </div>
          <div className="flex items-center gap-2">
            {searchResultCount > 0 ? (
              <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  aria-label="Hasil sebelumnya"
                  title="Hasil sebelumnya"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                  onClick={onNavigateSearchUp}
                  disabled={!canNavigateSearchUp}
                >
                  <TbChevronUp size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Hasil berikutnya"
                  title="Hasil berikutnya"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                  onClick={onNavigateSearchDown}
                  disabled={!canNavigateSearchDown}
                >
                  <TbChevronDown size={17} />
                </button>
              </div>
            ) : null}
            <span
              className="min-w-10 text-center text-[11px] font-medium text-slate-500"
              aria-live="polite"
            >
              {searchResultPositionLabel}
            </span>
            <button
              type="button"
              aria-label="Tutup pencarian"
              title="Tutup pencarian"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-transparent text-slate-600 hover:bg-slate-50"
              onClick={onExitSearchMode}
            >
              <TbX size={20} />
            </button>
            <button
              onClick={onClose}
              aria-label="Collapse chat sidebar"
              title="Collapse chat sidebar"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-transparent text-slate-600 hover:bg-slate-50"
            >
              <TbLayoutSidebarRightCollapse size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
              {displayTargetPhotoUrl ? (
                <img
                  src={displayTargetPhotoUrl}
                  alt={targetUser?.name || 'User'}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(targetUser?.id || 'target_user')}`}
                >
                  {getInitials(targetUser?.name || 'User')}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-slate-900 truncate">
                {targetUser ? targetUser.name : 'Chat'}
              </h3>
              {(() => {
                const shouldShowOnline =
                  targetUserPresence &&
                  targetUserPresence.is_online &&
                  targetUserPresence.current_chat_channel === currentChannelId;

                if (shouldShowOnline) {
                  return (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-green-600 font-medium">
                        Online
                      </span>
                    </div>
                  );
                }

                if (targetUserPresence && targetUserPresence.last_seen) {
                  return (
                    <span className="text-xs text-slate-400">
                      Last seen {formatLastSeen(targetUserPresence.last_seen)}
                    </span>
                  );
                }

                return null;
              })()}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                ref={optionsButtonRef}
                type="button"
                aria-label="Chat options"
                title="Chat options"
                aria-haspopup="menu"
                aria-expanded={isOptionsMenuOpen}
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-transparent text-slate-600 hover:bg-slate-50"
                onClick={toggleOptionsMenu}
              >
                <TbDotsVertical size={20} />
              </button>

              <PopupMenuPopover
                isOpen={isOptionsMenuOpen}
                className="absolute right-0 top-full z-30 mt-2 origin-top-right"
              >
                <div
                  ref={optionsMenuRef}
                  onClick={event => event.stopPropagation()}
                >
                  <PopupMenuContent
                    actions={optionsActions}
                    minWidthClassName="min-w-[140px]"
                  />
                </div>
              </PopupMenuPopover>
            </div>
            <button
              onClick={onClose}
              aria-label="Collapse chat sidebar"
              title="Collapse chat sidebar"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-transparent text-slate-600 hover:bg-slate-50"
            >
              <TbLayoutSidebarRightCollapse size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
