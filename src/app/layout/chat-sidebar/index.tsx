import type { ChatTargetUser } from '@/types';
import { AnimatePresence, motion } from 'motion/react';
import ChatSidebarPanel from '@/components/shared/chat-sidebar-panel';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: ChatTargetUser;
}

const ChatSidebar = ({ isOpen, onClose, targetUser }: ChatSidebarProps) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          key="chat-sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 420, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-full overflow-hidden border-l border-slate-200 bg-white"
        >
          <ChatSidebarPanel
            isOpen={isOpen}
            onClose={onClose}
            targetUser={targetUser}
          />
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default ChatSidebar;
