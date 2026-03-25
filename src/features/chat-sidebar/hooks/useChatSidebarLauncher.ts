import { useCallback } from 'react';
import { useChatSidebarStore } from '@/store/chatSidebarStore';
import type { ChatTargetUser } from '@/types';
import { useChatDirectoryRoster } from './useChatDirectoryRoster';

export const useChatSidebarLauncher = (shouldLoadDirectory = false) => {
  const openChat = useChatSidebarStore(state => state.openChat);
  const directoryRoster = useChatDirectoryRoster(shouldLoadDirectory);

  const openChatForUser = useCallback(
    (targetUser: ChatTargetUser) => {
      openChat(targetUser);
    },
    [openChat]
  );

  return {
    ...directoryRoster,
    openChatForUser,
  };
};
