import { useDirectoryRoster } from '@/hooks/useDirectoryRoster';
import { useChatSidebarDirectoryStore } from '../store/chatSidebarDirectoryStore';
import {
  mergeChatDirectoryUsers,
  moveCurrentChatUserToEdge,
} from '../utils/chatDirectoryRoster';

export const useChatDirectoryRoster = (shouldLoadDirectory = false) =>
  useDirectoryRoster({
    shouldLoadDirectory,
    useDirectoryStore: useChatSidebarDirectoryStore,
    mergeUsers: mergeChatDirectoryUsers,
    moveCurrentUserToEdge: moveCurrentChatUserToEdge,
  });
