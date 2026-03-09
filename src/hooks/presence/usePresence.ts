import { useAuthStore } from '@/store/authStore';
import { useCallback } from 'react';
import { chatService } from '@/services/api/chat.service';
import { usePresenceLifecycle } from './usePresenceLifecycle';
import { usePresenceRosterSync } from './usePresenceRosterSync';

export const usePresence = () => {
  const { user, session } = useAuthStore();

  const syncUserPresenceState = useCallback(
    async (keepOnline: boolean, timestamp = new Date().toISOString()) => {
      if (!user?.id) {
        return false;
      }

      const payload = {
        is_online: keepOnline,
        last_seen: timestamp,
        updated_at: timestamp,
      };

      try {
        const { data: updateData, error: updateError } =
          await chatService.updateUserPresence(user.id, payload);

        if (!updateError && (updateData?.length ?? 0) > 0) {
          return true;
        }

        if (updateError) {
          console.error('Failed to update presence row:', updateError);
          return false;
        }

        const { error: insertError } = await chatService.insertUserPresence({
          user_id: user.id,
          ...payload,
        });

        if (insertError) {
          console.error('Failed to insert presence row:', insertError);
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
