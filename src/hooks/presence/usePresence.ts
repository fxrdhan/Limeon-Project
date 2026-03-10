import { useAuthStore } from '@/store/authStore';
import { usePresenceLifecycle } from './usePresenceLifecycle';
import { usePresenceRosterSync } from './usePresenceRosterSync';

export const usePresence = () => {
  const { user, session } = useAuthStore();

  usePresenceRosterSync({ user });
  usePresenceLifecycle({
    userId: user?.id ?? null,
    accessToken: session?.access_token ?? null,
  });
};
