import { act, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { usePresenceStore } from '../../../store/presenceStore';
import { useChatSessionPresence } from './useChatSessionPresence';
import type { UserDetails } from '../../../types/database';
import type { ChatSidebarPanelTargetUser } from '../types';
import type { UserPresence } from '../data/chatSidebarGateway';

const { loadTargetPresenceSnapshotMock } = vi.hoisted(() => ({
  loadTargetPresenceSnapshotMock: vi.fn(),
}));

vi.mock('../utils/target-presence', () => ({
  loadTargetPresenceSnapshot: loadTargetPresenceSnapshotMock,
}));

const currentUser: UserDetails = {
  email: 'current@example.com',
  id: 'user-a',
  name: 'Current User',
  profilephoto: null,
  role: 'staff',
};

const targetUser: ChatSidebarPanelTargetUser = {
  email: 'target@example.com',
  id: 'user-b',
  name: 'Target User',
  profilephoto: null,
};

const createDeferredPresenceSnapshot = () => {
  let resolvePresence:
    | ((value: { presence: UserPresence; errorMessage: null }) => void)
    | null = null;
  const promise = new Promise<{ presence: UserPresence; errorMessage: null }>(
    resolve => {
      resolvePresence = resolve;
    }
  );

  return {
    promise,
    resolvePresence: (presence: UserPresence) => {
      resolvePresence?.({ errorMessage: null, presence });
    },
  };
};

describe('useChatSessionPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePresenceStore.setState({
      hasRosterChannel: false,
      onlineUsers: 0,
      onlineUsersList: [],
      presenceSyncHealth: {
        errorMessage: null,
        lastSyncedAt: null,
        status: 'idle',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores a pending presence snapshot after the chat panel closes', async () => {
    const deferredPresence = createDeferredPresenceSnapshot();
    loadTargetPresenceSnapshotMock.mockReturnValue(deferredPresence.promise);

    const { result, rerender } = renderHook(
      ({ isOpen }) =>
        useChatSessionPresence({
          currentChannelId: 'channel-1',
          isOpen,
          targetUser,
          user: currentUser,
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    await waitFor(() => {
      expect(loadTargetPresenceSnapshotMock).toHaveBeenCalledWith(
        'user-b',
        'Error loading target user presence'
      );
    });

    rerender({ isOpen: false });

    expect(result.current.targetUserPresence).toBeNull();

    await act(async () => {
      deferredPresence.resolvePresence({
        is_online: true,
        last_seen: '2026-06-17T00:00:00.000Z',
        updated_at: '2026-06-17T00:00:00.000Z',
        user_id: 'user-b',
      });
      await deferredPresence.promise;
    });

    expect(result.current.targetUserPresence).toBeNull();
    expect(result.current.isTargetOnline).toBe(false);
  });
});
