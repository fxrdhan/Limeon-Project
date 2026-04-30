import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import type { RefObject } from 'react';
import { TbDotsVertical, TbLayoutSidebarRightCollapse } from 'react-icons/tb';
import { CHAT_POPUP_SURFACE_CLASS_NAME } from '../chatPopupSurface';
import type { UserPresence } from '../../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../../types';
import { formatLastSeen } from './presence';

interface ConversationHeaderContentProps {
  targetUser?: ChatSidebarPanelTargetUser;
  isSelfConversation: boolean;
  displayTargetPhotoUrl: string | null;
  isTargetOnline: boolean;
  targetUserPresence: UserPresence | null;
  targetUserPresenceError: string | null;
  isOptionsMenuOpen: boolean;
  optionsButtonRef: RefObject<HTMLButtonElement | null>;
  optionsMenuRef: RefObject<HTMLDivElement | null>;
  optionsActions: PopupMenuAction[];
  onToggleOptionsMenu: () => void;
  onOpenContactList: () => void;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
}

const floatingBlockClass = `rounded-full ${CHAT_POPUP_SURFACE_CLASS_NAME}`;
const floatingIconButtonClass = `${floatingBlockClass} inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-black transition-colors hover:bg-slate-50 hover:text-black disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`;
const chatPopoverIconClassName =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';

const ConversationHeaderContent = ({
  targetUser,
  isSelfConversation,
  displayTargetPhotoUrl,
  isTargetOnline,
  targetUserPresence,
  targetUserPresenceError,
  isOptionsMenuOpen,
  optionsButtonRef,
  optionsMenuRef,
  optionsActions,
  onToggleOptionsMenu,
  onOpenContactList,
  getInitials,
  getInitialsColor,
}: ConversationHeaderContentProps) => {
  const targetDisplayName = targetUser
    ? `${targetUser.name}${isSelfConversation ? ' (You)' : ''}`
    : 'Chat';

  return (
    <div className="flex w-full items-center gap-2.5">
      <div
        className={`${floatingBlockClass} flex min-w-0 max-w-[calc(100%-5.75rem)] flex-1 items-center gap-2.5 py-1.5 pl-2 pr-3`}
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
            {targetDisplayName}
          </h3>
          {isTargetOnline ? (
            <span className="text-xs text-green-600 font-medium">Online</span>
          ) : targetUserPresenceError ? (
            <span className="text-xs text-amber-600">
              {targetUserPresenceError}
            </span>
          ) : targetUserPresence?.last_seen ? (
            <span className="text-xs text-slate-400">
              Terakhir aktif {formatLastSeen(targetUserPresence.last_seen)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            ref={optionsButtonRef}
            type="button"
            aria-label="Opsi chat"
            title="Opsi chat"
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
              className="[&_button]:!text-black [&_button:hover]:!text-black [&_button[data-preselected='true']]:!text-black [&_svg]:!text-black"
              onClick={event => event.stopPropagation()}
              role="presentation"
            >
              <PopupMenuContent
                actions={optionsActions}
                minWidthClassName="min-w-[140px]"
                iconClassName={chatPopoverIconClassName}
                enableAnimatedHighlight
                surfaceClassName={CHAT_POPUP_SURFACE_CLASS_NAME}
              />
            </div>
          </PopupMenuPopover>
        </div>
        <button
          onClick={onOpenContactList}
          aria-label="Kembali ke daftar kontak"
          title="Kembali ke daftar kontak"
          className={floatingIconButtonClass}
        >
          <TbLayoutSidebarRightCollapse size={20} />
        </button>
      </div>
    </div>
  );
};

export default ConversationHeaderContent;
