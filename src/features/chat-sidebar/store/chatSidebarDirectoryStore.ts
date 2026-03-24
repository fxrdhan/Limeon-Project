import { chatSidebarDirectoryGateway } from '../data/chatSidebarGateway';
import { createDirectoryStore } from '@/store/createDirectoryStore';

export const useChatSidebarDirectoryStore = createDirectoryStore({
  getUsersPage: (pageSize, offset) =>
    chatSidebarDirectoryGateway.getUsersPage(pageSize, offset),
  onLoadError: error => {
    console.error('Error loading chat user directory:', error);
  },
});
