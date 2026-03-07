import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import type { UserDetails } from '../../../types/database';
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

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-b',
  receiver_id: overrides.receiver_id ?? currentUser.id,
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'hello',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name,
  file_kind: overrides.file_kind,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

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

  it('marks the user offline on pagehide while chat is still open', async () => {
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

    const pageHideEvent = new Event('pagehide');
    Object.defineProperty(pageHideEvent, 'persisted', {
      configurable: true,
      value: false,
    });

    window.dispatchEvent(pageHideEvent);

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

  it('clears stale target presence when switching to a user without presence data', async () => {
    const secondTargetUser = {
      id: 'user-c',
      name: 'Kasir',
      email: 'kasir@example.com',
      profilephoto: null,
    };
    const initialMessageAnimationKeysRef = { current: new Set<string>() };
    const initialOpenJumpAnimationKeysRef = { current: new Set<string>() };

    mockChatService.getUserPresence
      .mockResolvedValueOnce({
        data: {
          user_id: targetUser.id,
          is_online: true,
          last_seen: '2026-03-06T09:30:00.000Z',
          current_chat_channel: 'channel-1',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

    const { result, rerender } = renderHook(
      ({
        activeTargetUser,
        channelId,
      }: {
        activeTargetUser: typeof targetUser;
        channelId: string;
      }) =>
        useChatSession({
          isOpen: true,
          user: currentUser,
          targetUser: activeTargetUser,
          currentChannelId: channelId,
          initialMessageAnimationKeysRef,
          initialOpenJumpAnimationKeysRef,
        }),
      {
        initialProps: {
          activeTargetUser: targetUser,
          channelId: 'channel-1',
        },
      }
    );

    await waitFor(() => {
      expect(result.current.targetUserPresence?.user_id).toBe('user-b');
    });

    rerender({
      activeTargetUser: secondTargetUser,
      channelId: 'channel-2',
    });

    await waitFor(() => {
      expect(result.current.targetUserPresence).toBeNull();
    });
  });

  it('keeps user-scoped realtime channels stable while switching conversations', async () => {
    const secondTargetUser = {
      id: 'user-c',
      name: 'Kasir',
      email: 'kasir@example.com',
      profilephoto: null,
    };
    const initialMessageAnimationKeysRef = { current: new Set<string>() };
    const initialOpenJumpAnimationKeysRef = { current: new Set<string>() };

    const { rerender } = renderHook(
      ({
        activeTargetUser,
        channelId,
      }: {
        activeTargetUser: typeof targetUser;
        channelId: string;
      }) =>
        useChatSession({
          isOpen: true,
          user: currentUser,
          targetUser: activeTargetUser,
          currentChannelId: channelId,
          initialMessageAnimationKeysRef,
          initialOpenJumpAnimationKeysRef,
        }),
      {
        initialProps: {
          activeTargetUser: targetUser,
          channelId: 'channel-1',
        },
      }
    );

    await waitFor(() => {
      expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(3);
    });

    rerender({
      activeTargetUser: secondTargetUser,
      channelId: 'channel-2',
    });

    await waitFor(() => {
      expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(5);
    });

    expect(
      mockRealtimeService.createChannel.mock.calls.map(([name]) => name)
    ).toEqual([
      'chat_channel-1',
      'user_presence_changes',
      'global_presence_updates',
      'chat_channel-2',
      'user_presence_changes',
    ]);
  });

  it('ignores stale fetch results after switching to another conversation', async () => {
    let resolveFirstFetch:
      | ((value: { data: ChatMessage[]; error: null }) => void)
      | undefined;
    let resolveSecondFetch:
      | ((value: { data: ChatMessage[]; error: null }) => void)
      | undefined;

    mockChatService.fetchMessagesBetweenUsers
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirstFetch = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecondFetch = resolve;
          })
      );

    const secondTargetUser = {
      id: 'user-c',
      name: 'Kasir',
      email: 'kasir@example.com',
      profilephoto: null,
    };
    const initialMessageAnimationKeysRef = { current: new Set<string>() };
    const initialOpenJumpAnimationKeysRef = { current: new Set<string>() };

    const { result, rerender } = renderHook(
      ({
        activeTargetUser,
        channelId,
      }: {
        activeTargetUser: typeof targetUser;
        channelId: string;
      }) =>
        useChatSession({
          isOpen: true,
          user: currentUser,
          targetUser: activeTargetUser,
          currentChannelId: channelId,
          initialMessageAnimationKeysRef,
          initialOpenJumpAnimationKeysRef,
        }),
      {
        initialProps: {
          activeTargetUser: targetUser,
          channelId: 'channel-1',
        },
      }
    );

    rerender({
      activeTargetUser: secondTargetUser,
      channelId: 'channel-2',
    });

    resolveSecondFetch?.({
      data: [
        buildMessage({
          id: 'message-2',
          sender_id: secondTargetUser.id,
          channel_id: 'channel-2',
          message: 'pesan aktif',
        }),
      ],
      error: null,
    });

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toEqual(['message-2']);
      expect(result.current.messages[0]?.sender_name).toBe('Kasir');
    });

    resolveFirstFetch?.({
      data: [
        buildMessage({
          id: 'message-1',
          sender_id: targetUser.id,
          channel_id: 'channel-1',
          message: 'pesan stale',
        }),
      ],
      error: null,
    });

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toEqual(['message-2']);
      expect(result.current.messages[0]?.sender_name).toBe('Kasir');
    });
  });

  it('does not reuse the previous conversation as cache for a new pending channel', async () => {
    let resolveSecondFetch:
      | ((value: { data: ChatMessage[]; error: null }) => void)
      | undefined;
    let resolveThirdFetch:
      | ((value: { data: ChatMessage[]; error: null }) => void)
      | undefined;

    mockChatService.fetchMessagesBetweenUsers
      .mockResolvedValueOnce({
        data: [
          buildMessage({
            id: 'message-1',
            sender_id: targetUser.id,
            channel_id: 'channel-1',
            message: 'pesan channel pertama',
          }),
        ],
        error: null,
      })
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecondFetch = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveThirdFetch = resolve;
          })
      );

    const secondTargetUser = {
      id: 'user-c',
      name: 'Kasir',
      email: 'kasir@example.com',
      profilephoto: null,
    };
    const initialMessageAnimationKeysRef = { current: new Set<string>() };
    const initialOpenJumpAnimationKeysRef = { current: new Set<string>() };

    const { result, rerender } = renderHook(
      ({
        isOpen,
        activeTargetUser,
        channelId,
      }: {
        isOpen: boolean;
        activeTargetUser: typeof targetUser;
        channelId: string;
      }) =>
        useChatSession({
          isOpen,
          user: currentUser,
          targetUser: activeTargetUser,
          currentChannelId: channelId,
          initialMessageAnimationKeysRef,
          initialOpenJumpAnimationKeysRef,
        }),
      {
        initialProps: {
          isOpen: true,
          activeTargetUser: targetUser,
          channelId: 'channel-1',
        },
      }
    );

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toEqual(['message-1']);
    });

    rerender({
      isOpen: true,
      activeTargetUser: secondTargetUser,
      channelId: 'channel-2',
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([]);
    });

    rerender({
      isOpen: false,
      activeTargetUser: secondTargetUser,
      channelId: 'channel-2',
    });

    rerender({
      isOpen: true,
      activeTargetUser: secondTargetUser,
      channelId: 'channel-2',
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([]);
    });

    resolveSecondFetch?.({
      data: [],
      error: null,
    });
    resolveThirdFetch?.({
      data: [],
      error: null,
    });
  });

  it('hydrates incoming messages from postgres inserts when app broadcast is unavailable', async () => {
    const initialMessageAnimationKeysRef = { current: new Set<string>() };
    const initialOpenJumpAnimationKeysRef = { current: new Set<string>() };

    const { result } = renderHook(() =>
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
      expect(createdChannels[0]).toBeDefined();
    });

    const conversationChannel = createdChannels[0];
    const insertListenerCall = conversationChannel.on.mock.calls.find(
      ([type, config]) =>
        type === 'postgres_changes' && config?.event === 'INSERT'
    );

    expect(insertListenerCall).toBeDefined();
    const insertListener = insertListenerCall?.[2] as
      | ((payload: { new: ChatMessage }) => void)
      | undefined;

    act(() => {
      insertListener?.({
        new: buildMessage({
          id: 'message-inserted',
          sender_id: targetUser.id,
          receiver_id: currentUser.id,
          channel_id: 'channel-1',
          message: 'pesan fallback insert',
        }),
      });
    });

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toContain('message-inserted');
      expect(
        result.current.messages.find(
          messageItem => messageItem.id === 'message-inserted'
        )?.sender_name
      ).toBe('Gudang');
    });

    expect(mockChatService.markMessageIdsAsDelivered).not.toHaveBeenCalled();
  });
});
