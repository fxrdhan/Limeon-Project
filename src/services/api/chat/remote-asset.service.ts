import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type { ChatRemoteAssetRequest } from '../../../../shared/chatFunctionContracts';

export interface ChatRemoteAssetResult {
  blob: Blob;
  contentDisposition: string | null;
  contentType: string;
  sourceUrl: string;
}

const normalizeHeaderValue = (value?: string | null) => value?.trim() || '';

export const chatRemoteAssetService = {
  async fetchRemoteAsset(
    url: string
  ): Promise<ServiceResponse<ChatRemoteAssetResult>> {
    try {
      const request: ChatRemoteAssetRequest = { url };
      const { data, error, response } = await supabase.functions.invoke<Blob>(
        'chat-remote-asset',
        {
          body: request,
        }
      );

      if (error || !(data instanceof Blob)) {
        return {
          data: null,
          error: error as PostgrestError,
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
          sourceUrl,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error as PostgrestError,
      };
    }
  },
};
