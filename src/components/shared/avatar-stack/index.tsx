import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OnlineUser } from '@/types';

interface AvatarStackProps {
  users: OnlineUser[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AvatarStack = memo(
  ({
    users,
    maxVisible = 3,
    size = 'md',
    className = '',
  }: AvatarStackProps) => {
    const [showPortal, setShowPortal] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const visibleUsers = users.slice(0, maxVisible);
    const hiddenCount = Math.max(0, users.length - maxVisible);

    const sizeClasses = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base',
    };

    const overlapClass = {
      sm: '-ml-1',
      md: '-ml-2',
      lg: '-ml-3',
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

    // Handle hover with delay
    const handleMouseEnter = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      hoverTimeoutRef.current = setTimeout(() => {
        setShowPortal(true);
        hoverTimeoutRef.current = null;
      }, 300);
    };

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      hoverTimeoutRef.current = setTimeout(() => {
        setShowPortal(false);
        hoverTimeoutRef.current = null;
      }, 150);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        className={`relative flex items-center ${className}`}
        ref={containerRef}
      >
        <div
          className="flex items-center"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence mode="popLayout">
            {visibleUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05,
                  ease: 'easeOut',
                }}
                className={`
              relative rounded-full border border-white shadow-sm
              ${sizeClasses[size]}
              ${index > 0 ? overlapClass[size] : ''}
            `}
                title={`${user.name} - Online`}
                style={{ zIndex: visibleUsers.length - index }}
              >
                {user.profilephoto ? (
                  <img
                    src={user.profilephoto}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                    onError={e => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.classList.add(
                          getInitialsColor(user.id),
                          'text-white'
                        );
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
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 border border-white rounded-full"></div>
              </motion.div>
            ))}

            {/* Show overflow count */}
            {hiddenCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`
              ${sizeClasses[size]} ${overlapClass[size]}
              rounded-full bg-gray-100 border border-white
              flex items-center justify-center text-gray-600 font-medium
              shadow-sm
            `}
                title={`+${hiddenCount} more online users`}
              >
                +{hiddenCount}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Portal - User List on Hover */}
        <AnimatePresence>
          {showPortal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-64"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="space-y-3">
                {users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.2 }}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative w-10 h-10 flex-shrink-0">
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
                              parent.classList.add(
                                getInitialsColor(user.id),
                                'text-white'
                              );
                              parent.innerHTML = `<span class="flex items-center justify-center w-full h-full font-medium text-sm">${getInitials(user.name)}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <div
                          className={`
                        w-full h-full rounded-full flex items-center justify-center 
                        text-white font-medium text-sm ${getInitialsColor(user.id)}
                      `}
                        >
                          {getInitials(user.name)}
                        </div>
                      )}

                      {/* Online indicator */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border border-white rounded-full"></div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AvatarStack.displayName = 'AvatarStack';

export default AvatarStack;
export type { AvatarStackProps };
