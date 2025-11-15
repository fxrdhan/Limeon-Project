import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/layout/navbar';
import Sidebar from '@/layout/sidebar';
import { usePresence } from '@/hooks/presence/usePresence';

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
  const setIsLocked = (updater: boolean | ((prev: boolean) => boolean)) => {
    setLockState(prev => ({
      ...prev,
      isLocked:
        typeof updater === 'function' ? updater(prev.isLocked) : updater,
    }));
  };
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
  }, [sidebarCollapsed]);

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
    <div className="flex h-screen bg-gray-100 text-gray-800 relative">
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
        <Navbar sidebarCollapsed={sidebarCollapsed} />

        <main className="flex-1 overflow-y-auto p-4 text-gray-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
