import { RealtimeChannel } from '@supabase/supabase-js';

// Online user interface
export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  online_at: string;
}

// Presence types
export interface PresenceState {
  channel: RealtimeChannel | null;
  onlineUsers: number;
  onlineUsersList: OnlineUser[];
  setChannel: (channel: RealtimeChannel | null) => void;
  setOnlineUsers: (count: number) => void;
  setOnlineUsersList: (users: OnlineUser[]) => void;
}
