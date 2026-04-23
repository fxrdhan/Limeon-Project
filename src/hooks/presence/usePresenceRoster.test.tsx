import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useAuthStore } from "../../store/authStore";
import type { DirectoryUser } from "../../store/createDirectoryStore";
import { usePresenceDirectoryStore } from "../../store/presenceDirectoryStore";
import { usePresenceStore } from "../../store/presenceStore";
import type { UserDetails } from "../../types/database";
import { usePresenceRoster } from "./usePresenceRoster";

const { mockUsersService } = vi.hoisted(() => ({
  mockUsersService: {
    getUsersPage: vi.fn(),
  },
}));

vi.mock("../../services/api/users.service", () => ({
  usersService: mockUsersService,
}));

const currentUser: UserDetails = {
  id: "user-a",
  name: "Admin",
  email: "admin@example.com",
  profilephoto: null,
  role: "admin",
};

const buildDirectoryUser = (id: string, name: string) => ({
  id,
  name,
  email: `${id}@example.com`,
  profilephoto: null,
});

describe("usePresenceRoster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: currentUser,
      loading: false,
      error: null,
    });
    usePresenceStore.setState({
      hasRosterChannel: false,
      onlineUsers: 1,
      onlineUsersList: [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          profilephoto: currentUser.profilephoto,
          online_at: "2026-03-24T10:00:00.000Z",
        },
      ],
      presenceSyncHealth: {
        status: "idle",
        errorMessage: null,
        lastSyncedAt: null,
      },
    });
    usePresenceDirectoryStore.getState().resetDirectoryState(null);
  });

  it("shares directory cache and pagination state across multiple consumers", async () => {
    mockUsersService.getUsersPage
      .mockResolvedValueOnce({
        data: {
          users: [buildDirectoryUser("user-b", "Gudang"), buildDirectoryUser("user-c", "Kasir")],
          hasMore: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [buildDirectoryUser("user-d", "Apoteker")],
          hasMore: false,
        },
        error: null,
      });

    const firstRoster = renderHook(() => usePresenceRoster(true));
    const secondRoster = renderHook(() => usePresenceRoster(true));

    await waitFor(() => {
      expect(mockUsersService.getUsersPage).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        firstRoster.result.current.portalOrderedUsers.map((user: DirectoryUser) => user.id),
      ).toEqual(["user-a", "user-b", "user-c"]);
    });

    expect(
      secondRoster.result.current.portalOrderedUsers.map((user: DirectoryUser) => user.id),
    ).toEqual(["user-a", "user-b", "user-c"]);

    await act(async () => {
      secondRoster.result.current.loadMoreDirectoryUsers();
    });

    await waitFor(() => {
      expect(mockUsersService.getUsersPage).toHaveBeenCalledTimes(2);
    });

    expect(mockUsersService.getUsersPage).toHaveBeenNthCalledWith(2, 30, 2);

    await waitFor(() => {
      expect(
        firstRoster.result.current.portalOrderedUsers.map((user: DirectoryUser) => user.id),
      ).toEqual(["user-a", "user-b", "user-c", "user-d"]);
    });

    expect(
      secondRoster.result.current.portalOrderedUsers.map((user: DirectoryUser) => user.id),
    ).toEqual(["user-a", "user-b", "user-c", "user-d"]);
  });
});
