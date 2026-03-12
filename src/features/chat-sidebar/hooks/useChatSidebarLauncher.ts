import { useCallback } from 'react';
import { usePresenceRoster } from '@/hooks/presence/usePresenceRoster';
import { useChatSidebarStore } from '@/store/chatSidebarStore';
import type { ChatTargetUser } from '@/types';

export const useChatSidebarLauncher = (shouldLoadDirectory = false) => {
  const toggleChatForUser = useChatSidebarStore(
    state => state.toggleChatForUser
  );
  const presenceRoster = usePresenceRoster(shouldLoadDirectory);

  const openChatForUser = useCallback(
    (targetUser: ChatTargetUser) => {
      toggleChatForUser(targetUser);
    },
    [toggleChatForUser]
  );

  return {
    ...presenceRoster,
    openChatForUser,
  };
};
