import { useAuthStore } from '@/store/authStore';
import { useCallback } from 'react';
import { chatService } from '@/services/api/chat.service';
import { usePresenceLifecycle } from './usePresenceLifecycle';
import { usePresenceRosterSync } from './usePresenceRosterSync';

export const usePresence = () => {
  const { user, session } = useAuthStore();

  const syncUserPresenceState = useCallback(
    async (keepOnline: boolean, _timestamp = new Date().toISOString()) => {
      if (!user?.id) {
        return false;
      }

      const payload = {
        is_online: keepOnline,
      };

      try {
        const { error } = await chatService.upsertUserPresence(
          user.id,
          payload
        );
        if (error) {
          console.error('Failed to upsert presence row:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Caught error syncing presence row:', error);
        return false;
      }
    },
    [user?.id]
  );

  usePresenceRosterSync({ user });
  usePresenceLifecycle({
    user,
    accessToken: session?.access_token ?? null,
    syncUserPresenceState,
  });
};
