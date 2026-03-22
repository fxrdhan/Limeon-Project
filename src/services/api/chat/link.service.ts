import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  ChatSharedLinkCreateRequest,
  ChatSharedLinkResponse,
} from '../../../../shared/chatFunctionContracts';

const DEFAULT_CHAT_LINK_API_URL = 'https://shrtlink.works';

export const normalizeChatLinkApiUrl = (value?: string) =>
  (value?.trim() || DEFAULT_CHAT_LINK_API_URL).replace(/\/+$/, '');

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
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token?.trim();

      if (sessionError || !accessToken) {
        return {
          data: null,
          error: buildChatLinkError(
            sessionError?.message || 'Missing auth session',
            '401'
          ),
        };
      }

      const chatLinkApiUrl = getChatLinkApiBaseUrl();
      const response = await fetch(`${chatLinkApiUrl}/api/chat-link`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });
      const responseText = await response.text();
      const payload = responseText
        ? (() => {
            try {
              return JSON.parse(
                responseText
              ) as Partial<ChatSharedLinkResponse> & Record<string, unknown>;
            } catch {
              return null;
            }
          })()
        : null;

      if (!response.ok) {
        return {
          data: null,
          error: buildChatLinkError(
            typeof payload?.error === 'string'
              ? payload.error
              : `Chat link request failed with status ${response.status}`,
            String(response.status)
          ),
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
