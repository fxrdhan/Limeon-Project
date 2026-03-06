import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/app/layout/navbar';
import Sidebar from '@/app/layout/sidebar';
import ChatSidebar from '@/app/layout/chat-sidebar';
import { usePresence } from '@/hooks/presence/usePresence';
import { useChatSidebarStore } from '@/store/chatSidebarStore';

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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
  usePresence();
  const isChatSidebarOpen = useChatSidebarStore(state => state.isOpen);
  const chatTargetUser = useChatSidebarStore(state => state.targetUser);
  const closeChatSidebar = useChatSidebarStore(state => state.closeChat);

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

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        isLocked={isLocked}
        toggleLock={toggleLock}
        expandSidebar={expandSidebar}
        collapseSidebar={collapseSidebarFunc}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar sidebarCollapsed={sidebarCollapsed} />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 text-slate-800">
            <Outlet />
          </main>

          <ChatSidebar
            isOpen={isChatSidebarOpen}
            onClose={closeChatSidebar}
            targetUser={chatTargetUser}
          />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
