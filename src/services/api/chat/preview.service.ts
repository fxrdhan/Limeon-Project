import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  PersistChatPdfPreviewInput,
  PersistChatPdfPreviewResponse,
  PersistChatPdfPreviewResult,
} from './types';
import { normalizeChatMessage } from './normalizers';

export const chatPreviewService = {
  async persistPdfPreview(
    payload: PersistChatPdfPreviewInput
  ): Promise<ServiceResponse<PersistChatPdfPreviewResult>> {
    try {
      const { data, error } =
        await supabase.functions.invoke<PersistChatPdfPreviewResponse>(
          'chat-pdf-preview',
          {
            body: payload,
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: data?.message
          ? {
              message: normalizeChatMessage(data.message)!,
              previewPersisted: Boolean(data.previewPersisted),
            }
          : null,
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
