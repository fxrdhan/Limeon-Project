import { useCallback } from 'react';
import { useChatSidebarStore } from '@/store/chatSidebarStore';
import type { ChatTargetUser } from '@/types';
import { useChatDirectoryRoster } from './useChatDirectoryRoster';

export const useChatSidebarLauncher = (shouldLoadDirectory = false) => {
  const toggleChatForUser = useChatSidebarStore(
    state => state.toggleChatForUser
  );
  const directoryRoster = useChatDirectoryRoster(shouldLoadDirectory);

  const openChatForUser = useCallback(
    (targetUser: ChatTargetUser) => {
      toggleChatForUser(targetUser);
    },
    [toggleChatForUser]
  );

  return {
    ...directoryRoster,
    openChatForUser,
  };
};
