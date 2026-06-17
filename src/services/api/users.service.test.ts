import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

const buildDirectoryUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-a',
  name: 'Admin',
  email: 'admin@example.com',
  profilephoto: null,
  profilephoto_thumb: null,
  last_message: null,
  last_message_created_at: null,
  ...overrides,
});

describe('usersService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('loads directory users through the chat directory rpc contract', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        buildDirectoryUser({ id: 'user-a', name: 'Admin' }),
        buildDirectoryUser({ id: 'user-b', name: 'Kasir' }),
        buildDirectoryUser({ id: 'user-c', name: 'Gudang' }),
      ],
      error: null,
    });

    const { usersService } = await import('./users.service');

    const result = await usersService.getUsersPage(2, 5);

    expect(mockRpc).toHaveBeenCalledWith('list_chat_directory_users', {
      p_limit: 3,
      p_offset: 5,
    });
    expect(result).toEqual({
      data: {
        users: [
          buildDirectoryUser({ id: 'user-a', name: 'Admin' }),
          buildDirectoryUser({ id: 'user-b', name: 'Kasir' }),
        ],
        hasMore: true,
      },
      error: null,
    });
  });

  it('returns a normalized service error for malformed directory rows', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        buildDirectoryUser({
          email: null,
        }),
      ],
      error: null,
    });

    const { usersService } = await import('./users.service');

    const result = await usersService.getUsersPage();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe(
      'Chat contract violation: directory_user.email must be a string.'
    );
  });
});
