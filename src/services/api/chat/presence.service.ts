import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type { UserPresence, UserPresenceUpdateInput } from './types';

const USER_PRESENCE_EXIT_RPC = 'sync_user_presence_on_exit';

const buildUserPresenceExitRpcUrl = () =>
  new URL(`${supabaseUrl}/rest/v1/rpc/${USER_PRESENCE_EXIT_RPC}`).toString();

const syncUserPresenceExitRpc = async (
  userId: string,
  payload: UserPresenceUpdateInput
): Promise<ServiceResponse<UserPresence>> => {
  try {
    const { data, error } = await supabase.rpc(USER_PRESENCE_EXIT_RPC, {
      p_user_id: userId,
      p_is_online:
        typeof payload.is_online === 'boolean' ? payload.is_online : null,
      p_last_seen: payload.last_seen ?? null,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as UserPresence, error: null };
  } catch (error) {
    return { data: null, error: error as PostgrestError };
  }
};

export const chatPresenceService = {
  async getUserPresence(
    userId: string
  ): Promise<ServiceResponse<UserPresence>> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as UserPresence, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async upsertUserPresence(
    userId: string,
    payload: Pick<UserPresenceUpdateInput, 'is_online'>
  ): Promise<ServiceResponse<UserPresence>> {
    try {
      const { data, error } = await supabase.rpc('upsert_user_presence', {
        p_user_id: userId,
        p_is_online:
          typeof payload.is_online === 'boolean' ? payload.is_online : null,
        p_last_chat_opened: null,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: data as UserPresence, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async syncUserPresenceOnlineState(userId: string, isOnline: boolean) {
    try {
      const { error } = await chatPresenceService.upsertUserPresence(userId, {
        is_online: isOnline,
      });

      if (error) {
        console.error('Failed to sync user presence state:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Caught error syncing user presence state:', error);
      return false;
    }
  },

  async listActivePresenceSince(
    since: string
  ): Promise<ServiceResponse<UserPresence[]>> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen, updated_at')
        .eq('is_online', true)
        .gte('last_seen', since);

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as UserPresence[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  sendUserPresenceUpdateKeepalive(
    userId: string,
    payload: UserPresenceUpdateInput,
    accessToken?: string | null
  ) {
    if (
      typeof window === 'undefined' ||
      typeof fetch !== 'function' ||
      !userId ||
      !accessToken
    ) {
      return false;
    }

    try {
      void fetch(buildUserPresenceExitRpcUrl(), {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          p_user_id: userId,
          p_is_online:
            typeof payload.is_online === 'boolean' ? payload.is_online : null,
          p_last_seen: payload.last_seen ?? null,
        }),
        keepalive: true,
      }).catch(error => {
        console.error(
          'Keepalive presence update failed while closing chat:',
          error
        );
      });

      return true;
    } catch (error) {
      console.error('Error starting keepalive presence update:', error);
      return false;
    }
  },

  syncUserPresenceOnPageExit(
    userId: string,
    accessToken?: string | null,
    timestamp = new Date().toISOString()
  ) {
    const exitPayload: UserPresenceUpdateInput = {
      is_online: false,
      last_seen: timestamp,
      updated_at: timestamp,
    };

    const keepaliveStarted =
      chatPresenceService.sendUserPresenceUpdateKeepalive(
        userId,
        exitPayload,
        accessToken
      );

    void syncUserPresenceExitRpc(userId, exitPayload)
      .then(({ error }) => {
        if (error) {
          console.error(
            'Fallback presence update failed while closing chat:',
            error
          );
        }
      })
      .catch(error => {
        console.error(
          'Fallback presence update crashed while closing chat:',
          error
        );
      });

    return keepaliveStarted;
  },
};
