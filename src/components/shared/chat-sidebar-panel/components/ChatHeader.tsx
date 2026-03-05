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
  TbCopy,
  TbChevronDown,
  TbChevronUp,
  TbCheckbox,
  TbDotsVertical,
  TbLayoutSidebarRightCollapse,
  TbSearch,
  TbTrash,
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

const ONLINE_PRESENCE_MAX_AGE_MS = 90_000;

const isPresenceFresh = (lastSeen?: string | null): boolean => {
  if (!lastSeen) return false;

  const parsedTime = new Date(lastSeen).getTime();
  if (!Number.isFinite(parsedTime)) return false;

  return Date.now() - parsedTime <= ONLINE_PRESENCE_MAX_AGE_MS;
};

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
  const floatingBlockClass =
    'rounded-xl border border-slate-200/95 bg-white/95';
  const floatingIconButtonClass = `${floatingBlockClass} inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`;
  const floatingSplitIconButtonClass =
    'inline-flex h-1/2 w-full cursor-pointer items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white';

  return (
    <div className="px-3 pt-4 pb-2.5">
      {isSelectionMode ? (
        <div className="flex w-full items-center gap-2">
          <span
            className={`${floatingBlockClass} inline-flex h-9 min-w-20 items-center justify-center px-3 text-xs font-semibold text-slate-700`}
            aria-live="polite"
          >
            {selectedMessageCount} dipilih
          </span>
          <button
            type="button"
            className={`${floatingBlockClass} inline-flex h-9 items-center gap-1.5 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`}
            onClick={onCopySelectedMessages}
            disabled={selectedMessageCount === 0}
            title="Salin pesan terpilih"
            aria-label="Salin pesan terpilih"
          >
            <TbCopy size={16} />
            Salin
          </button>
          <button
            type="button"
            className={`${floatingBlockClass} inline-flex h-9 items-center gap-1.5 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 disabled:hover:bg-white`}
            onClick={onDeleteSelectedMessages}
            disabled={!canDeleteSelectedMessages}
            title="Hapus pesan terpilih"
            aria-label="Hapus pesan terpilih"
          >
            <TbTrash size={16} />
            Hapus
          </button>
          <button
            type="button"
            aria-label="Keluar mode pilih pesan"
            title="Keluar mode pilih pesan"
            className={floatingIconButtonClass}
            onClick={onExitSelectionMode}
          >
            <TbX size={20} />
          </button>
          <button
            onClick={onClose}
            aria-label="Collapse chat sidebar"
            title="Collapse chat sidebar"
            className={floatingIconButtonClass}
          >
            <TbLayoutSidebarRightCollapse size={20} />
          </button>
        </div>
      ) : isSearchMode ? (
        <div className="flex w-full items-center gap-2.5">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={onFocusSearchInput}
            placeholder="Cari pesan..."
            className="!mb-0 min-w-0 flex-1"
            inputRef={searchInputRef}
            searchState={searchState}
            showNotFoundArrow={false}
          />
          <div className="flex items-center gap-2">
            <div
              className={`overflow-hidden transition-[width,opacity,margin] duration-200 ease-out ${
                searchResultCount > 0
                  ? 'w-9 opacity-100 mr-0'
                  : 'w-0 opacity-0 -mr-1 pointer-events-none'
              }`}
              aria-hidden={searchResultCount === 0}
            >
              <div
                className={`${floatingBlockClass} inline-flex h-9 w-9 shrink-0 flex-col overflow-hidden divide-y divide-slate-200/95`}
              >
                <button
                  type="button"
                  aria-label="Hasil sebelumnya"
                  title="Hasil sebelumnya"
                  className={floatingSplitIconButtonClass}
                  onClick={onNavigateSearchUp}
                  disabled={searchResultCount === 0 || !canNavigateSearchUp}
                >
                  <TbChevronUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Hasil berikutnya"
                  title="Hasil berikutnya"
                  className={floatingSplitIconButtonClass}
                  onClick={onNavigateSearchDown}
                  disabled={searchResultCount === 0 || !canNavigateSearchDown}
                >
                  <TbChevronDown size={16} />
                </button>
              </div>
            </div>
            <span
              className={`${floatingBlockClass} inline-flex h-9 min-w-11 items-center justify-center px-2.5 text-center text-xs font-medium text-slate-500`}
              aria-live="polite"
            >
              {searchResultPositionLabel}
            </span>
            <button
              type="button"
              aria-label="Tutup pencarian"
              title="Tutup pencarian"
              className={floatingIconButtonClass}
              onClick={onExitSearchMode}
            >
              <TbX size={20} />
            </button>
            <button
              onClick={onClose}
              aria-label="Collapse chat sidebar"
              title="Collapse chat sidebar"
              className={floatingIconButtonClass}
            >
              <TbLayoutSidebarRightCollapse size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center gap-2.5">
          <div
            className={`${floatingBlockClass} flex min-w-0 max-w-[calc(100%-5.75rem)] flex-1 items-center gap-3 px-3 py-1.5`}
          >
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
            <div className="min-w-0 flex flex-col gap-1">
              <h3 className="font-medium text-slate-900 truncate leading-tight">
                {targetUser ? targetUser.name : 'Chat'}
              </h3>
              {(() => {
                const shouldShowOnline =
                  targetUserPresence &&
                  targetUserPresence.is_online &&
                  targetUserPresence.current_chat_channel ===
                    currentChannelId &&
                  isPresenceFresh(targetUserPresence.last_seen);

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
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                ref={optionsButtonRef}
                type="button"
                aria-label="Chat options"
                title="Chat options"
                aria-haspopup="menu"
                aria-expanded={isOptionsMenuOpen}
                className={floatingIconButtonClass}
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
                  role="presentation"
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
              className={floatingIconButtonClass}
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
