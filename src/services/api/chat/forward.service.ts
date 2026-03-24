import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type {
  ChatForwardMessageRequest,
  ChatForwardMessageResponse,
} from '../../../../shared/chatFunctionContracts';
import type { ChatForwardMessageResult } from './types';

const normalizeRecipientIds = (recipientIds: string[] | null | undefined) =>
  [...new Set(recipientIds ?? [])].filter(
    (recipientId): recipientId is string =>
      typeof recipientId === 'string' && recipientId.trim().length > 0
  );

export const chatForwardService = {
  async forwardMessage(
    payload: ChatForwardMessageRequest
  ): Promise<ServiceResponse<ChatForwardMessageResult>> {
    try {
      const { data, error } =
        await supabase.functions.invoke<ChatForwardMessageResponse>(
          'chat-forward-message',
          {
            body: payload,
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          forwardedRecipientIds: normalizeRecipientIds(
            data?.forwardedRecipientIds
          ),
          failedRecipientIds: normalizeRecipientIds(data?.failedRecipientIds),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
