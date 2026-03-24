import {
  mergePresenceUsers,
  moveCurrentUserToEdge,
} from '@/hooks/presence/roster';
import { useDirectoryRoster } from '@/hooks/useDirectoryRoster';
import { useChatSidebarDirectoryStore } from '../store/chatSidebarDirectoryStore';

export const useChatDirectoryRoster = (shouldLoadDirectory = false) =>
  useDirectoryRoster({
    shouldLoadDirectory,
    useDirectoryStore: useChatSidebarDirectoryStore,
    mergeUsers: mergePresenceUsers,
    moveCurrentUserToEdge,
  });
