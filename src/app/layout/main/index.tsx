import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/app/layout/navbar';
import Sidebar from '@/app/layout/sidebar';
import ChatSidebar from '@/app/layout/chat-sidebar';
import { usePageFocusBlockStore } from '@/store/pageFocusBlockStore';
import { useChatSidebarStore } from '@/store/chatSidebarStore';

const PresenceRuntimeHost = lazy(
  () => import('@/features/chat-sidebar/presence-host')
);
const ChatRuntimeHost = lazy(
  () => import('@/features/chat-sidebar/runtime-host')
);

const SIDEBAR_LOCK_STORAGE_KEY = 'pharmasys.sidebar.locked';

const readInitialSidebarLocked = () =>
  window.localStorage.getItem(SIDEBAR_LOCK_STORAGE_KEY) === 'true';

const MainLayout = () => {
  const [initialSidebarLocked] = useState(readInitialSidebarLocked);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(!initialSidebarLocked);
  const [isLocked, setLockState] = useState(initialSidebarLocked);
  const [shouldLoadPresenceRuntime, setShouldLoadPresenceRuntime] =
    useState(false);
  const [shouldLoadChatRuntime, setShouldLoadChatRuntime] = useState(false);
  const setIsLocked = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setLockState(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        window.localStorage.setItem(SIDEBAR_LOCK_STORAGE_KEY, String(next));
        return next;
      });
    },
    []
  );
  const isChatSidebarOpen = useChatSidebarStore(state => state.isOpen);
  const chatTargetUser = useChatSidebarStore(state => state.targetUser);
  const closeChatSidebar = useChatSidebarStore(state => state.closeChat);
  const setPageFocusBlocked = usePageFocusBlockStore(state => state.setBlocked);

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

  useEffect(() => {
    if (sidebarCollapsed) {
      setIsLocked(false);
    }
  }, [setIsLocked, sidebarCollapsed]);

  useEffect(() => {
    setPageFocusBlocked(isChatSidebarOpen);
  }, [isChatSidebarOpen, setPageFocusBlocked]);

  useEffect(
    () => () => {
      setPageFocusBlocked(false);
    },
    [setPageFocusBlocked]
  );

  const loadPresenceRuntime = useCallback(() => {
    setShouldLoadPresenceRuntime(true);
  }, []);

  const loadChatRuntime = useCallback(() => {
    setShouldLoadPresenceRuntime(true);
    setShouldLoadChatRuntime(true);
  }, []);

  useEffect(() => {
    if (!isChatSidebarOpen) {
      return;
    }

    loadChatRuntime();
  }, [isChatSidebarOpen, loadChatRuntime]);

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
    <div className="relative flex h-screen bg-white text-slate-800">
      <Sidebar
        collapsed={sidebarCollapsed}
        isLocked={isLocked}
        toggleLock={toggleLock}
        expandSidebar={expandSidebar}
        collapseSidebar={collapseSidebarFunc}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Suspense fallback={null}>
          {shouldLoadPresenceRuntime ? <PresenceRuntimeHost /> : null}
          {shouldLoadChatRuntime ? <ChatRuntimeHost /> : null}
        </Suspense>
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          onOnlineUsersIntent={loadPresenceRuntime}
        />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-white p-4 text-slate-800">
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
