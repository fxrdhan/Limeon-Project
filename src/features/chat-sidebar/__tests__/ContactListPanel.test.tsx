import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import ContactListPanel from "../components/ContactListPanel";

const {
  openChatForUserMock,
  prefetchConversationForUserMock,
  useAuthStoreMock,
  useChatSidebarLauncherMock,
} = vi.hoisted(() => ({
  openChatForUserMock: vi.fn(),
  prefetchConversationForUserMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  useChatSidebarLauncherMock: vi.fn(),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock("../hooks/useChatSidebarLauncher", () => ({
  useChatSidebarLauncher: useChatSidebarLauncherMock,
}));

const currentUser = {
  id: "user-a",
  name: "Admin",
  email: "admin@example.com",
  profilephoto: null,
  profilephoto_thumb: null,
};

describe("ContactListPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStoreMock.mockReturnValue({ user: currentUser });
    useChatSidebarLauncherMock.mockReturnValue({
      onlineUserIds: new Set<string>(["user-a"]),
      portalOrderedUsers: [currentUser],
      isDirectoryLoading: false,
      directoryError: null,
      hasMoreDirectoryUsers: false,
      retryLoadDirectory: vi.fn(),
      loadMoreDirectoryUsers: vi.fn(),
      openChatForUser: openChatForUserMock,
      prefetchConversationForUser: prefetchConversationForUserMock,
    });
  });

  it("allows opening the current user as a self chat contact", () => {
    render(<ContactListPanel onClose={vi.fn()} />);

    const currentUserContact = screen.getByRole("button", {
      name: /admin/i,
    }) as HTMLButtonElement;

    expect(currentUserContact.disabled).toBe(false);

    fireEvent.mouseEnter(currentUserContact);
    fireEvent.click(currentUserContact);

    expect(prefetchConversationForUserMock).toHaveBeenCalledWith(currentUser);
    expect(openChatForUserMock).toHaveBeenCalledWith(currentUser);
  });
});
