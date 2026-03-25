import { supabase } from '@/lib/supabase';
import type { ServiceResponse } from '../base.service';
import type {
  CleanupStoragePathsResult,
  DeleteMessageThreadAndCleanupResult,
  DeleteMessageThreadsAndCleanupResult,
  RetryChatCleanupFailuresResult,
} from './types';
import { toChatServiceError } from './contractErrors';
import {
  normalizeCleanupStoragePathsResult,
  normalizeDeleteMessageThreadAndCleanupResult,
  normalizeDeleteMessageThreadsAndCleanupResult,
  normalizeRetryChatCleanupFailuresResult,
} from './normalizers';
import type {
  CleanupStoragePathsRequest,
  DeleteMessageThreadAndCleanupRequest,
  DeleteMessageThreadsAndCleanupRequest,
  RetryChatCleanupFailuresRequest,
} from '../../../../shared/chatFunctionContracts';

const normalizeRequestStringList = (values: Array<string | null | undefined>) =>
  [...new Set(values)]
    .map(value => value?.trim() || null)
    .filter((value): value is string => Boolean(value));

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
        return { data: null, error: toChatServiceError(error) };
      }

      return {
        data: normalizeDeleteMessageThreadAndCleanupResult(data),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },

  async deleteMessageThreadsAndCleanup(
    messageIds: Array<string | null | undefined>
  ): Promise<ServiceResponse<DeleteMessageThreadsAndCleanupResult>> {
    const normalizedMessageIds = normalizeRequestStringList(messageIds);

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
        return { data: null, error: toChatServiceError(error) };
      }

      return {
        data: normalizeDeleteMessageThreadsAndCleanupResult(data),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },

  async cleanupStoragePaths(
    storagePaths: Array<string | null | undefined>
  ): Promise<ServiceResponse<CleanupStoragePathsResult>> {
    const normalizedStoragePaths = normalizeRequestStringList(storagePaths);

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
        return { data: null, error: toChatServiceError(error) };
      }

      return {
        data: normalizeCleanupStoragePathsResult(data),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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
        return { data: null, error: toChatServiceError(error) };
      }

      return {
        data: normalizeRetryChatCleanupFailuresResult(data),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },
};
