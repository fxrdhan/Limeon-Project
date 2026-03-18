import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavbarProps } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useChatSidebarLauncher } from '@/features/chat-sidebar/hooks/useChatSidebarLauncher';
import { motion, AnimatePresence, useIsPresent } from 'motion/react';
import { TbMessageDots } from 'react-icons/tb';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import DateTimeDisplay from './live-datetime';
import Profile from '@/components/profile';
import AvatarStack from '@/components/shared/avatar-stack';

interface OnlineUsersPortalProps {
  portalContainerRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}

const OnlineUsersPortal = ({
  portalContainerRef,
  onMouseEnter,
  onMouseLeave,
  children,
}: OnlineUsersPortalProps) => {
  const isPresent = useIsPresent();

  return (
    <div
      ref={portalContainerRef}
      role="dialog"
      aria-label="Daftar pengguna online"
      className="absolute top-full left-1/2 z-50 mt-2 min-w-64 -translate-x-1/2 transform"
      onMouseEnter={isPresent ? onMouseEnter : undefined}
      onMouseLeave={isPresent ? onMouseLeave : undefined}
      style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
      >
        <div className="space-y-1">{children}</div>
      </motion.div>
    </div>
  );
};

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
  const { user } = useAuthStore();
  const [showPortal, setShowPortal] = useState(false);
  const {
    displayOnlineUsers,
    onlineUserIds,
    reorderedOnlineUsers,
    portalOrderedUsers,
    isDirectoryLoading,
    directoryError,
    hasMoreDirectoryUsers,
    retryLoadDirectory,
    loadMoreDirectoryUsers,
    openChatForUser,
  } = useChatSidebarLauncher(showPortal);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const portalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  const clearPortalHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const openPortal = useCallback(() => {
    clearPortalHoverTimeout();
    setShowPortal(true);
  }, [clearPortalHoverTimeout]);

  const closePortal = useCallback(() => {
    clearPortalHoverTimeout();
    setShowPortal(false);
    setHoveredUser(null);
  }, [clearPortalHoverTimeout]);

  const schedulePortalOpen = useCallback(() => {
    clearPortalHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPortal(true);
      hoverTimeoutRef.current = null;
    }, 200);
  }, [clearPortalHoverTimeout]);

  const schedulePortalClose = useCallback(() => {
    clearPortalHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPortal(false);
      setHoveredUser(null);
      hoverTimeoutRef.current = null;
    }, 100);
  }, [clearPortalHoverTimeout]);

  const handlePortalTriggerClick = useCallback(() => {
    if (showPortal) {
      closePortal();
      return;
    }

    openPortal();
  }, [closePortal, openPortal, showPortal]);

  const handleChatOpen = useCallback(
    (targetUser: Parameters<typeof openChatForUser>[0]) => {
      closePortal();
      openChatForUser(targetUser);
    },
    [closePortal, openChatForUser]
  );

  useEffect(() => {
    if (!showPortal) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) return;
      if (portalTriggerRef.current?.contains(eventTarget)) return;
      if (portalContainerRef.current?.contains(eventTarget)) return;
      closePortal();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePortal();
        portalTriggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePortal, showPortal]);

  useEffect(() => {
    return () => {
      clearPortalHoverTimeout();
    };
  }, [clearPortalHoverTimeout]);

  return (
    <nav className="bg-white px-4 py-3 sticky top-0 z-40 select-none">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center h-8">
          <h1 className="flex items-center" style={{ minHeight: '2em' }}>
            <span
              className="text-2xl font-bold text-slate-800"
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
                  className="text-2xl font-bold text-slate-800"
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
                    className="text-2xl font-bold text-slate-800"
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
                  className="text-2xl font-bold text-slate-800"
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

          <div className="h-5 w-px bg-slate-300 mx-4"></div>

          {/* Avatar Stack + Online Text Group */}
          <div className="relative">
            <button
              ref={portalTriggerRef}
              type="button"
              aria-label="Buka daftar pengguna online"
              aria-expanded={showPortal}
              aria-haspopup="dialog"
              className="flex items-center space-x-3 rounded-lg px-2 py-1 transition-colors hover:bg-slate-50"
              onMouseEnter={schedulePortalOpen}
              onMouseLeave={schedulePortalClose}
              onClick={handlePortalTriggerClick}
            >
              <AvatarStack
                users={reorderedOnlineUsers}
                maxVisible={4}
                size="md"
                showPortal={showPortal}
                onlineUserIds={onlineUserIds}
              />

              <div className="flex items-center text-sm text-slate-600">
                <span className="font-medium">{displayOnlineUsers} Online</span>
              </div>
            </button>

            <AnimatePresence>
              {showPortal && (
                <OnlineUsersPortal
                  portalContainerRef={portalContainerRef}
                  onMouseEnter={schedulePortalOpen}
                  onMouseLeave={schedulePortalClose}
                >
                  {isDirectoryLoading && portalOrderedUsers.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                      Memuat daftar pengguna...
                    </div>
                  ) : null}
                  {directoryError ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <span>{directoryError}</span>
                      <button
                        type="button"
                        onClick={retryLoadDirectory}
                        className="rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        Coba lagi
                      </button>
                    </div>
                  ) : null}
                  {portalOrderedUsers.map(portalUser => {
                    const isOnline = onlineUserIds.has(portalUser.id);

                    return (
                      <div
                        key={portalUser.id}
                        className={`relative px-4 py-3 mx-0 transition-colors rounded-lg w-full ${
                          portalUser.id !== user?.id
                            ? 'cursor-pointer hover:bg-emerald-50'
                            : 'cursor-default hover:bg-slate-50'
                        }`}
                        onMouseEnter={() => setHoveredUser(portalUser.id)}
                        onMouseLeave={() => setHoveredUser(null)}
                        onClick={
                          portalUser.id !== user?.id
                            ? () => handleChatOpen(portalUser)
                            : undefined
                        }
                        onKeyDown={event => {
                          if (
                            portalUser.id !== user?.id &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            handleChatOpen(portalUser);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {/* User Info Group */}
                        <div className="relative flex items-center">
                          {/* Avatar in portal */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                              opacity: isOnline ? 1 : 0.5,
                              scale: 1.25,
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{
                              duration: 0.2,
                              ease: 'easeOut',
                            }}
                            className={`relative rounded-full shadow-sm w-8 h-8 shrink-0 overflow-hidden ${isOnline ? '' : 'opacity-50'}`}
                            title={`${portalUser.name} - ${isOnline ? 'Online' : 'Offline'}`}
                          >
                            {portalUser.profilephoto ? (
                              <img
                                src={portalUser.profilephoto}
                                alt={portalUser.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
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
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {portalUser.name}
                              </p>
                              {portalUser.id === user?.id && (
                                <span className="flex items-center gap-1 text-xs">
                                  <span className="w-3 h-px bg-slate-400 translate-y-0.5"></span>
                                  <span className="text-primary font-medium">
                                    You
                                  </span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">
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
                                <TbMessageDots size={18} />
                              </motion.div>
                            )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {hasMoreDirectoryUsers && !directoryError ? (
                    <button
                      type="button"
                      onClick={loadMoreDirectoryUsers}
                      disabled={isDirectoryLoading}
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
                    >
                      {isDirectoryLoading
                        ? 'Memuat pengguna...'
                        : 'Muat lebih banyak'}
                    </button>
                  ) : null}
                </OnlineUsersPortal>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-slate-300 mx-5"></div>

          <Profile />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
