import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  ChatSharedLinkCreateRequest,
  ChatSharedLinkResponse,
} from '../../../../shared/chatFunctionContracts';

export const chatLinkService = {
  async createSharedLink(
    storagePath: string
  ): Promise<ServiceResponse<ChatSharedLinkResponse>> {
    try {
      const request: ChatSharedLinkCreateRequest = {
        storagePath,
      };
      const { data, error } =
        await supabase.functions.invoke<ChatSharedLinkResponse>('chat-link', {
          body: request,
        });

      if (error) {
        return {
          data: null,
          error: error as PostgrestError,
        };
      }

      return {
        data: data
          ? {
              slug: data.slug,
              shortUrl: data.shortUrl,
              storagePath: data.storagePath,
            }
          : null,
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
