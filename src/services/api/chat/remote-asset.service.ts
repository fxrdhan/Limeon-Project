import { supabase } from '@/lib/supabase';
import { toServiceError, type ServiceResponse } from '../base.service';
import { createPostgrestError } from './contractErrors';
import type { ChatRemoteAssetRequest } from '../../../../shared/chatFunctionContracts';

export interface ChatRemoteAssetResult {
  blob: Blob;
  contentDisposition: string | null;
  contentType: string;
  fileNameHint: string | null;
  sourceUrl: string;
}

const normalizeHeaderValue = (value?: string | null) => value?.trim() || '';

export const chatRemoteAssetService = {
  async fetchRemoteAsset(
    url: string,
    options?: { fileNameSourceUrl?: string | null }
  ): Promise<ServiceResponse<ChatRemoteAssetResult>> {
    try {
      const request: ChatRemoteAssetRequest = {
        url,
        ...(options?.fileNameSourceUrl
          ? { fileNameSourceUrl: options.fileNameSourceUrl }
          : {}),
      };
      const { data, error, response } = await supabase.functions.invoke<Blob>(
        'chat-remote-asset',
        {
          body: request,
        }
      );

      if (error) {
        return {
          data: null,
          error: toServiceError(error),
        };
      }

      if (!(data instanceof Blob)) {
        return {
          data: null,
          error: createPostgrestError(
            'Invalid chat remote asset response',
            'CHAT_REMOTE_ASSET_INVALID_RESPONSE'
          ),
        };
      }

      const sourceUrl =
        normalizeHeaderValue(
          response?.headers.get('x-chat-remote-source-url')
        ) || url;
      const contentType =
        normalizeHeaderValue(
          response?.headers.get('x-chat-remote-content-type')
        ) || data.type;
      const normalizedBlob =
        contentType && data.type !== contentType
          ? new Blob([data], { type: contentType })
          : data;

      return {
        data: {
          blob: normalizedBlob,
          contentDisposition:
            response?.headers.get('content-disposition') ?? null,
          contentType,
          fileNameHint:
            normalizeHeaderValue(
              response?.headers.get('x-chat-remote-file-name')
            ) || null,
          sourceUrl,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
      };
    }
  },
};
