import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { usePresence } from "./usePresence";
import { usePresenceStore } from "../../store/presenceStore";

const { mockAuthState, mockChatService, mockRealtimeService } = vi.hoisted(() => ({
  mockAuthState: {
    user: {
      id: "user-a",
      name: "Admin",
      email: "admin@example.com",
      profilephoto: "https://example.com/admin.png",
    },
    session: {
      access_token: "presence-access-token",
    },
  },
  mockChatService: {
    syncUserPresenceOnlineState: vi.fn(),
    syncUserPresenceOnPageExit: vi.fn(),
  },
  mockRealtimeService: {
    replaceChannel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: () => mockAuthState,
}));

vi.mock("@/services/api/chat.service", () => ({
  chatPresenceService: mockChatService,
}));

vi.mock("@/services/realtime/realtime.service", () => ({
  realtimeService: mockRealtimeService,
}));

const flushPresenceEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("usePresence", () => {
  let presenceStateByKey: Record<
    string,
    Array<{
      user_id: string;
      name: string;
      email: string;
      profilephoto: string | null;
      online_at: string;
      presence_ref: string;
    }>
  >;
  let presenceSyncHandler: (() => void) | null;
  let rosterChannelStatusHandler: ((status: string) => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();
    presenceSyncHandler = null;
    rosterChannelStatusHandler = null;

    usePresenceStore.setState({
      hasRosterChannel: false,
      onlineUsers: 0,
      onlineUsersList: [],
      presenceSyncHealth: {
        status: "idle",
        errorMessage: null,
        lastSyncedAt: null,
      },
    });

    presenceStateByKey = {
      "user-b": [
        {
          user_id: "user-b",
          name: "Gudang",
          email: "gudang@example.com",
          profilephoto: "https://example.com/gudang.png",
          online_at: "2099-03-09T09:00:05.000Z",
          presence_ref: "presence-b",
        },
      ],
    };

    mockAuthState.user = {
      id: "user-a",
      name: "Admin",
      email: "admin@example.com",
      profilephoto: "https://example.com/admin.png",
    };
    mockAuthState.session = {
      access_token: "presence-access-token",
    };

    mockChatService.syncUserPresenceOnlineState.mockResolvedValue({
      ok: true,
      errorMessage: null,
    });
    mockChatService.syncUserPresenceOnPageExit.mockReturnValue(true);

    const mockChannel = {
      on: vi.fn(),
      presenceState: vi.fn(() => presenceStateByKey),
      subscribe: vi.fn(),
      track: vi.fn(),
      untrack: vi.fn(),
      unsubscribe: vi.fn(),
    };

    mockChannel.on.mockImplementation(
      (eventType: string, filter: Record<string, string>, callback: () => void) => {
        if (eventType === "presence" && filter.event === "sync") {
          presenceSyncHandler = callback;
        }

        return mockChannel;
      },
    );

    mockChannel.track.mockImplementation(async (payload) => {
      presenceStateByKey[payload.user_id] = [
        {
          ...payload,
          presence_ref: "presence-a",
        },
      ];
      presenceSyncHandler?.();
      return "ok";
    });

    mockChannel.subscribe.mockImplementation((callback?: (status: string) => void) => {
      rosterChannelStatusHandler = callback ?? null;
      callback?.("SUBSCRIBED");
      return mockChannel;
    });
    mockRealtimeService.replaceChannel.mockResolvedValue(mockChannel);
    mockRealtimeService.removeChannel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrates the navbar roster from browser-active presence state", async () => {
    presenceStateByKey = {};

    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(mockRealtimeService.replaceChannel).toHaveBeenCalledWith("browser-active:user-a", {
      config: {
        presence: {
          key: "user-a",
        },
      },
    });
    expect(usePresenceStore.getState().onlineUsers).toBe(1);
    expect(usePresenceStore.getState().onlineUsersList).toEqual([
      {
        id: "user-a",
        name: "Admin",
        email: "admin@example.com",
        profilephoto: "https://example.com/admin.png",
        profilephoto_thumb: null,
        online_at: expect.any(String),
      },
    ]);

    unmount();
  });

  it("sends presence writes through the high-level online sync path", async () => {
    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(mockChatService.syncUserPresenceOnlineState).toHaveBeenCalledWith("user-a", true);

    unmount();
  });

  it("sends an offline keepalive when the browser unloads", async () => {
    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    await act(async () => {
      window.dispatchEvent(new Event("unload"));
      await Promise.resolve();
    });

    expect(mockChatService.syncUserPresenceOnPageExit).toHaveBeenCalledWith(
      "user-a",
      "presence-access-token",
      expect.any(String),
    );

    unmount();
  });

  it("does not mark the user offline when the document becomes hidden", async () => {
    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(mockChatService.syncUserPresenceOnPageExit).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    unmount();
  });

  it("keeps heartbeats running while the document stays hidden", async () => {
    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    mockChatService.syncUserPresenceOnlineState.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
    });

    expect(mockChatService.syncUserPresenceOnlineState).toHaveBeenCalledWith("user-a", true);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    unmount();
  });

  it("stores degraded sync health when presence writes fail", async () => {
    mockChatService.syncUserPresenceOnlineState.mockResolvedValue({
      ok: false,
      errorMessage: "Gagal menyinkronkan status online ke server.",
    });

    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(usePresenceStore.getState().presenceSyncHealth).toEqual({
      status: "degraded",
      errorMessage: "Gagal menyinkronkan status online ke server.",
      lastSyncedAt: null,
    });

    unmount();
  });

  it("reconnects the roster channel after a channel error", async () => {
    presenceStateByKey = {};

    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(usePresenceStore.getState().onlineUsers).toBe(1);
    expect(usePresenceStore.getState().onlineUsersList).toHaveLength(1);

    expect(mockRealtimeService.replaceChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      rosterChannelStatusHandler?.("CHANNEL_ERROR");
      await Promise.resolve();
    });

    expect(usePresenceStore.getState().onlineUsers).toBe(0);
    expect(usePresenceStore.getState().onlineUsersList).toEqual([]);

    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRealtimeService.replaceChannel).toHaveBeenCalledTimes(2);
    expect(mockRealtimeService.replaceChannel).toHaveBeenLastCalledWith("browser-active:user-a", {
      config: {
        presence: {
          key: "user-a",
        },
      },
    });

    unmount();
  });

  it("ignores stale roster setup work when a newer subscription already owns the channel", async () => {
    let resolveFirstReplace:
      | ((channel: {
          on: ReturnType<typeof vi.fn>;
          presenceState: ReturnType<typeof vi.fn>;
          subscribe: ReturnType<typeof vi.fn>;
          track: ReturnType<typeof vi.fn>;
          untrack: ReturnType<typeof vi.fn>;
          unsubscribe: ReturnType<typeof vi.fn>;
        }) => void)
      | null = null;
    const firstReplacePromise = new Promise<{
      on: ReturnType<typeof vi.fn>;
      presenceState: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
      track: ReturnType<typeof vi.fn>;
      untrack: ReturnType<typeof vi.fn>;
      unsubscribe: ReturnType<typeof vi.fn>;
    }>((resolve) => {
      resolveFirstReplace = resolve;
    });
    let hasSubscribed = false;

    const sharedChannel = {
      on: vi.fn(),
      presenceState: vi.fn(() => presenceStateByKey),
      subscribe: vi.fn(),
      track: vi.fn(),
      untrack: vi.fn(),
      unsubscribe: vi.fn(),
    };

    sharedChannel.on.mockImplementation(
      (eventType: string, filter: Record<string, string>, callback: () => void) => {
        if (hasSubscribed) {
          throw new Error(
            "cannot add `presence` callbacks for realtime:browser-active after `subscribe()`.",
          );
        }

        if (eventType === "presence" && filter.event === "sync") {
          presenceSyncHandler = callback;
        }

        return sharedChannel;
      },
    );

    sharedChannel.track.mockImplementation(async (payload) => {
      presenceStateByKey[payload.user_id] = [
        {
          ...payload,
          presence_ref: "presence-a",
        },
      ];
      presenceSyncHandler?.();
      return "ok";
    });

    sharedChannel.subscribe.mockImplementation((callback?: (status: string) => void) => {
      hasSubscribed = true;
      rosterChannelStatusHandler = callback ?? null;
      callback?.("SUBSCRIBED");
      return sharedChannel;
    });

    mockRealtimeService.replaceChannel
      .mockReset()
      .mockImplementationOnce(() => firstReplacePromise)
      .mockResolvedValueOnce(sharedChannel);

    const { rerender, unmount } = renderHook(() => usePresence());

    await act(async () => {
      await Promise.resolve();
    });

    mockAuthState.user = {
      ...mockAuthState.user,
      name: "Admin Updated",
    };

    rerender();
    await flushPresenceEffects();

    expect(sharedChannel.subscribe).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstReplace?.(sharedChannel);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sharedChannel.on).toHaveBeenCalledTimes(3);
    expect(sharedChannel.subscribe).toHaveBeenCalledTimes(1);
    expect(usePresenceStore.getState().onlineUsers).toBe(2);

    unmount();
  });

  it("reconnects the roster channel when presence tracking fails after subscribe", async () => {
    const buildTrackChannel = (trackStatus: "ok" | "error") => {
      const channel = {
        on: vi.fn(),
        presenceState: vi.fn(() => presenceStateByKey),
        subscribe: vi.fn(),
        track: vi.fn(),
        untrack: vi.fn(),
        unsubscribe: vi.fn(),
      };

      channel.on.mockImplementation(
        (eventType: string, filter: Record<string, string>, callback: () => void) => {
          if (eventType === "presence" && filter.event === "sync") {
            presenceSyncHandler = callback;
          }

          return channel;
        },
      );

      channel.track.mockImplementation(async (payload) => {
        if (trackStatus === "ok") {
          presenceStateByKey[payload.user_id] = [
            {
              ...payload,
              presence_ref: "presence-a",
            },
          ];
          presenceSyncHandler?.();
        }

        return trackStatus;
      });

      channel.subscribe.mockImplementation((callback?: (status: string) => void) => {
        rosterChannelStatusHandler = callback ?? null;
        callback?.("SUBSCRIBED");
        return channel;
      });

      return channel;
    };

    mockRealtimeService.replaceChannel
      .mockReset()
      .mockResolvedValueOnce(buildTrackChannel("error"))
      .mockResolvedValueOnce(buildTrackChannel("ok"));

    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(mockRealtimeService.removeChannel).toHaveBeenCalledTimes(1);
    expect(usePresenceStore.getState().hasRosterChannel).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRealtimeService.replaceChannel).toHaveBeenCalledTimes(2);
    expect(usePresenceStore.getState().onlineUsers).toBe(2);

    unmount();
  });
});
