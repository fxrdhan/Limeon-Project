import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  PersistChatPdfPreviewInput,
  PersistChatPdfPreviewResult,
} from './types';

export const chatPreviewService = {
  async persistPdfPreview(
    payload: PersistChatPdfPreviewInput
  ): Promise<ServiceResponse<PersistChatPdfPreviewResult>> {
    try {
      const { data, error } =
        await supabase.functions.invoke<PersistChatPdfPreviewResult>(
          'chat-pdf-preview',
          {
            body: payload,
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: data ?? null,
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
