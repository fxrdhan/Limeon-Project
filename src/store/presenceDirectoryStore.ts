import { createDirectoryStore } from '@/store/createDirectoryStore';
import { getPresenceDirectoryUsersPage } from './presenceDirectoryStoreServices';

export const usePresenceDirectoryStore = createDirectoryStore({
  getUsersPage: getPresenceDirectoryUsersPage,
  onLoadError: error => {
    console.error('Error loading presence user directory:', error);
  },
});
