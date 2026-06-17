import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vite-plus/test';
import { toServiceError } from './base.service';

const createPostgrestError = (message: string): PostgrestError =>
  Object.assign(new Error(message), {
    name: 'PostgrestError',
    code: 'TEST_ERROR',
    details: '',
    hint: '',
    toJSON: () => ({
      name: 'PostgrestError',
      message,
      details: '',
      hint: '',
      code: 'TEST_ERROR',
    }),
  });

describe('base service error normalization', () => {
  it('preserves native Error instances', () => {
    const error = new Error('network failed');

    expect(toServiceError(error)).toBe(error);
  });

  it('preserves PostgrestError instances', () => {
    const error = createPostgrestError('row missing');

    expect(toServiceError(error)).toBe(error);
  });

  it('preserves plain PostgrestError objects', () => {
    const error = {
      name: 'PostgrestError',
      message: 'row missing',
      code: 'PGRST116',
      details: '',
      hint: '',
      toJSON: () => ({
        name: 'PostgrestError',
        message: 'row missing',
        details: '',
        hint: '',
        code: 'PGRST116',
      }),
    } as PostgrestError;

    expect(toServiceError(error)).toBe(error);
  });

  it('converts thrown string values into Error instances', () => {
    const error = toServiceError('request aborted');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('request aborted');
  });

  it('preserves message-bearing object errors as Error instances', () => {
    const error = toServiceError({
      name: 'FunctionsHttpError',
      message: 'Unauthorized',
      status: 401,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unauthorized');
    expect('status' in error ? error.status : undefined).toBe(401);
  });

  it('converts non-error values into a stable generic Error', () => {
    const error = toServiceError({ reason: 'unknown' });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unknown service error');
  });
});
