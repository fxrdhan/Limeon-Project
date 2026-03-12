import { useEffect } from 'react';
import { usePresence } from '@/hooks/presence/usePresence';
import { usePageFocusBlockStore } from '@/store/pageFocusBlockStore';
import { useChatSidebarStore } from '@/store/chatSidebarStore';
import { useChatRuntime } from './useChatRuntime';

export const useChatSidebarHost = () => {
  usePresence();
  useChatRuntime();

  const isOpen = useChatSidebarStore(state => state.isOpen);
  const targetUser = useChatSidebarStore(state => state.targetUser);
  const closeChat = useChatSidebarStore(state => state.closeChat);
  const setPageFocusBlocked = usePageFocusBlockStore(state => state.setBlocked);

  useEffect(() => {
    setPageFocusBlocked(isOpen);
  }, [isOpen, setPageFocusBlocked]);

  useEffect(() => {
    return () => {
      setPageFocusBlocked(false);
    };
  }, [setPageFocusBlocked]);

  return {
    isOpen,
    targetUser,
    closeChat,
  };
};
