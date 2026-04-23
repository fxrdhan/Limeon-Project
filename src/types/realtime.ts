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
  status: "degraded" | "healthy" | "idle";
  errorMessage: string | null;
  lastSyncedAt: string | null;
}

// Presence types
export interface PresenceState {
  hasRosterChannel: boolean;
  onlineUsers: number;
  onlineUsersList: OnlineUser[];
  presenceSyncHealth: PresenceSyncHealth;
  setHasRosterChannel: (hasRosterChannel: boolean) => void;
  setOnlineUsers: (count: number) => void;
  setOnlineUsersList: (users: OnlineUser[]) => void;
  setPresenceSyncHealth: (health: PresenceSyncHealth) => void;
}
