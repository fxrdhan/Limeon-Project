import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from './users.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('UsersService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('returns empty array when no ids', async () => {
    const result = await usersService.getUsersByIds([]);
    expect(result.data).toEqual([]);
  });

  it('fetches users and adds online_at', async () => {
    const query = createThenableQuery({
      data: [{ id: '1', name: 'A' }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await usersService.getUsersByIds(['1']);
    expect(result.data?.[0].online_at).toBeDefined();
  });

  it('returns empty array when data is null', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await usersService.getUsersByIds(['1']);
    expect(result.data).toEqual([]);
  });

  it('returns error when supabase fails', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await usersService.getUsersByIds(['1']);
    expect(result.data).toBeNull();
  });

  it('handles exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await usersService.getUsersByIds(['1']);
    expect(result.data).toBeNull();
  });
});
