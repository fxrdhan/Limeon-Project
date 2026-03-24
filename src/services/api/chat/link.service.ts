import { supabase, supabaseUrl } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  ChatSharedLinkCreateRequest,
  ChatSharedLinkResponse,
} from '../../../../shared/chatFunctionContracts';

const DEFAULT_CHAT_LINK_PUBLIC_URL = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/chat-link`;

export const normalizeChatLinkApiUrl = (value?: string) =>
  (value?.trim() || DEFAULT_CHAT_LINK_PUBLIC_URL).replace(/\/+$/, '');

export const getChatLinkApiBaseUrl = () =>
  normalizeChatLinkApiUrl(
    import.meta.env.VITE_CHAT_LINK_API_URL as string | undefined
  );

export const buildChatSharedLinkShortUrl = (slug: string) =>
  `${getChatLinkApiBaseUrl()}/${slug.trim().replace(/^\/+/, '')}`;

const buildChatLinkError = (
  message: string,
  code = 'CHAT_LINK_REQUEST_FAILED'
): PostgrestError => ({
  code,
  details: '',
  hint: '',
  message,
  name: 'PostgrestError',
});

export const chatLinkService = {
  async createSharedLink(
    request: ChatSharedLinkCreateRequest
  ): Promise<ServiceResponse<ChatSharedLinkResponse>> {
    try {
      const { data: payload, error } =
        await supabase.functions.invoke<ChatSharedLinkResponse>('chat-link', {
          body: request,
        });

      if (error) {
        return {
          data: null,
          error: error as PostgrestError,
        };
      }

      if (
        typeof payload?.slug !== 'string' ||
        typeof payload.shortUrl !== 'string'
      ) {
        return {
          data: null,
          error: buildChatLinkError(
            'Invalid chat link response',
            'CHAT_LINK_INVALID_RESPONSE'
          ),
        };
      }

      return {
        data: {
          slug: payload.slug,
          shortUrl: payload.shortUrl,
          storagePath:
            typeof payload.storagePath === 'string'
              ? payload.storagePath
              : null,
          targetUrl:
            typeof payload.targetUrl === 'string' ? payload.targetUrl : null,
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
