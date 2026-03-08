import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import type { RefObject } from 'react';
import { TbDotsVertical, TbLayoutSidebarRightCollapse } from 'react-icons/tb';
import type { UserPresence } from '../../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../../types';
import { formatLastSeen } from './presence';

interface ConversationHeaderContentProps {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  isTargetOnline: boolean;
  targetUserPresence: UserPresence | null;
  isOptionsMenuOpen: boolean;
  optionsButtonRef: RefObject<HTMLButtonElement | null>;
  optionsMenuRef: RefObject<HTMLDivElement | null>;
  optionsActions: PopupMenuAction[];
  onToggleOptionsMenu: () => void;
  onClose: () => void;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
}

const floatingBlockClass = 'rounded-xl border border-slate-200/95 bg-white/95';
const floatingIconButtonClass = `${floatingBlockClass} inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`;

const ConversationHeaderContent = ({
  targetUser,
  displayTargetPhotoUrl,
  isTargetOnline,
  targetUserPresence,
  isOptionsMenuOpen,
  optionsButtonRef,
  optionsMenuRef,
  optionsActions,
  onToggleOptionsMenu,
  onClose,
  getInitials,
  getInitialsColor,
}: ConversationHeaderContentProps) => {
  return (
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
          {isTargetOnline ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-600 font-medium">Online</span>
            </div>
          ) : targetUserPresence?.last_seen ? (
            <span className="text-xs text-slate-400">
              Last seen {formatLastSeen(targetUserPresence.last_seen)}
            </span>
          ) : null}
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
            onClick={onToggleOptionsMenu}
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
  );
};

export default ConversationHeaderContent;
