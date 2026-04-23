import { create } from "zustand";
import type { PresenceState, OnlineUser } from "@/types";

export const usePresenceStore = create<PresenceState>((set, get) => ({
  hasRosterChannel: false,
  onlineUsers: 0,
  onlineUsersList: [],
  presenceSyncHealth: {
    status: "idle",
    errorMessage: null,
    lastSyncedAt: null,
  },
  setHasRosterChannel: (hasRosterChannel: boolean) => {
    if (get().hasRosterChannel === hasRosterChannel) {
      return;
    }

    set({ hasRosterChannel });
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
  setPresenceSyncHealth: (health) => {
    const currentHealth = get().presenceSyncHealth;

    if (
      currentHealth.status === health.status &&
      currentHealth.errorMessage === health.errorMessage &&
      currentHealth.lastSyncedAt === health.lastSyncedAt
    ) {
      return;
    }

    set({ presenceSyncHealth: health });
  },
}));
