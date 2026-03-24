import { usersService } from '@/services/api/users.service';
import { createDirectoryStore } from '@/store/createDirectoryStore';

export const usePresenceDirectoryStore = createDirectoryStore({
  getUsersPage: (pageSize, offset) =>
    usersService.getUsersPage(pageSize, offset),
  onLoadError: error => {
    console.error('Error loading presence user directory:', error);
  },
});
