import { memo, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '@/store/authStore';
import type { OnlineUser } from '@/types';
import { getInitials, getInitialsColor } from '@/utils/avatar';

interface AvatarStackProps {
  users: OnlineUser[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPortal?: boolean;
  onlineUserIds?: ReadonlySet<string>;
}

interface AvatarProps {
  user: OnlineUser;
  size: 'sm' | 'md' | 'lg' | 'portal';
  isOnline: boolean;
  isInPortal?: boolean;
  index?: number;
  overlap?: boolean;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
}

// Individual Avatar Component with shared layout
const Avatar = memo(
  ({
    user,
    size,
    isOnline,
    isInPortal = false,
    index = 0,
    overlap = false,
    getInitials,
    getInitialsColor,
  }: AvatarProps) => {
    const overlapClass = {
      sm: '-ml-1',
      md: '-ml-2',
      lg: '-ml-3',
    };
    const profilePhotoUrl =
      user.profilephoto_thumb ?? user.profilephoto ?? null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isOnline ? 1 : 0.5,
          scale: isInPortal ? 1.25 : 1,
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
        }}
        style={{
          zIndex: isInPortal ? 1 : index + 1,
        }}
        className={`
        relative rounded-full shadow-sm w-8 h-8 overflow-hidden
        ${isOnline ? '' : 'opacity-50'}
        ${overlap && !isInPortal ? overlapClass[size as keyof typeof overlapClass] || '' : ''}
        ${isInPortal ? 'shrink-0' : ''}
      `}
        title={`${user.name} - ${isOnline ? 'Online' : 'Offline'}`}
      >
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={user.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className={`
            w-full h-full flex items-center justify-center
            text-white font-medium ${getInitialsColor(user.id)}
          `}
          >
            {getInitials(user.name)}
          </div>
        )}
      </motion.div>
    );
  }
);

Avatar.displayName = 'Avatar';

const AvatarStack = memo(
  ({
    users,
    maxVisible = 3,
    size = 'md',
    className = '',
    showPortal = false,
    onlineUserIds,
  }: AvatarStackProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { user: currentUser } = useAuthStore();

    // Reorder users so current user appears last (rightmost) if present
    const reorderedUsers =
      users.length > 0 && currentUser
        ? (() => {
            const currentUserIndex = users.findIndex(
              u => u.id === currentUser.id
            );
            if (currentUserIndex !== -1) {
              const otherUsers = users.filter(u => u.id !== currentUser.id);
              const currentUserObj = users[currentUserIndex];
              return [...otherUsers, currentUserObj];
            }
            return users;
          })()
        : users;

    const visibleUsers = reorderedUsers.slice(0, maxVisible);
    const hiddenCount = Math.max(0, reorderedUsers.length - maxVisible);

    const sizeClasses = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base',
    };

    return (
      <div
        className={`relative flex items-center ${className}`}
        ref={containerRef}
      >
        <div
          className={`flex items-center transition-all duration-200 ${
            showPortal ? 'blur-xs opacity-80' : ''
          }`}
        >
          {visibleUsers.map((user, index) => (
            <Avatar
              key={user.id}
              user={user}
              size={size}
              isOnline={onlineUserIds ? onlineUserIds.has(user.id) : true}
              isInPortal={false}
              index={index}
              overlap={index > 0}
              getInitials={getInitials}
              getInitialsColor={getInitialsColor}
            />
          ))}

          {/* Show overflow count */}
          {hiddenCount > 0 && (
            <div
              className={`
                ${sizeClasses[size]} -ml-2
                rounded-full bg-slate-100
                flex items-center justify-center text-slate-600 font-medium
                shadow-sm
              `}
              title={`+${hiddenCount} more users`}
            >
              +{hiddenCount}
            </div>
          )}
        </div>
      </div>
    );
  }
);

AvatarStack.displayName = 'AvatarStack';

export default AvatarStack;
export type { AvatarStackProps };
