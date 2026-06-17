import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { PostgrestError } from '@supabase/supabase-js';
import { loadTargetPresenceSnapshot } from './target-presence';

const { mockGetUserPresence } = vi.hoisted(() => ({
  mockGetUserPresence: vi.fn(),
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarPresenceGateway: {
    getUserPresence: mockGetUserPresence,
  },
}));

const createPostgrestError = (code: string): PostgrestError =>
  Object.assign(new Error(code), {
    name: 'PostgrestError',
    code,
    details: '',
    hint: '',
    toJSON: () => ({
      name: 'PostgrestError',
      message: code,
      details: '',
      hint: '',
      code,
    }),
  });

describe('target presence snapshot loading', () => {
  beforeEach(() => {
    mockGetUserPresence.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the presence snapshot when the gateway succeeds', async () => {
    const presence = {
      user_id: 'user-1',
      is_online: true,
      last_seen: '2026-06-15T00:00:00.000Z',
      updated_at: '2026-06-15T00:00:00.000Z',
    };
    mockGetUserPresence.mockResolvedValue({
      data: presence,
      error: null,
    });

    await expect(
      loadTargetPresenceSnapshot('user-1', 'Presence test')
    ).resolves.toEqual({
      presence,
      errorMessage: null,
    });
  });

  it('treats missing persisted presence rows as an empty snapshot', async () => {
    mockGetUserPresence.mockResolvedValue({
      data: null,
      error: createPostgrestError('PGRST116'),
    });

    await expect(
      loadTargetPresenceSnapshot('user-1', 'Presence test')
    ).resolves.toEqual({
      presence: null,
      errorMessage: null,
    });

    expect(console.error).not.toHaveBeenCalled();
  });

  it('returns the fallback error message for non-PostgREST service errors', async () => {
    const error = new Error('network unavailable');
    mockGetUserPresence.mockResolvedValue({
      data: null,
      error,
    });

    await expect(
      loadTargetPresenceSnapshot('user-1', 'Presence test')
    ).resolves.toEqual({
      presence: null,
      errorMessage: 'Status online tidak tersedia',
    });

    expect(console.error).toHaveBeenCalledWith('Presence test:', error);
  });
});
