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
  allUsersList: OnlineUser[];
  portalImageUrls: Record<string, string>;
  setChannel: (channel: RealtimeChannel | null) => void;
  setOnlineUsers: (count: number) => void;
  setOnlineUsersList: (users: OnlineUser[]) => void;
  setAllUsersList: (users: OnlineUser[]) => void;
  setPortalImageUrls: (urls: Record<string, string>) => void;
}
