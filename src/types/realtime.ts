import { RealtimeChannel } from "@supabase/supabase-js";

// Presence types
export interface PresenceState {
  channel: RealtimeChannel | null;
  onlineUsers: number;
  setChannel: (channel: RealtimeChannel | null) => void;
  setOnlineUsers: (count: number) => void;
}
