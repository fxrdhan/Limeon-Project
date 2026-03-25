import { supabase } from '@/lib/supabase';
import type { ServiceResponse } from '../base.service';
import type {
  ChatForwardMessageRequest,
  ChatForwardMessageResponse,
} from '../../../../shared/chatFunctionContracts';
import type { ChatForwardMessageResult } from './types';
import { toChatServiceError } from './contractErrors';
import { normalizeChatForwardMessageResult } from './normalizers';

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
        return { data: null, error: toChatServiceError(error) };
      }

      return {
        data: normalizeChatForwardMessageResult(data),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },
};
