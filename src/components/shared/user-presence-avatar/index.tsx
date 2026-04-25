import { memo, useId, useMemo } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/animate-ui/components/animate/tooltip";
import { cn } from "@/lib/utils";
import { getInitials, getInitialsColor } from "@/utils/avatar";

type UserPresenceAvatarSize = "sm" | "md" | "lg";

interface UserPresenceAvatarUser {
  id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  profilephoto_thumb?: string | null;
}

interface UserPresenceAvatarProps {
  users: UserPresenceAvatarUser[];
  onlineUserIds?: ReadonlySet<string>;
  maxVisible?: number;
  size?: UserPresenceAvatarSize;
  className?: string;
  showPortal?: boolean;
}

interface PresenceAvatarProps {
  user: UserPresenceAvatarUser;
  isOnline: boolean;
  size: UserPresenceAvatarSize;
  layoutIdPrefix: string;
  overlap: boolean;
}

const avatarMotionTransition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
} as const;

const groupContainerTransition = {
  type: "spring",
  stiffness: 150,
  damping: 20,
} as const;

const sizeClasses = {
  sm: {
    avatar: "size-6 border-2 text-[10px]",
    group: "h-6",
    overlap: "-ml-1.5",
    overflow: "size-6 text-[10px]",
  },
  md: {
    avatar: "size-8 border-2 text-xs",
    group: "h-8",
    overlap: "-ml-2",
    overflow: "size-8 text-xs",
  },
  lg: {
    avatar: "size-10 border-[3px] text-sm",
    group: "h-10",
    overlap: "-ml-2.5",
    overflow: "size-10 text-sm",
  },
} as const;

const PresenceAvatar = memo(
  ({ user, isOnline, size, layoutIdPrefix, overlap }: PresenceAvatarProps) => {
    const profilePhotoUrl = user.profilephoto_thumb ?? user.profilephoto ?? null;
    const contentFilter = isOnline ? "grayscale(0)" : "grayscale(1)";

    return (
      <Tooltip side="bottom" className={cn("shrink-0", overlap && sizeClasses[size].overlap)}>
        <TooltipTrigger asChild>
          <motion.div
            layoutId={`${layoutIdPrefix}-${user.id}`}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={avatarMotionTransition}
            initial={false}
            className="cursor-pointer"
          >
            <Avatar className={cn("border-slate-200", sizeClasses[size].avatar)}>
              {profilePhotoUrl ? (
                <AvatarImage
                  src={profilePhotoUrl}
                  alt={user.name}
                  className="transition-[filter] duration-200 ease-out"
                  style={{ filter: contentFilter }}
                />
              ) : (
                <AvatarFallback
                  className={cn(
                    "text-white transition-[filter] duration-200 ease-out",
                    getInitialsColor(user.id),
                  )}
                  style={{ filter: contentFilter }}
                >
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </Avatar>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{user.name}</p>
        </TooltipContent>
      </Tooltip>
    );
  },
);

PresenceAvatar.displayName = "PresenceAvatar";

const UserPresenceAvatar = memo(
  ({
    users,
    onlineUserIds,
    maxVisible = 4,
    size = "md",
    className,
    showPortal = false,
  }: UserPresenceAvatarProps) => {
    const reactId = useId();
    const layoutIdPrefix = `presence-avatar-${reactId}`;
    const visibleUsers = useMemo(() => users.slice(0, maxVisible), [maxVisible, users]);
    const hiddenCount = Math.max(0, users.length - maxVisible);
    const groupedUsers = useMemo(
      () => ({
        online: visibleUsers.filter((user) => (onlineUserIds ? onlineUserIds.has(user.id) : true)),
        offline: visibleUsers.filter((user) => onlineUserIds && !onlineUserIds.has(user.id)),
      }),
      [onlineUserIds, visibleUsers],
    );

    return (
      <LayoutGroup>
        <TooltipProvider>
          <div
            className={cn(
              "flex items-center gap-1 transition-all duration-200",
              showPortal && "blur-xs opacity-80",
              className,
            )}
          >
            {groupedUsers.online.length > 0 ? (
              <motion.div
                layout
                className="rounded-full bg-slate-200 p-0.5"
                transition={groupContainerTransition}
              >
                <div className={cn("flex items-center", sizeClasses[size].group)}>
                  {groupedUsers.online.map((user, index) => (
                    <PresenceAvatar
                      key={user.id}
                      user={user}
                      isOnline
                      size={size}
                      layoutIdPrefix={layoutIdPrefix}
                      overlap={index > 0}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}

            {groupedUsers.offline.length > 0 ? (
              <motion.div
                layout
                className="rounded-full bg-slate-200 p-0.5"
                transition={groupContainerTransition}
              >
                <div className={cn("flex items-center", sizeClasses[size].group)}>
                  {groupedUsers.offline.map((user, index) => (
                    <PresenceAvatar
                      key={user.id}
                      user={user}
                      isOnline={false}
                      size={size}
                      layoutIdPrefix={layoutIdPrefix}
                      overlap={index > 0}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}

            {hiddenCount > 0 ? (
              <motion.div
                layout
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-600",
                  sizeClasses[size].overflow,
                )}
                transition={groupContainerTransition}
                title={`+${hiddenCount} more users`}
              >
                +{hiddenCount}
              </motion.div>
            ) : null}
          </div>
        </TooltipProvider>
      </LayoutGroup>
    );
  },
);

UserPresenceAvatar.displayName = "UserPresenceAvatar";

export default UserPresenceAvatar;
export type { UserPresenceAvatarProps };
