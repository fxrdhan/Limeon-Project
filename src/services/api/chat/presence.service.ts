import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { ServiceResponse } from '../base.service';
import type {
  PresenceSyncResult,
  UserPresence,
  UserPresenceUpdateInput,
} from './types';
import {
  buildGetUserPresenceRpcArgs,
  buildListActiveUserPresenceSinceRpcArgs,
  buildSyncUserPresenceOnExitRpcArgs,
  buildUpsertUserPresenceRpcArgs,
  CHAT_RPC_NAMES,
} from './rpc-contract';
import {
  normalizeUserPresence,
  normalizeUserPresenceList,
} from './normalizers';
import { toChatServiceError } from './contractErrors';

const USER_PRESENCE_EXIT_RPC = CHAT_RPC_NAMES.syncUserPresenceOnExit;

const buildUserPresenceExitRpcUrl = () =>
  new URL(`${supabaseUrl}/rest/v1/rpc/${USER_PRESENCE_EXIT_RPC}`).toString();

const syncUserPresenceExitRpc = async (
  userId: string,
  payload: UserPresenceUpdateInput
): Promise<ServiceResponse<UserPresence>> => {
  try {
    const { data, error } = await supabase.rpc(
      USER_PRESENCE_EXIT_RPC,
      buildSyncUserPresenceOnExitRpcArgs(userId, payload)
    );

    if (error) {
      return { data: null, error };
    }

    return { data: normalizeUserPresence(data), error: null };
  } catch (error) {
    return { data: null, error: toChatServiceError(error) };
  }
};

export const chatPresenceService = {
  async getUserPresence(
    userId: string
  ): Promise<ServiceResponse<UserPresence>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.getUserPresence,
        buildGetUserPresenceRpcArgs(userId)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: normalizeUserPresence(data), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },

  async upsertUserPresence(
    userId: string,
    payload: Pick<UserPresenceUpdateInput, 'is_online'>
  ): Promise<ServiceResponse<UserPresence>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.upsertUserPresence,
        buildUpsertUserPresenceRpcArgs(userId, payload)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: normalizeUserPresence(data), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },

  async syncUserPresenceOnlineState(
    userId: string,
    isOnline: boolean
  ): Promise<PresenceSyncResult> {
    try {
      const { error } = await chatPresenceService.upsertUserPresence(userId, {
        is_online: isOnline,
      });

      if (error) {
        console.error('Failed to sync user presence state:', error);
        return {
          ok: false,
          errorMessage: 'Gagal menyinkronkan status online ke server.',
        };
      }

      return {
        ok: true,
        errorMessage: null,
      };
    } catch (error) {
      console.error('Caught error syncing user presence state:', error);
      return {
        ok: false,
        errorMessage: 'Gagal menyinkronkan status online ke server.',
      };
    }
  },

  async listActivePresenceSince(
    since: string
  ): Promise<ServiceResponse<UserPresence[]>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.listActiveUserPresenceSince,
        buildListActiveUserPresenceSinceRpcArgs(since)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: normalizeUserPresenceList(data || []), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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
