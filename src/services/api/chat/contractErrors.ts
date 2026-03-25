import type { PostgrestError } from '@supabase/supabase-js';

const CHAT_CONTRACT_ERROR_CODE = 'CHAT_CONTRACT_INVALID';
const CHAT_CONTRACT_ERROR_DETAILS = 'Chat service received malformed data.';
const CHAT_CONTRACT_ERROR_HINT =
  'Check the chat RPC or Edge Function response contract.';

export class ChatContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatContractError';
  }
}

const isPostgrestError = (error: unknown): error is PostgrestError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof error.code === 'string' &&
  'details' in error &&
  typeof error.details === 'string' &&
  'hint' in error &&
  typeof error.hint === 'string' &&
  'message' in error &&
  typeof error.message === 'string';

export const createChatContractError = (
  message: string,
  details = CHAT_CONTRACT_ERROR_DETAILS,
  hint = CHAT_CONTRACT_ERROR_HINT
): PostgrestError => ({
  name: 'PostgrestError',
  message,
  details,
  hint,
  code: CHAT_CONTRACT_ERROR_CODE,
});

export const toChatServiceError = (error: unknown): PostgrestError => {
  if (error instanceof ChatContractError) {
    return createChatContractError(error.message);
  }

  if (isPostgrestError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return createChatContractError(error.message);
  }

  return createChatContractError('Unknown chat service error');
};

export function invariantChatContract(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new ChatContractError(message);
  }
}
