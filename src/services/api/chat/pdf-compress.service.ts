import { supabase, supabaseUrl } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import {
  CHAT_PDF_COMPRESS_DEFAULT_LEVEL,
  type ChatPdfCompressionLevel,
} from '../../../../shared/chatFunctionContracts';

export interface ChatPdfCompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
}

const DEFAULT_CHAT_PDF_COMPRESS_FUNCTION_PATH =
  '/functions/v1/chat-pdf-compress';

const normalizeHeaderValue = (value?: string | null) => value?.trim() || '';

const buildChatPdfCompressError = (
  message: string,
  code = 'CHAT_PDF_COMPRESS_REQUEST_FAILED'
): PostgrestError => ({
  code,
  details: '',
  hint: '',
  message,
  name: 'PostgrestError',
});

const parseNumericHeader = (
  value: string | null,
  fallbackValue: number
): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : fallbackValue;
};

export const chatPdfCompressService = {
  async compressPdf(
    file: File,
    options?: {
      compressionLevel?: ChatPdfCompressionLevel;
      signal?: AbortSignal;
    }
  ): Promise<ServiceResponse<ChatPdfCompressResult>> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token?.trim();

      if (sessionError || !accessToken) {
        return {
          data: null,
          error: buildChatPdfCompressError(
            sessionError?.message || 'Missing auth session',
            '401'
          ),
        };
      }

      const formData = new FormData();
      formData.set('file', file, file.name || 'document.pdf');
      formData.set(
        'compression_level',
        options?.compressionLevel ?? CHAT_PDF_COMPRESS_DEFAULT_LEVEL
      );

      const response = await fetch(
        `${supabaseUrl}${DEFAULT_CHAT_PDF_COMPRESS_FUNCTION_PATH}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
          signal: options?.signal,
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        const payload = responseText
          ? (() => {
              try {
                return JSON.parse(responseText) as Record<string, unknown>;
              } catch {
                return null;
              }
            })()
          : null;

        return {
          data: null,
          error: buildChatPdfCompressError(
            typeof payload?.error === 'string'
              ? payload.error
              : `Chat PDF compression request failed with status ${response.status}`,
            String(response.status)
          ),
        };
      }

      const compressedBlob = await response.blob();
      if (compressedBlob.size === 0) {
        return {
          data: null,
          error: buildChatPdfCompressError(
            'Compressed PDF response is empty',
            'CHAT_PDF_COMPRESS_EMPTY_RESPONSE'
          ),
        };
      }

      const fileName =
        normalizeHeaderValue(
          response.headers.get('x-chat-pdf-compress-file-name')
        ) ||
        file.name ||
        'document.pdf';
      const contentType =
        normalizeHeaderValue(response.headers.get('content-type')) ||
        compressedBlob.type ||
        'application/pdf';
      const originalSize = parseNumericHeader(
        response.headers.get('x-chat-pdf-compress-original-size'),
        file.size
      );
      const compressedSize = parseNumericHeader(
        response.headers.get('x-chat-pdf-compress-compressed-size'),
        compressedBlob.size
      );

      return {
        data: {
          file: new File([compressedBlob], fileName, {
            type: contentType,
            lastModified: Date.now(),
          }),
          originalSize,
          compressedSize,
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
