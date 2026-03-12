import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  CleanupStoragePathsResult,
  DeleteMessageThreadAndCleanupResult,
  DeleteMessageThreadsAndCleanupResult,
  RetryChatCleanupFailuresResult,
} from './types';
import type {
  CleanupStoragePathsRequest,
  DeleteMessageThreadAndCleanupRequest,
  DeleteMessageThreadsAndCleanupRequest,
  RetryChatCleanupFailuresRequest,
} from '../../../../shared/chatFunctionContracts';

const normalizeStoragePaths = (
  storagePaths: Array<string | null | undefined>
) =>
  [...new Set(storagePaths)]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

const normalizeMessageIds = (messageIds: Array<string | null | undefined>) =>
  [...new Set(messageIds)]
    .map(messageId => messageId?.trim() || null)
    .filter((messageId): messageId is string => Boolean(messageId));

export const chatCleanupService = {
  async deleteMessageThreadAndCleanup(
    id: string
  ): Promise<ServiceResponse<DeleteMessageThreadAndCleanupResult>> {
    try {
      const request: DeleteMessageThreadAndCleanupRequest = {
        action: 'delete_thread',
        messageId: id,
      };
      const { data, error } =
        await supabase.functions.invoke<DeleteMessageThreadAndCleanupResult>(
          'chat-cleanup',
          {
            body: request,
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

  async deleteMessageThreadsAndCleanup(
    messageIds: Array<string | null | undefined>
  ): Promise<ServiceResponse<DeleteMessageThreadsAndCleanupResult>> {
    const normalizedMessageIds = normalizeMessageIds(messageIds);

    if (normalizedMessageIds.length === 0) {
      return {
        data: {
          deletedMessageIds: [],
          deletedTargetMessageIds: [],
          failedTargetMessageIds: [],
          cleanupWarningTargetMessageIds: [],
          failedStoragePaths: [],
        },
        error: null,
      };
    }

    try {
      const request: DeleteMessageThreadsAndCleanupRequest = {
        action: 'delete_threads',
        messageIds: normalizedMessageIds,
      };
      const { data, error } =
        await supabase.functions.invoke<DeleteMessageThreadsAndCleanupResult>(
          'chat-cleanup',
          {
            body: request,
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          deletedMessageIds: normalizeMessageIds(data?.deletedMessageIds ?? []),
          deletedTargetMessageIds: normalizeMessageIds(
            data?.deletedTargetMessageIds ?? []
          ),
          failedTargetMessageIds: normalizeMessageIds(
            data?.failedTargetMessageIds ?? []
          ),
          cleanupWarningTargetMessageIds: normalizeMessageIds(
            data?.cleanupWarningTargetMessageIds ?? []
          ),
          failedStoragePaths: normalizeStoragePaths(
            data?.failedStoragePaths ?? []
          ),
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
      const request: CleanupStoragePathsRequest = {
        action: 'cleanup_storage',
        storagePaths: normalizedStoragePaths,
      };
      const { data, error } =
        await supabase.functions.invoke<CleanupStoragePathsResult>(
          'chat-cleanup',
          {
            body: request,
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
      const request: RetryChatCleanupFailuresRequest = {
        action: 'retry_failures',
      };
      const { data, error } =
        await supabase.functions.invoke<RetryChatCleanupFailuresResult>(
          'chat-cleanup',
          {
            body: request,
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
          skippedCount:
            typeof data?.skippedCount === 'number' ? data.skippedCount : 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
