import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/app/layout/navbar';
import Sidebar from '@/app/layout/sidebar';
import ChatSidebar from '@/app/layout/chat-sidebar';
import { usePresence } from '@/hooks/presence/usePresence';
import type { ChatTargetUser } from '@/types';

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatState, setChatState] = useState<{
    isOpen: boolean;
    targetUser?: ChatTargetUser;
  }>({
    isOpen: false,
    targetUser: undefined,
  });
  // Use getDerivedStateFromProps to reset isLocked when sidebar collapses
  const [lockState, setLockState] = useState({
    sidebarCollapsed: true,
    isLocked: false,
  });
  if (sidebarCollapsed !== lockState.sidebarCollapsed) {
    setLockState({
      sidebarCollapsed,
      isLocked: sidebarCollapsed ? false : lockState.isLocked,
    });
  }
  const isLocked = lockState.isLocked;
  const setIsLocked = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setLockState(prev => ({
        ...prev,
        isLocked:
          typeof updater === 'function' ? updater(prev.isLocked) : updater,
      }));
    },
    []
  );
  const [isAnimating] = useState(false); // Initialize to false - no blocking needed
  usePresence();
  const isLockedRef = useRef(isLocked);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const expandSidebar = useCallback(() => {
    if (!isLocked) {
      setSidebarCollapsed(false);
    }
  }, [isLocked]);

  const collapseSidebarFunc = useCallback(() => {
    if (!isLocked) {
      setSidebarCollapsed(true);
    }
  }, [isLocked]);

  const toggleLock = useCallback(() => {
    setIsLocked(prevIsLocked => {
      const newLockState = !prevIsLocked;
      if (newLockState && sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
      return newLockState;
    });
  }, [sidebarCollapsed, setIsLocked]);

  // isLocked auto-resets when sidebarCollapsed changes (getDerivedStateFromProps pattern)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        // Toggle sidebar state and lock it
        setSidebarCollapsed(prevCollapsed => !prevCollapsed);
        setIsLocked(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsLocked, setSidebarCollapsed]);

  const handleChatUserSelect = useCallback((targetUser: ChatTargetUser) => {
    setChatState(prev => {
      const isSameUser = prev.targetUser?.id === targetUser.id;
      if (prev.isOpen && isSameUser) {
        return {
          isOpen: false,
          targetUser: undefined,
        };
      }

      return {
        isOpen: true,
        targetUser,
      };
    });
  }, []);

  const handleChatClose = useCallback(() => {
    setChatState({
      isOpen: false,
      targetUser: undefined,
    });
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 relative">
      {isAnimating && (
        <div className="fixed inset-0 z-50 pointer-events-auto cursor-wait" />
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        isLocked={isLocked}
        toggleLock={toggleLock}
        expandSidebar={expandSidebar}
        collapseSidebar={collapseSidebarFunc}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          showChatSidebar={chatState.isOpen}
          onChatUserSelect={handleChatUserSelect}
        />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 text-slate-800">
            <Outlet />
          </main>

          <ChatSidebar
            isOpen={chatState.isOpen}
            onClose={handleChatClose}
            targetUser={chatState.targetUser}
          />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
