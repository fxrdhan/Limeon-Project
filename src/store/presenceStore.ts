import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PresenceState } from '@/types';

export const usePresenceStore = create<PresenceState>((set) => ({
    channel: null,
    onlineUsers: 0,
    setChannel: (channel: RealtimeChannel | null) => set({ channel }),
    setOnlineUsers: (count: number) => set({ onlineUsers: count }),
}));
