import type { UserDetails } from '@/types/database';
import { useCallback } from 'react';
import {
  chatSidebarGateway,
  type RealtimeChannel,
  type UserPresence,
} from '../data/chatSidebarGateway';

interface BuildPresenceStatePayloadOptions {
  keepOnline: boolean;
  currentChatChannel: string | null;
  timestamp?: string;
}

interface SyncPresenceStateOptions extends BuildPresenceStatePayloadOptions {
  shouldBroadcast: boolean;
  broadcastChannel?: RealtimeChannel | null;
}

export const useChatPresenceSync = ({ user }: { user: UserDetails | null }) => {
  const buildPresenceStatePayload = useCallback(
    ({
      keepOnline,
      currentChatChannel,
      timestamp,
    }: BuildPresenceStatePayloadOptions) => {
      const eventTimestamp = timestamp ?? new Date().toISOString();

      return {
        is_online: keepOnline,
        current_chat_channel: currentChatChannel,
        last_seen: eventTimestamp,
        updated_at: eventTimestamp,
      };
    },
    []
  );

  const broadcastPresenceChange = useCallback(
    (
      broadcastChannel: RealtimeChannel | null | undefined,
      presenceState: Pick<
        UserPresence,
        'user_id' | 'is_online' | 'current_chat_channel' | 'last_seen'
      >
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
      currentChatChannel,
      shouldBroadcast,
      broadcastChannel,
      timestamp,
    }: SyncPresenceStateOptions) => {
      if (!user) return false;

      const nextPresenceState = buildPresenceStatePayload({
        keepOnline,
        currentChatChannel,
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
              current_chat_channel:
                persistedPresence?.current_chat_channel ??
                nextPresenceState.current_chat_channel,
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
            current_chat_channel:
              persistedPresence?.current_chat_channel ??
              nextPresenceState.current_chat_channel,
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
