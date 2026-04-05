import type { ChatTargetUser } from '@/types';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';

const ChatSidebarPanel = lazy(() => import('@/features/chat-sidebar'));

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: ChatTargetUser;
}

const ChatSidebar = ({ isOpen, onClose, targetUser }: ChatSidebarProps) => {
  const [persistedTargetUser, setPersistedTargetUser] = useState<
    ChatTargetUser | undefined
  >(targetUser);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return 420;
    }

    return window.innerWidth < 768 ? window.innerWidth : 420;
  });

  useEffect(() => {
    if (!targetUser) return;
    setPersistedTargetUser(targetUser);
  }, [targetUser]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateSidebarWidth = () => {
      setSidebarWidth(window.innerWidth < 768 ? window.innerWidth : 420);
    };

    updateSidebarWidth();
    window.addEventListener('resize', updateSidebarWidth);

    return () => {
      window.removeEventListener('resize', updateSidebarWidth);
    };
  }, []);

  const activeTargetUser = targetUser ?? persistedTargetUser;
  const shouldRenderPanel = isOpen || Boolean(activeTargetUser);
  const handleTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLElement>) => {
      if (
        event.target !== event.currentTarget ||
        event.propertyName !== 'width' ||
        isOpen
      ) {
        return;
      }

      setPersistedTargetUser(undefined);
    },
    [isOpen]
  );

  return (
    <aside
      aria-hidden={!isOpen}
      style={{
        width: isOpen ? sidebarWidth : 0,
        opacity: isOpen ? 1 : 0,
        maxWidth: '100vw',
      }}
      onTransitionEnd={handleTransitionEnd}
      className={`h-full overflow-hidden transition-[width,opacity] duration-200 ease-out ${
        isOpen
          ? 'border-l border-slate-200 bg-slate-100'
          : 'pointer-events-none border-l border-transparent bg-transparent'
      }`}
    >
      {shouldRenderPanel ? (
        <Suspense fallback={null}>
          <ChatSidebarPanel
            isOpen={isOpen}
            onClose={onClose}
            targetUser={activeTargetUser}
          />
        </Suspense>
      ) : null}
    </aside>
  );
};

export default ChatSidebar;
