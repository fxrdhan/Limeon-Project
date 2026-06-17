import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vite-plus/test';
import {
  ChatContractError,
  createChatContractError,
  createPostgrestError,
  toChatServiceError,
} from './contractErrors';

describe('chat contract errors', () => {
  it('creates serializable PostgREST-shaped errors', () => {
    const error = createPostgrestError(
      'Missing auth session',
      '401',
      'Auth details',
      'Sign in again'
    );

    expect(error).toEqual({
      name: 'PostgrestError',
      message: 'Missing auth session',
      details: 'Auth details',
      hint: 'Sign in again',
      code: '401',
    });
    expect(error.toJSON()).toEqual({
      name: 'PostgrestError',
      message: 'Missing auth session',
      details: 'Auth details',
      hint: 'Sign in again',
      code: '401',
    });
  });

  it('preserves valid PostgREST-shaped service errors', () => {
    const error = createPostgrestError('Forbidden', '403');

    expect(toChatServiceError(error)).toBe(error);
  });

  it('converts contract and native errors to chat contract errors', () => {
    expect(
      toChatServiceError(new ChatContractError('Invalid payload'))
    ).toEqual(createChatContractError('Invalid payload'));
    expect(toChatServiceError(new Error('Network failed'))).toEqual(
      createChatContractError('Network failed')
    );
  });

  it('converts malformed error-like values to unknown chat contract errors', () => {
    const malformed = {
      code: 'PGRST123',
      message: 'Missing required fields',
    } as PostgrestError;

    expect(toChatServiceError(malformed)).toEqual(
      createChatContractError('Unknown chat service error')
    );
  });
});
