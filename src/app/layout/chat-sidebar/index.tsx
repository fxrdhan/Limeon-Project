import type { ChatTargetUser } from '@/types';
import { motion } from 'motion/react';
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
  const handleAnimationComplete = useCallback(() => {
    if (isOpen) return;
    setPersistedTargetUser(undefined);
  }, [isOpen]);

  return (
    <motion.aside
      key="chat-sidebar"
      initial={false}
      animate={{
        width: isOpen ? sidebarWidth : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onAnimationComplete={handleAnimationComplete}
      aria-hidden={!isOpen}
      style={{ maxWidth: '100vw' }}
      className={`h-full overflow-hidden ${
        isOpen
          ? 'border-l border-slate-200 bg-slate-100'
          : 'border-l border-transparent bg-transparent pointer-events-none'
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
    </motion.aside>
  );
};

export default ChatSidebar;
