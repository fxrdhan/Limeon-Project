import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  CleanupStoragePathsResult,
  DeleteMessageThreadAndCleanupResult,
  RetryChatCleanupFailuresResult,
} from './types';

const normalizeStoragePaths = (
  storagePaths: Array<string | null | undefined>
) =>
  [...new Set(storagePaths)]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

export const chatCleanupService = {
  async deleteMessageThreadAndCleanup(
    id: string
  ): Promise<ServiceResponse<DeleteMessageThreadAndCleanupResult>> {
    try {
      const { data, error } =
        await supabase.functions.invoke<DeleteMessageThreadAndCleanupResult>(
          'chat-cleanup',
          {
            body: {
              action: 'delete_thread',
              messageId: id,
            },
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          deletedMessageIds: Array.isArray(data?.deletedMessageIds)
            ? data.deletedMessageIds.filter(
                deletedMessageId =>
                  typeof deletedMessageId === 'string' &&
                  deletedMessageId.length > 0
              )
            : [],
          failedStoragePaths: Array.isArray(data?.failedStoragePaths)
            ? data.failedStoragePaths.filter(
                failedStoragePath =>
                  typeof failedStoragePath === 'string' &&
                  failedStoragePath.length > 0
              )
            : [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async cleanupStoragePaths(
    storagePaths: Array<string | null | undefined>
  ): Promise<ServiceResponse<CleanupStoragePathsResult>> {
    const normalizedStoragePaths = normalizeStoragePaths(storagePaths);

    if (normalizedStoragePaths.length === 0) {
      return {
        data: {
          failedStoragePaths: [],
        },
        error: null,
      };
    }

    try {
      const { data, error } =
        await supabase.functions.invoke<CleanupStoragePathsResult>(
          'chat-cleanup',
          {
            body: {
              action: 'cleanup_storage',
              storagePaths: normalizedStoragePaths,
            },
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          failedStoragePaths: Array.isArray(data?.failedStoragePaths)
            ? data.failedStoragePaths.filter(
                failedStoragePath =>
                  typeof failedStoragePath === 'string' &&
                  failedStoragePath.length > 0
              )
            : [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async retryChatCleanupFailures(): Promise<
    ServiceResponse<RetryChatCleanupFailuresResult>
  > {
    try {
      const { data, error } =
        await supabase.functions.invoke<RetryChatCleanupFailuresResult>(
          'chat-cleanup',
          {
            body: {
              action: 'retry_failures',
            },
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          resolvedCount:
            typeof data?.resolvedCount === 'number' ? data.resolvedCount : 0,
          remainingCount:
            typeof data?.remainingCount === 'number' ? data.remainingCount : 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
