import { useState, useRef, useEffect } from 'react';
import type { NavbarProps } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChatbubblesSharp } from 'react-icons/io5';
import DateTimeDisplay from './live-datetime';
import Profile from '@/components/profile';
import AvatarStack from '@/components/shared/avatar-stack';
import ChatPortal from '@/components/shared/chat-portal';

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
  const { user } = useAuthStore();
  const { onlineUsers, onlineUsersList } = usePresenceStore();
  const [showPortal, setShowPortal] = useState(false);
  const [showChatPortal, setShowChatPortal] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<
    | {
        id: string;
        name: string;
        email: string;
        profilephoto?: string | null;
      }
    | undefined
  >(undefined);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure at least 1 user is shown when logged in
  const displayOnlineUsers = user ? Math.max(1, onlineUsers) : onlineUsers;

  // Reorder users so current user appears last (rightmost) if present
  const reorderedOnlineUsers =
    onlineUsersList.length > 0 && user
      ? (() => {
          const currentUserIndex = onlineUsersList.findIndex(
            u => u.id === user.id
          );
          if (currentUserIndex !== -1) {
            const otherUsers = onlineUsersList.filter(u => u.id !== user.id);
            const currentUserObj = onlineUsersList[currentUserIndex];
            return [...otherUsers, currentUserObj];
          }
          return onlineUsersList;
        })()
      : onlineUsersList;

  // Reorder users for portal so current user appears first (top) if present
  const portalOrderedUsers =
    onlineUsersList.length > 0 && user
      ? (() => {
          const currentUserIndex = onlineUsersList.findIndex(
            u => u.id === user.id
          );
          if (currentUserIndex !== -1) {
            const otherUsers = onlineUsersList.filter(u => u.id !== user.id);
            const currentUserObj = onlineUsersList[currentUserIndex];
            return [currentUserObj, ...otherUsers];
          }
          return onlineUsersList;
        })()
      : onlineUsersList;

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

    // Don't close avatar portal if chat portal is open
    if (!showChatPortal) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowPortal(false);
        hoverTimeoutRef.current = null;
      }, 100);
    }
  };

  // Chat handlers
  const handleChatOpen = (targetUser: {
    id: string;
    name: string;
    email: string;
    profilephoto?: string | null;
  }) => {
    // Toggle: if same user clicked, close chat portal
    if (selectedChatUser && selectedChatUser.id === targetUser.id) {
      setShowChatPortal(false);
      setSelectedChatUser(undefined);
    } else {
      setSelectedChatUser(targetUser);
      setShowChatPortal(true);
    }
  };

  const handleChatClose = () => {
    setShowChatPortal(false);
    setSelectedChatUser(undefined);
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
            <div
              className="flex items-center space-x-3 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
              onMouseEnter={handleOnlineTextEnter}
              onMouseLeave={handleOnlineTextLeave}
            >
              <AvatarStack
                users={reorderedOnlineUsers}
                maxVisible={4}
                size="md"
                showPortal={showPortal}
              />

              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium">{displayOnlineUsers} Online</span>
              </div>
            </div>

            {/* Avatar Portal - fixed position */}
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
                    <div className="space-y-1">
                      {portalOrderedUsers.map(portalUser => (
                        <div
                          key={portalUser.id}
                          className={`relative px-4 py-3 mx-0 transition-colors rounded-lg w-full ${
                            portalUser.id !== user?.id
                              ? 'cursor-pointer hover:bg-emerald-50'
                              : 'cursor-default hover:bg-gray-50'
                          }`}
                          onMouseEnter={() => setHoveredUser(portalUser.id)}
                          onMouseLeave={() => setHoveredUser(null)}
                          onClick={() =>
                            portalUser.id !== user?.id &&
                            handleChatOpen(portalUser)
                          }
                        >
                          {/* User Info Group */}
                          <div className="relative flex items-center">
                            {/* Avatar in portal */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1.25 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{
                                duration: 0.2,
                                ease: 'easeOut',
                              }}
                              className="relative rounded-full shadow-sm w-8 h-8 flex-shrink-0 overflow-hidden"
                              title={`${portalUser.name} - Online`}
                            >
                              {portalUser.profilephoto ? (
                                <img
                                  src={portalUser.profilephoto}
                                  alt={portalUser.name}
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div
                                  className={`w-full h-full flex items-center justify-center text-white font-medium text-sm ${getInitialsColor(portalUser.id)}`}
                                >
                                  {getInitials(portalUser.name)}
                                </div>
                              )}
                            </motion.div>

                            {/* User Info */}
                            <motion.div
                              className="w-36 min-w-0 ml-3 overflow-hidden"
                              initial={{ opacity: 1 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeOut' }}
                            >
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {portalUser.name}
                                </p>
                                {portalUser.id === user?.id && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <span className="w-3 h-px bg-gray-400 translate-y-0.5"></span>
                                    <span className="text-primary font-medium">
                                      You
                                    </span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {portalUser.email}
                              </p>
                            </motion.div>
                          </div>

                          {/* Chat Icon Indicator - only visible on hover */}
                          <AnimatePresence>
                            {portalUser.id !== user?.id &&
                              hoveredUser === portalUser.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{
                                    duration: 0.15,
                                    ease: 'easeOut',
                                  }}
                                  className="absolute top-3 right-3 text-emerald-600"
                                  title="Click to chat with this user"
                                >
                                  <IoChatbubblesSharp size={18} />
                                </motion.div>
                              )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Chat Portal - positioned to the left of avatar portal */}
            <div className="absolute top-full right-50 mt-2 z-50">
              <ChatPortal
                isOpen={showChatPortal}
                onClose={handleChatClose}
                targetUser={selectedChatUser}
              />
            </div>
          </div>

          <div className="h-5 w-px bg-gray-300 mx-5"></div>

          <Profile />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
