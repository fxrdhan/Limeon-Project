import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PresenceState } from '@/types';

export const usePresenceStore = create<PresenceState>((set, get) => ({
  channel: null,
  onlineUsers: 0,
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
}));
