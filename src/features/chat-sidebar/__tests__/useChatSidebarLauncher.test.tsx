import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useChatSidebarLauncher } from "../hooks/useChatSidebarLauncher";
import { useChatSidebarStore } from "../../../store/chatSidebarStore";

const {
  useAuthStoreMock,
  fetchConversationMessagesMock,
  getFreshEntryMock,
  setConversationEntryMock,
} = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
  fetchConversationMessagesMock: vi.fn(),
  getFreshEntryMock: vi.fn(),
  setConversationEntryMock: vi.fn(),
}));

const mockDirectoryRoster = {
  displayOnlineUsers: [],
  onlineUserIds: new Set<string>(),
  reorderedOnlineUsers: [],
  portalOrderedUsers: [],
  isDirectoryLoading: false,
  directoryError: null,
  hasMoreDirectoryUsers: false,
  retryLoadDirectory: vi.fn(),
  loadMoreDirectoryUsers: vi.fn(),
};

vi.mock("../hooks/useChatDirectoryRoster", () => ({
  useChatDirectoryRoster: vi.fn(() => mockDirectoryRoster),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock("../data/chatSidebarGateway", () => ({
  chatSidebarMessagesGateway: {
    fetchConversationMessages: fetchConversationMessagesMock,
  },
}));

vi.mock("../utils/chatRuntimeCache", () => ({
  chatRuntimeCache: {
    conversation: {
      getFreshEntry: getFreshEntryMock,
      setEntry: setConversationEntryMock,
    },
  },
}));

describe("useChatSidebarLauncher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatSidebarStore.setState({
      isOpen: false,
      targetUser: undefined,
    });

    useAuthStoreMock.mockReturnValue({
      user: {
        id: "user-a",
        name: "Admin",
        email: "admin@example.com",
        profilephoto: null,
      },
    });

    getFreshEntryMock.mockReturnValue(null);
  });

  it("keeps the sidebar open when opening the same user twice", () => {
    const { result } = renderHook(() => useChatSidebarLauncher());
    const targetUser = {
      id: "user-b",
      name: "Gudang",
      email: "gudang@example.com",
      profilephoto: null,
    };

    act(() => {
      result.current.openChatForUser(targetUser);
    });

    expect(useChatSidebarStore.getState()).toMatchObject({
      isOpen: true,
      targetUser,
    });

    act(() => {
      result.current.openChatForUser(targetUser);
    });

    expect(useChatSidebarStore.getState()).toMatchObject({
      isOpen: true,
      targetUser,
    });
  });

  it("opens the contact list without selecting a conversation target", () => {
    const { result } = renderHook(() => useChatSidebarLauncher());

    act(() => {
      result.current.openContactList();
    });

    expect(useChatSidebarStore.getState()).toMatchObject({
      isOpen: true,
      targetUser: undefined,
    });
  });

  it("prefetches the target conversation into cache before the chat opens", async () => {
    fetchConversationMessagesMock.mockResolvedValue({
      data: {
        messages: [
          {
            id: "message-1",
            sender_id: "user-b",
            receiver_id: "user-a",
            message: "Halo",
            created_at: "2026-03-26T00:00:00.000Z",
          },
        ],
        hasMore: true,
      },
      error: null,
    });

    const { result } = renderHook(() => useChatSidebarLauncher());
    const targetUser = {
      id: "user-b",
      name: "Gudang",
      email: "gudang@example.com",
      profilephoto: null,
    };

    await act(async () => {
      await result.current.prefetchConversationForUser(targetUser);
    });

    expect(fetchConversationMessagesMock).toHaveBeenCalledWith("user-b", {
      limit: 50,
    });
    expect(setConversationEntryMock).toHaveBeenCalledWith(
      "dm_user-a_user-b",
      [
        expect.objectContaining({
          id: "message-1",
          sender_name: "Gudang",
          receiver_name: "Admin",
        }),
      ],
      true,
    );
  });
});
