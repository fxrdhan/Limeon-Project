import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDetails } from '../../../../types/database';
import { useChatSession } from '../hooks/useChatSession';

const { createdChannels, mockChatService, mockRealtimeService } = vi.hoisted(
  () => ({
    createdChannels: [] as Array<{
      on: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
    }>,
    mockChatService: {
      fetchMessagesBetweenUsers: vi.fn(),
      updateUserPresence: vi.fn(),
      insertUserPresence: vi.fn(),
      getUserPresence: vi.fn(),
      markMessageIdsAsDelivered: vi.fn(),
      markMessageIdsAsRead: vi.fn(),
    },
    mockRealtimeService: {
      createChannel: vi.fn(),
      removeChannel: vi.fn(),
    },
  })
);

vi.mock('@/services/api/chat.service', () => ({
  chatService: mockChatService,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: mockRealtimeService,
}));

const currentUser: UserDetails = {
  id: 'user-a',
  name: 'Admin',
  email: 'admin@example.com',
  profilephoto: null,
  role: 'admin',
};

const targetUser = {
  id: 'user-b',
  name: 'Gudang',
  email: 'gudang@example.com',
  profilephoto: null,
};

const buildMockChannel = () => {
  const channel = {
    on: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };

  channel.on.mockReturnValue(channel);
  channel.subscribe.mockImplementation(
    (callback?: (status: string) => void) => {
      if (callback) {
        callback('SUBSCRIBED');
      }

      return channel;
    }
  );

  return channel;
};

describe('useChatSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createdChannels.length = 0;

    mockChatService.fetchMessagesBetweenUsers.mockResolvedValue({
      data: [],
      error: null,
    });
    mockChatService.updateUserPresence.mockResolvedValue({
      data: [
        {
          user_id: currentUser.id,
          is_online: true,
          current_chat_channel: 'channel-1',
          last_seen: '2026-03-06T09:30:00.000Z',
        },
      ],
      error: null,
    });
    mockChatService.insertUserPresence.mockResolvedValue({
      data: [],
      error: null,
    });
    mockChatService.getUserPresence.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockChatService.markMessageIdsAsDelivered.mockResolvedValue({
      data: [],
      error: null,
    });
    mockChatService.markMessageIdsAsRead.mockResolvedValue({
      data: [],
      error: null,
    });
    mockRealtimeService.removeChannel.mockResolvedValue(undefined);
    mockRealtimeService.createChannel.mockImplementation(() => {
      const channel = buildMockChannel();
      createdChannels.push(channel);
      return channel;
    });
  });

  it('keeps the user online when the sidebar closes', async () => {
    const initialMessageAnimationKeysRef = { current: new Set<string>() };
    const initialOpenJumpAnimationKeysRef = { current: new Set<string>() };

    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useChatSession({
          isOpen,
          user: currentUser,
          targetUser,
          currentChannelId: 'channel-1',
          initialMessageAnimationKeysRef,
          initialOpenJumpAnimationKeysRef,
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    await waitFor(() => {
      expect(mockChatService.updateUserPresence).toHaveBeenCalledWith(
        currentUser.id,
        expect.objectContaining({
          is_online: true,
          current_chat_channel: 'channel-1',
        })
      );
    });

    rerender({ isOpen: false });

    await waitFor(() => {
      expect(mockChatService.updateUserPresence).toHaveBeenLastCalledWith(
        currentUser.id,
        expect.objectContaining({
          is_online: true,
          current_chat_channel: null,
        })
      );
    });
  });

  it('marks the user offline on beforeunload while chat is still open', async () => {
    const initialMessageAnimationKeysRef = { current: new Set<string>() };
    const initialOpenJumpAnimationKeysRef = { current: new Set<string>() };

    renderHook(() =>
      useChatSession({
        isOpen: true,
        user: currentUser,
        targetUser,
        currentChannelId: 'channel-1',
        initialMessageAnimationKeysRef,
        initialOpenJumpAnimationKeysRef,
      })
    );

    await waitFor(() => {
      expect(mockChatService.updateUserPresence).toHaveBeenCalledWith(
        currentUser.id,
        expect.objectContaining({
          is_online: true,
          current_chat_channel: 'channel-1',
        })
      );
    });

    window.dispatchEvent(new Event('beforeunload'));

    await waitFor(() => {
      expect(mockChatService.updateUserPresence).toHaveBeenLastCalledWith(
        currentUser.id,
        expect.objectContaining({
          is_online: false,
          current_chat_channel: null,
        })
      );
    });
  });
});
