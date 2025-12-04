import { memo, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '@/store/authStore';
import type { OnlineUser } from '@/types';

interface AvatarStackProps {
  users: OnlineUser[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPortal?: boolean;
}

interface AvatarProps {
  user: OnlineUser;
  size: 'sm' | 'md' | 'lg' | 'portal';
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

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
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
        ${overlap && !isInPortal ? overlapClass[size as keyof typeof overlapClass] || '' : ''}
        ${isInPortal ? 'shrink-0' : ''}
      `}
        title={`${user.name} - Online`}
      >
        {user.profilephoto ? (
          <img
            src={user.profilephoto}
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

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const getInitialsColor = (userId: string) => {
      const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-gray-500',
      ];

      const index = userId
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return colors[index % colors.length];
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
                rounded-full bg-gray-100
                flex items-center justify-center text-gray-600 font-medium
                shadow-sm
              `}
              title={`+${hiddenCount} more online users`}
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
