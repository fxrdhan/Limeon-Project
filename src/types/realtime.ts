import { RealtimeChannel } from "@supabase/supabase-js";

// Realtime and presence types
export interface PresenceState {
  channel: RealtimeChannel | null;
  onlineUsers: number;
  setChannel: (channel: RealtimeChannel | null) => void;
  setOnlineUsers: (count: number) => void;
}

export interface DeepDiffChange {
  type: "added" | "removed" | "modified";
  path: string[];
  value: unknown;
  oldValue: unknown;
}

export interface DetailedDiff {
  changes: DeepDiffChange[];
  formatted: string;
  summary: string;
}
