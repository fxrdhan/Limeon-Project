import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import Navbar from './index';

const { useAuthStoreMock, useChatSidebarLauncherMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
  useChatSidebarLauncherMock: vi.fn(),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      children?: React.ReactNode;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
    span: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      animate?: unknown;
      children?: React.ReactNode;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <span {...props}>{children}</span>,
  },
  useIsPresent: () => true,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/features/chat-sidebar/hooks/useChatSidebarLauncher', () => ({
  useChatSidebarLauncher: useChatSidebarLauncherMock,
}));

vi.mock('./live-datetime', () => ({
  default: () => <div data-testid="navbar-live-datetime" />,
}));

vi.mock('@/components/profile', () => ({
  default: () => <div data-testid="navbar-profile" />,
}));

vi.mock('@/components/shared/avatar-stack', () => ({
  default: () => <div data-testid="navbar-avatar-stack" />,
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStoreMock.mockReturnValue({
      user: {
        id: 'user-a',
        name: 'Admin',
        email: 'admin@example.com',
        profilephoto: null,
      },
    });

    useChatSidebarLauncherMock.mockReturnValue({
      displayOnlineUsers: 1,
      onlineUserIds: new Set<string>(),
      reorderedOnlineUsers: [],
      portalOrderedUsers: [],
      isDirectoryLoading: false,
      directoryError: null,
      hasMoreDirectoryUsers: false,
      retryLoadDirectory: vi.fn(),
      loadMoreDirectoryUsers: vi.fn(),
      openChatForUser: vi.fn(),
      prefetchConversationForUser: vi.fn(),
    });
  });

  it('preloads the chat directory roster as soon as the navbar mounts', () => {
    render(<Navbar sidebarCollapsed={false} />);

    expect(useChatSidebarLauncherMock).toHaveBeenCalledWith(true);
  });
});
