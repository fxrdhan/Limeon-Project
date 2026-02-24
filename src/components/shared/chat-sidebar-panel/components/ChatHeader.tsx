import { useCallback, useEffect, useRef, useState } from 'react';
import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import type { UserPresence } from '@/services/api/chat.service';
import {
  TbCheckbox,
  TbDotsVertical,
  TbLayoutSidebarRightCollapse,
  TbSearch,
} from 'react-icons/tb';
import type { ChatSidebarPanelTargetUser } from '../types';

interface ChatHeaderProps {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  targetUserPresence: UserPresence | null;
  currentChannelId: string | null;
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
      onClick: closeOptionsMenu,
    },
  ];

  return (
    <div className="px-4 py-3.5 border-b border-slate-100">
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
    </div>
  );
};

export default ChatHeader;
