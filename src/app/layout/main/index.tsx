import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/app/layout/navbar';
import Sidebar from '@/app/layout/sidebar';
import ChatSidebar from '@/app/layout/chat-sidebar';
import { usePageFocusBlockStore } from '@/store/pageFocusBlockStore';
import { useChatSidebarStore } from '@/store/chatSidebarStore';

const ChatRuntimeHost = lazy(
  () => import('@/features/chat-sidebar/runtime-host')
);

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isLocked, setLockState] = useState(false);
  const [shouldLoadChatRuntime, setShouldLoadChatRuntime] = useState(false);
  const setIsLocked = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setLockState(prev =>
        typeof updater === 'function' ? updater(prev) : updater
      );
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

  useEffect(() => {
    if (
      shouldLoadChatRuntime ||
      isChatSidebarOpen ||
      typeof window === 'undefined'
    ) {
      if (isChatSidebarOpen) {
        setShouldLoadChatRuntime(true);
      }
      return;
    }

    if ('requestIdleCallback' in window) {
      const idleCallbackId = window.requestIdleCallback(() => {
        setShouldLoadChatRuntime(true);
      });

      return () => {
        window.cancelIdleCallback(idleCallbackId);
      };
    }

    const timeoutId = globalThis.setTimeout(() => {
      setShouldLoadChatRuntime(true);
    }, 2000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [isChatSidebarOpen, shouldLoadChatRuntime]);

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
          {shouldLoadChatRuntime ? <ChatRuntimeHost /> : null}
        </Suspense>
        <Navbar sidebarCollapsed={sidebarCollapsed} />

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
