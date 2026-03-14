import { describe, expect, it } from 'vite-plus/test';
import { computeDmChannelId } from '../utils/channel';

describe('computeDmChannelId', () => {
  it('matches the Supabase dm channel contract regardless of user order', () => {
    const userA = '9a4d0b0a-1111-4444-8888-aaaaaaaaaaaa';
    const userB = '2b8f7c3d-2222-5555-9999-bbbbbbbbbbbb';

    expect(computeDmChannelId(userA, userB)).toBe(
      'dm_2b8f7c3d-2222-5555-9999-bbbbbbbbbbbb_9a4d0b0a-1111-4444-8888-aaaaaaaaaaaa'
    );
    expect(computeDmChannelId(userB, userA)).toBe(
      'dm_2b8f7c3d-2222-5555-9999-bbbbbbbbbbbb_9a4d0b0a-1111-4444-8888-aaaaaaaaaaaa'
    );
  });
});
