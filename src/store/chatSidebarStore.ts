import { create } from 'zustand';
import type { ChatTargetUser } from '@/types';

interface ChatSidebarState {
  isOpen: boolean;
  targetUser?: ChatTargetUser;
  openChat: (targetUser: ChatTargetUser) => void;
  closeChat: () => void;
  toggleChatForUser: (targetUser: ChatTargetUser) => void;
}

export const useChatSidebarStore = create<ChatSidebarState>(set => ({
  isOpen: false,
  targetUser: undefined,
  openChat: targetUser =>
    set({
      isOpen: true,
      targetUser,
    }),
  closeChat: () =>
    set({
      isOpen: false,
      targetUser: undefined,
    }),
  toggleChatForUser: targetUser =>
    set(previousState => {
      const isSameUser = previousState.targetUser?.id === targetUser.id;

      if (previousState.isOpen && isSameUser) {
        return {
          isOpen: false,
          targetUser: undefined,
        };
      }

      return {
        isOpen: true,
        targetUser,
      };
    }),
}));

export const isChatSidebarOpen = () => useChatSidebarStore.getState().isOpen;
