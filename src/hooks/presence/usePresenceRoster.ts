import { useDirectoryRoster } from '@/hooks/useDirectoryRoster';
import { usePresenceDirectoryStore } from '@/store/presenceDirectoryStore';
import { mergePresenceUsers, moveCurrentUserToEdge } from './roster';

export const usePresenceRoster = (shouldLoadDirectory = false) =>
  useDirectoryRoster({
    shouldLoadDirectory,
    useDirectoryStore: usePresenceDirectoryStore,
    mergeUsers: mergePresenceUsers,
    moveCurrentUserToEdge,
  });
