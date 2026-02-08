import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from './usePresence';

const authState = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    name: string;
    email: string;
    profilephoto: string | null;
  },
}));

const presenceActions = vi.hoisted(() => ({
  setChannel: vi.fn(),
  setOnlineUsers: vi.fn(),
  setOnlineUsersList: vi.fn(),
}));

const getUsersByIdsMock = vi.hoisted(() => vi.fn());
const createChannelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => authState,
}));

vi.mock('@/store/presenceStore', () => ({
  usePresenceStore: () => presenceActions,
}));

vi.mock('@/services/api/users.service', () => ({
  usersService: {
    getUsersByIds: getUsersByIdsMock,
  },
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

type PresenceEvent = 'sync' | 'join' | 'leave';
type StatusEvent = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const advanceAndFlush = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await flushMicrotasks();
  });
};

const createMockChannel = (
  initialPresenceState: Record<string, unknown> = {}
) => {
  const presenceHandlers: Record<PresenceEvent, Array<() => unknown>> = {
    sync: [],
    join: [],
    leave: [],
  };
  let statusHandler: ((status: StatusEvent) => void | Promise<void>) | null =
    null;
  let presenceState = initialPresenceState;

  const channel: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    track: ReturnType<typeof vi.fn>;
    presenceState: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    __emitStatus: (status: StatusEvent) => Promise<void>;
    __emitPresence: (event: PresenceEvent) => Promise<void>;
    __setPresenceState: (state: Record<string, unknown>) => void;
  } = {
    on: vi.fn((_topic, payload: { event: PresenceEvent }, handler) => {
      presenceHandlers[payload.event].push(handler);
      return channel;
    }),
    subscribe: vi.fn(handler => {
      statusHandler = handler;
      return channel;
    }),
    track: vi.fn().mockResolvedValue(undefined),
    presenceState: vi.fn(() => presenceState),
    unsubscribe: vi.fn(),
    __emitStatus: async status => {
      await statusHandler?.(status);
    },
    __emitPresence: async event => {
      for (const handler of presenceHandlers[event]) {
        await handler();
      }
    },
    __setPresenceState: state => {
      presenceState = state;
    },
  };

  return channel;
};

describe('usePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    authState.user = null;
    presenceActions.setChannel.mockReset();
    presenceActions.setOnlineUsers.mockReset();
    presenceActions.setOnlineUsersList.mockReset();

    getUsersByIdsMock.mockReset();
    createChannelMock.mockReset();
    removeChannelMock.mockReset();

    removeChannelMock.mockResolvedValue(undefined);
    getUsersByIdsMock.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('cleans up presence state immediately when no authenticated user', async () => {
    renderHook(() => usePresence());
    await advanceAndFlush(0);

    expect(createChannelMock).not.toHaveBeenCalled();
    expect(presenceActions.setChannel).toHaveBeenCalledWith(null);
    expect(presenceActions.setOnlineUsers).toHaveBeenCalledWith(0);
    expect(presenceActions.setOnlineUsersList).toHaveBeenCalledWith([]);
  });

  it('subscribes and falls back to current user when presence state is empty', async () => {
    const channel = createMockChannel({});
    createChannelMock.mockReturnValue(channel);

    authState.user = {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@test.dev',
      profilephoto: null,
    };

    renderHook(() => usePresence());

    await advanceAndFlush(100);
    expect(createChannelMock).toHaveBeenCalledTimes(1);
    expect(presenceActions.setChannel).toHaveBeenCalledWith(channel);

    await act(async () => {
      await channel.__emitStatus('SUBSCRIBED');
      await flushMicrotasks();
    });

    expect(channel.track).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1' })
    );

    await advanceAndFlush(100);

    expect(presenceActions.setOnlineUsers).toHaveBeenCalledWith(1);
    expect(presenceActions.setOnlineUsersList).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@test.dev',
      }),
    ]);
  });

  it('updates online users from presence sync/join/leave events', async () => {
    const channel = createMockChannel({
      a: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
      b: [{ user_id: 'user-2' }],
    });
    createChannelMock.mockReturnValue(channel);
    getUsersByIdsMock.mockResolvedValue({
      data: [
        { id: 'user-1', name: 'Alice', email: 'alice@test.dev' },
        { id: 'user-2', name: 'Bob', email: 'bob@test.dev' },
      ],
      error: null,
    });

    authState.user = {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@test.dev',
      profilephoto: null,
    };

    renderHook(() => usePresence());
    await advanceAndFlush(100);

    await act(async () => {
      await channel.__emitStatus('SUBSCRIBED');
      await flushMicrotasks();
    });
    await advanceAndFlush(100);

    await act(async () => {
      await channel.__emitPresence('sync');
      await channel.__emitPresence('join');
      await channel.__emitPresence('leave');
      await flushMicrotasks();
    });

    expect(getUsersByIdsMock).toHaveBeenCalledWith(
      expect.arrayContaining(['user-1', 'user-2'])
    );
    expect(presenceActions.setOnlineUsers).toHaveBeenCalledWith(2);
    expect(presenceActions.setOnlineUsersList).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'user-1' }),
        expect.objectContaining({ id: 'user-2' }),
      ])
    );
  });

  it('handles status errors, visibility retrack, and beforeunload unsubscribe', async () => {
    const channel = createMockChannel({});
    createChannelMock.mockReturnValue(channel);

    authState.user = {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@test.dev',
      profilephoto: null,
    };

    renderHook(() => usePresence());
    await advanceAndFlush(100);

    await act(async () => {
      await channel.__emitStatus('SUBSCRIBED');
      await flushMicrotasks();
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('beforeunload'));
    });

    await act(async () => {
      await channel.__emitStatus('CHANNEL_ERROR');
      await channel.__emitStatus('TIMED_OUT');
      await channel.__emitStatus('CLOSED');
      await flushMicrotasks();
    });

    expect(channel.track).toHaveBeenCalled();
    expect(channel.unsubscribe).toHaveBeenCalled();
    expect(presenceActions.setOnlineUsers).toHaveBeenCalledWith(1);
  });

  it('cleans up channel on unmount and removes it from realtime service', async () => {
    const channel = createMockChannel({});
    createChannelMock.mockReturnValue(channel);

    authState.user = {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@test.dev',
      profilephoto: null,
    };

    const { unmount } = renderHook(() => usePresence());
    await advanceAndFlush(100);

    await act(async () => {
      await channel.__emitStatus('SUBSCRIBED');
      await flushMicrotasks();
    });

    unmount();

    await advanceAndFlush(0);
    await advanceAndFlush(100);

    expect(removeChannelMock).toHaveBeenCalledWith(channel);
    expect(presenceActions.setChannel).toHaveBeenCalledWith(null);
    expect(presenceActions.setOnlineUsers).toHaveBeenCalledWith(0);
    expect(presenceActions.setOnlineUsersList).toHaveBeenCalledWith([]);
  });
});
