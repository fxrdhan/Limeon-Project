import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PresenceState, OnlineUser } from '@/types';

export const usePresenceStore = create<PresenceState>((set, get) => ({
  channel: null,
  onlineUsers: 0,
  onlineUsersList: [],
  setChannel: (channel: RealtimeChannel | null) => {
    set({ channel });
  },
  setOnlineUsers: (count: number) => {
    // Validate count and ensure it's never negative
    const validCount = Math.max(0, count);
    const currentCount = get().onlineUsers;

    // Only update if the count actually changed
    if (currentCount !== validCount) {
      set({ onlineUsers: validCount });
    }
  },
  setOnlineUsersList: (users: OnlineUser[]) => {
    set({ onlineUsersList: users });
  },
}));
