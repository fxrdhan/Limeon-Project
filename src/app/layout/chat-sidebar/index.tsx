import type { ChatTargetUser } from '@/types';
import { AnimatePresence, motion } from 'motion/react';
import ChatSidebarPanel from '@/components/shared/chat-sidebar-panel';
import { useEffect, useState } from 'react';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: ChatTargetUser;
}

const ChatSidebar = ({ isOpen, onClose, targetUser }: ChatSidebarProps) => {
  const [persistedTargetUser, setPersistedTargetUser] = useState<
    ChatTargetUser | undefined
  >(targetUser);

  useEffect(() => {
    if (!targetUser) return;
    setPersistedTargetUser(targetUser);
  }, [targetUser]);

  const activeTargetUser = targetUser ?? persistedTargetUser;
  const shouldRenderSidebar = isOpen || Boolean(activeTargetUser);

  return (
    <AnimatePresence mode="wait">
      {shouldRenderSidebar && (
        <motion.aside
          key="chat-sidebar"
          initial={false}
          animate={{
            width: isOpen ? 420 : 0,
            opacity: isOpen ? 1 : 0,
          }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          data-chat-sidebar-open={isOpen ? 'true' : undefined}
          aria-hidden={!isOpen}
          className={`h-full overflow-hidden ${
            isOpen
              ? 'border-l border-slate-200 bg-white'
              : 'border-l border-transparent bg-transparent pointer-events-none'
          }`}
        >
          <ChatSidebarPanel
            isOpen={isOpen}
            onClose={onClose}
            targetUser={activeTargetUser}
          />
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default ChatSidebar;
