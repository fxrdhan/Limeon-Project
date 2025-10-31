/**
 * Mock Supabase Client for Testing
 *
 * Provides a comprehensive mock of Supabase client methods
 * to enable testing without actual database connections.
 */

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a mock Supabase query builder with common methods
 */
export const createMockQueryBuilder = (mockData: unknown[] = []) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockData[0], error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: mockData[0], error: null }),
    then: vi.fn().mockResolvedValue({ data: mockData, error: null }),
  };

  return builder;
};

/**
 * Creates a mock Supabase client
 */
export const createMockSupabaseClient = (): Partial<SupabaseClient> => {
  return {
    from: vi.fn(() => createMockQueryBuilder()),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://mock-url.com/file.jpg' },
        }),
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
  } as unknown as Partial<SupabaseClient>;
};

/**
 * Mock successful response
 */
export const mockSuccess = <T>(data: T) => ({
  data,
  error: null,
  status: 200,
  statusText: 'OK',
});

/**
 * Mock error response
 */
export const mockError = (message: string, code?: string) => ({
  data: null,
  error: {
    message,
    code: code || 'PGRST000',
    details: '',
    hint: '',
  },
  status: 400,
  statusText: 'Bad Request',
});

/**
 * Mock PostgrestError
 */
export const createPostgrestError = (message: string, code = 'PGRST000') => ({
  message,
  code,
  details: '',
  hint: '',
});
