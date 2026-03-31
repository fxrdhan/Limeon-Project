import { RealtimeChannel } from '@supabase/supabase-js';

// Online user interface
export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  profilephoto_thumb?: string | null;
  online_at: string;
}

export interface PresenceSyncHealth {
  status: 'degraded' | 'healthy' | 'idle';
  errorMessage: string | null;
  lastSyncedAt: string | null;
}

// Presence types
export interface PresenceState {
  channel: RealtimeChannel | null;
  onlineUsers: number;
  onlineUsersList: OnlineUser[];
  presenceSyncHealth: PresenceSyncHealth;
  setChannel: (channel: RealtimeChannel | null) => void;
  setOnlineUsers: (count: number) => void;
  setOnlineUsersList: (users: OnlineUser[]) => void;
  setPresenceSyncHealth: (health: PresenceSyncHealth) => void;
}
