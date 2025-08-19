import { memo, useRef } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import type { OnlineUser } from '@/types';

interface AvatarStackProps {
  users: OnlineUser[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPortal?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
    const sizeClasses = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base',
      portal: 'w-10 h-10 text-sm',
    };

    const overlapClass = {
      sm: '-ml-1',
      md: '-ml-2',
      lg: '-ml-3',
    };

    const indicatorSize = size === 'portal' ? 'w-3 h-3' : 'w-2 h-2';

    return (
      <motion.div
        layoutId={`avatar-${user.id}`}
        layout
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
        relative rounded-full border border-white shadow-sm
        ${sizeClasses[size]}
        ${overlap && !isInPortal ? overlapClass[size as keyof typeof overlapClass] || '' : ''}
        ${isInPortal ? 'flex-shrink-0' : ''}
      `}
        title={`${user.name} - Online`}
        style={{ zIndex: isInPortal ? 1 : 10 - index }}
      >
        {user.profilephoto ? (
          <img
            src={user.profilephoto}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.classList.add(getInitialsColor(user.id), 'text-white');
                parent.innerHTML = `<span class="flex items-center justify-center w-full h-full font-medium">${getInitials(user.name)}</span>`;
              }
            }}
          />
        ) : (
          <div
            className={`
          w-full h-full rounded-full flex items-center justify-center 
          text-white font-medium ${getInitialsColor(user.id)}
        `}
          >
            {getInitials(user.name)}
          </div>
        )}

        {/* Online indicator */}
        <div
          className={`absolute bottom-0 right-0 ${indicatorSize} bg-green-400 border border-white rounded-full`}
        ></div>
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
    onMouseEnter,
    onMouseLeave,
  }: AvatarStackProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const visibleUsers = users.slice(0, maxVisible);
    const hiddenCount = Math.max(0, users.length - maxVisible);

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
      <LayoutGroup>
        <div
          className={`relative flex items-center ${className}`}
          ref={containerRef}
        >
          {!showPortal ? (
            // Navbar Stack View
            <div className="flex items-center">
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
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`
                    ${sizeClasses[size]} -ml-2
                    rounded-full bg-gray-100 border border-white
                    flex items-center justify-center text-gray-600 font-medium
                    shadow-sm
                  `}
                  title={`+${hiddenCount} more online users`}
                >
                  +{hiddenCount}
                </motion.div>
              )}
            </div>
          ) : (
            // Portal List View
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-64"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              <div className="space-y-3">
                {users.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Avatar
                      user={user}
                      size="portal"
                      isInPortal={true}
                      index={index}
                      overlap={false}
                      getInitials={getInitials}
                      getInitialsColor={getInitialsColor}
                    />

                    {/* User Info */}
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </motion.div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </LayoutGroup>
    );
  }
);

AvatarStack.displayName = 'AvatarStack';

export default AvatarStack;
export type { AvatarStackProps };
