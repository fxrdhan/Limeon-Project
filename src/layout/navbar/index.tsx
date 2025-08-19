import { useState, useRef, useEffect } from 'react';
import type { NavbarProps } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import DateTimeDisplay from './live-datetime';
import Profile from '@/components/profile';
import AvatarStack from '@/components/shared/avatar-stack';

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
  const { user } = useAuthStore();
  const { onlineUsers, onlineUsersList } = usePresenceStore();
  const [showPortal, setShowPortal] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure at least 1 user is shown when logged in
  const displayOnlineUsers = user ? Math.max(1, onlineUsers) : onlineUsers;

  // Helper functions for avatar display
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

  // Handle hover with delay for online text
  const handleOnlineTextEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setShowPortal(true);
      hoverTimeoutRef.current = null;
    }, 200);
  };

  const handleOnlineTextLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setShowPortal(false);
      hoverTimeoutRef.current = null;
    }, 100);
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
    <nav className="bg-white px-4 py-3 sticky top-0 z-20">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center h-8">
          <h1 className="flex items-center" style={{ minHeight: '2em' }}>
            <span
              className="text-2xl font-semibold text-gray-800"
              style={{
                display: 'inline-block',
                verticalAlign: 'top',
                lineHeight: '2em',
                height: '2em',
              }}
            >
              Pharma
            </span>
            <AnimatePresence>
              {sidebarCollapsed ? (
                <motion.span
                  key="sys_collapsed"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-2xl font-semibold text-gray-800"
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    verticalAlign: 'top',
                    lineHeight: '2em',
                    height: '2em',
                  }}
                >
                  Sys
                </motion.span>
              ) : (
                <>
                  <motion.span
                    key="cy_part"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-2xl font-semibold text-gray-800"
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      verticalAlign: 'top',
                      lineHeight: '2em',
                      height: '2em',
                    }}
                  >
                    cy
                  </motion.span>
                </>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  key="management_system_part"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-2xl font-semibold text-gray-800"
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    verticalAlign: 'top',
                    lineHeight: '2em',
                    height: '2em',
                    marginLeft: '0.4rem',
                  }}
                >
                  Management System
                </motion.span>
              )}
            </AnimatePresence>
          </h1>
        </div>
        <div></div>
        <div className="relative flex justify-end items-center">
          <DateTimeDisplay />

          <div className="h-5 w-px bg-gray-300 mx-4"></div>

          {/* Avatar Stack + Online Text Group */}
          <div className="relative">
            <LayoutGroup>
              <div
                className="flex items-center space-x-3 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                onMouseEnter={handleOnlineTextEnter}
                onMouseLeave={handleOnlineTextLeave}
              >
                <AvatarStack
                  users={onlineUsersList}
                  maxVisible={4}
                  size="md"
                  showPortal={showPortal}
                />

                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">
                    {displayOnlineUsers} Online
                  </span>
                </div>
              </div>
            </LayoutGroup>

            {/* Portal - restructured to prevent avatar opacity inheritance */}
            <AnimatePresence>
              {showPortal && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 min-w-64">
                  {/* Portal Background - this fades */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute inset-0 bg-white rounded-xl shadow-lg border border-gray-200"
                  />

                  {/* Portal Content - avatars don't inherit fade */}
                  <div
                    className="relative p-3"
                    onMouseEnter={handleOnlineTextEnter}
                    onMouseLeave={handleOnlineTextLeave}
                  >
                    <div className="space-y-3">
                      {onlineUsersList.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          {/* Avatar with layoutId for shared transition */}
                          <motion.div
                            layoutId={`avatar-${user.id}`}
                            layout="position"
                            transition={{
                              layout: { duration: 0.3, ease: 'easeInOut' },
                            }}
                            style={{ opacity: 1 }}
                            className="relative rounded-full border border-white shadow-sm w-10 h-10 flex-shrink-0"
                            title={`${user.name} - Online`}
                          >
                            {user.profilephoto ? (
                              <img
                                src={user.profilephoto}
                                alt={user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-full h-full rounded-full flex items-center justify-center text-white font-medium text-sm ${getInitialsColor(user.id)}`}
                              >
                                {getInitials(user.name)}
                              </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border border-white rounded-full"></div>
                          </motion.div>

                          {/* User Info */}
                          <motion.div
                            className="flex-1 min-w-0"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
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
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-gray-300 mx-5"></div>

          <Profile />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
