import type { UserPresence } from '@/services/api/chat.service';
import { TbLayoutSidebarRightCollapse } from 'react-icons/tb';
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
        <button
          onClick={onClose}
          aria-label="Collapse chat sidebar"
          title="Collapse chat sidebar"
          className="shrink-0 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
        >
          <TbLayoutSidebarRightCollapse size={24} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
