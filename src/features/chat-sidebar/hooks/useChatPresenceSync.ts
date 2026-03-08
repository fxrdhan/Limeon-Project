import type { UserDetails } from '@/types/database';
import { useCallback } from 'react';
import {
  chatSidebarGateway,
  type RealtimeChannel,
  type UserPresence,
} from '../data/chatSidebarGateway';

interface BuildPresenceStatePayloadOptions {
  keepOnline: boolean;
  timestamp?: string;
}

interface SyncPresenceStateOptions extends Omit<
  BuildPresenceStatePayloadOptions,
  'timestamp'
> {
  shouldBroadcast: boolean;
  broadcastChannel?: RealtimeChannel | null;
  timestamp?: string;
}

export const useChatPresenceSync = ({ user }: { user: UserDetails | null }) => {
  const buildPresenceStatePayload = useCallback(
    ({ keepOnline, timestamp }: BuildPresenceStatePayloadOptions) => {
      const eventTimestamp = timestamp ?? new Date().toISOString();

      return {
        is_online: keepOnline,
        last_seen: eventTimestamp,
        updated_at: eventTimestamp,
      };
    },
    []
  );

  const broadcastPresenceChange = useCallback(
    (
      broadcastChannel: RealtimeChannel | null | undefined,
      presenceState: Pick<UserPresence, 'user_id' | 'is_online' | 'last_seen'>
    ) => {
      if (!broadcastChannel) {
        return;
      }

      void broadcastChannel.send({
        type: 'broadcast',
        event: 'presence_changed',
        payload: presenceState,
      });
    },
    []
  );

  const syncPresenceState = useCallback(
    async ({
      keepOnline,
      shouldBroadcast,
      broadcastChannel,
      timestamp,
    }: SyncPresenceStateOptions) => {
      if (!user) return false;

      const nextPresenceState = buildPresenceStatePayload({
        keepOnline,
        timestamp,
      });

      try {
        const { data: updateData, error: updateError } =
          await chatSidebarGateway.updateUserPresence(
            user.id,
            nextPresenceState
          );

        let persistedPresence: UserPresence | null = updateData?.[0] ?? null;
        const didUpdateExistingPresence =
          !updateError && Boolean(updateData && updateData.length > 0);
        const shouldInsertMissingPresenceRecord =
          !updateError && (!updateData || updateData.length === 0);

        if (didUpdateExistingPresence) {
          if (shouldBroadcast) {
            broadcastPresenceChange(broadcastChannel, {
              user_id: user.id,
              is_online:
                persistedPresence?.is_online ?? nextPresenceState.is_online,
              last_seen:
                persistedPresence?.last_seen ?? nextPresenceState.last_seen,
            });
          }

          return true;
        }

        if (!shouldInsertMissingPresenceRecord) {
          if (updateError) {
            console.error('Error updating user presence:', updateError);
          }

          return false;
        }

        const { data: insertData, error: insertError } =
          await chatSidebarGateway.insertUserPresence({
            user_id: user.id,
            ...nextPresenceState,
          });
        persistedPresence = insertData?.[0] ?? null;

        if (insertError) {
          console.error('Error inserting user presence:', insertError);
          return false;
        }

        if (shouldBroadcast) {
          broadcastPresenceChange(broadcastChannel, {
            user_id: user.id,
            is_online:
              persistedPresence?.is_online ?? nextPresenceState.is_online,
            last_seen:
              persistedPresence?.last_seen ?? nextPresenceState.last_seen,
          });
        }

        return true;
      } catch (error) {
        console.error('Caught error syncing user presence:', error);
        return false;
      }
    },
    [broadcastPresenceChange, buildPresenceStatePayload, user]
  );

  return {
    buildPresenceStatePayload,
    syncPresenceState,
  };
};
