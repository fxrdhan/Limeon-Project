import { describe, it, expect } from 'vitest';
import { usePresenceStore } from './presenceStore';

describe('presenceStore', () => {
  it('clamps online users to non-negative', () => {
    usePresenceStore.getState().setOnlineUsers(-5);
    expect(usePresenceStore.getState().onlineUsers).toBe(0);
  });

  it('updates count when it changes', () => {
    usePresenceStore.setState({ onlineUsers: 0 });
    usePresenceStore.getState().setOnlineUsers(5);
    expect(usePresenceStore.getState().onlineUsers).toBe(5);
  });

  it('updates list and channel', () => {
    const channel = {} as never;
    usePresenceStore.getState().setChannel(channel);
    expect(usePresenceStore.getState().channel).toBe(channel);

    usePresenceStore.getState().setOnlineUsersList([{ id: '1' } as never]);
    expect(usePresenceStore.getState().onlineUsersList).toHaveLength(1);
  });

  it('does not update when count unchanged', () => {
    usePresenceStore.setState({ onlineUsers: 3 });
    usePresenceStore.getState().setOnlineUsers(3);
    expect(usePresenceStore.getState().onlineUsers).toBe(3);
  });
});
