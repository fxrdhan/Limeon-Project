import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './index';

const useAuthStoreMock = vi.hoisted(() => vi.fn());
const usePresenceStoreMock = vi.hoisted(() => vi.fn());
const setCachedImageMock = vi.hoisted(() => vi.fn());
const getCachedImageBlobUrlMock = vi.hoisted(() => vi.fn());
const cacheImageBlobMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/store/presenceStore', () => ({
  usePresenceStore: usePresenceStoreMock,
}));

vi.mock('@/utils/imageCache', () => ({
  setCachedImage: setCachedImageMock,
  getCachedImageBlobUrl: getCachedImageBlobUrlMock,
  cacheImageBlob: cacheImageBlobMock,
}));

vi.mock('./live-datetime', () => ({
  default: () => <div data-testid="datetime">datetime</div>,
}));

vi.mock('@/components/profile', () => ({
  default: () => <div data-testid="profile">profile</div>,
}));

vi.mock('@/components/shared/avatar-stack', () => ({
  default: ({
    users,
    showPortal,
  }: {
    users: Array<{ id: string }>;
    showPortal: boolean;
  }) => (
    <div data-testid="avatar-stack">
      {users.length}:{String(showPortal)}
    </div>
  ),
}));

const currentUser = {
  id: 'u-1',
  name: 'Current User',
  email: 'current@example.com',
  profilephoto: 'https://images/current.jpg',
};

const onlineUsersList = [
  currentUser,
  {
    id: 'u-2',
    name: 'Second User',
    email: 'second@example.com',
    profilephoto: 'https://images/second.jpg',
  },
  {
    id: 'u-3',
    name: 'Third User',
    email: 'third@example.com',
    profilephoto: '/local-avatar.png',
  },
];

describe('Navbar', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
    usePresenceStoreMock.mockReset();
    setCachedImageMock.mockReset();
    getCachedImageBlobUrlMock.mockReset();
    cacheImageBlobMock.mockReset();

    useAuthStoreMock.mockReturnValue({ user: currentUser });
    usePresenceStoreMock.mockReturnValue({
      onlineUsers: 3,
      onlineUsersList,
    });

    getCachedImageBlobUrlMock.mockResolvedValue(null);
    cacheImageBlobMock.mockResolvedValue('blob:https://cached-photo');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders collapsed title, portal users, and emits chat target', async () => {
    const onChatUserSelect = vi.fn();

    render(
      <Navbar
        onChatUserSelect={onChatUserSelect}
        showChatSidebar={false}
        sidebarCollapsed={true}
      />
    );

    expect(screen.getByText('Pharma')).toBeInTheDocument();
    expect(screen.getByText('Sys')).toBeInTheDocument();
    expect(screen.getByTestId('datetime')).toBeInTheDocument();
    expect(screen.getByTestId('profile')).toBeInTheDocument();
    expect(screen.getByText('3 Online')).toBeInTheDocument();

    await waitFor(() => {
      expect(setCachedImageMock).toHaveBeenCalledWith(
        'profile:u-1',
        'https://images/current.jpg'
      );
      expect(cacheImageBlobMock).toHaveBeenCalled();
    });

    const hoverRegion = screen.getByText('3 Online').closest('div');
    expect(hoverRegion).toBeTruthy();
    fireEvent.mouseEnter(hoverRegion!);

    expect(await screen.findByText('Second User')).toBeInTheDocument();
    expect(screen.getByText('Third User')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Second User'));
    expect(onChatUserSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u-2' })
    );

    fireEvent.mouseEnter(screen.getByText('Second User'));
    expect(
      screen.getByTitle('Click to chat with this user')
    ).toBeInTheDocument();
  }, 10000);

  it('keeps portal open while chat sidebar is open', async () => {
    render(
      <Navbar
        onChatUserSelect={vi.fn()}
        showChatSidebar={true}
        sidebarCollapsed={false}
      />
    );

    expect(screen.getByText('cy')).toBeInTheDocument();
    expect(screen.getByText('Management System')).toBeInTheDocument();

    const hoverRegion = screen.getByText('3 Online').closest('div');
    expect(hoverRegion).toBeTruthy();
    fireEvent.mouseEnter(hoverRegion!);
    expect(await screen.findByText('Second User')).toBeInTheDocument();

    fireEvent.mouseLeave(hoverRegion!);
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(screen.getByText('Second User')).toBeInTheDocument();
  });

  it('uses minimum online count, closes portal on leave, and clears timers on unmount', () => {
    vi.useFakeTimers();
    usePresenceStoreMock.mockReturnValue({
      onlineUsers: 0,
      onlineUsersList,
    });

    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(
      <Navbar
        onChatUserSelect={vi.fn()}
        showChatSidebar={false}
        sidebarCollapsed={false}
      />
    );

    expect(screen.getByText('1 Online')).toBeInTheDocument();

    const hoverRegion = screen.getByText('1 Online').closest('div');
    expect(hoverRegion).toBeTruthy();

    fireEvent.mouseEnter(hoverRegion!);
    act(() => {
      vi.advanceTimersByTime(210);
    });
    expect(screen.getByText('Second User')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-stack')).toHaveTextContent('3:true');

    fireEvent.mouseLeave(hoverRegion!);
    act(() => {
      vi.advanceTimersByTime(110);
    });
    expect(screen.getByTestId('avatar-stack')).toHaveTextContent('3:false');

    fireEvent.mouseEnter(hoverRegion!);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('renders fallback initials for users without photo and avoids chat callback for current user', () => {
    vi.useFakeTimers();

    useAuthStoreMock.mockReturnValue({ user: currentUser });
    usePresenceStoreMock.mockReturnValue({
      onlineUsers: 2,
      onlineUsersList: [
        {
          id: 'u-4',
          name: 'No Photo',
          email: 'no-photo@example.com',
          profilephoto: '',
        },
        currentUser,
      ],
    });
    getCachedImageBlobUrlMock.mockResolvedValue('blob:https://cached-current');

    const onChatUserSelect = vi.fn();

    render(
      <Navbar
        onChatUserSelect={onChatUserSelect}
        showChatSidebar={false}
        sidebarCollapsed={true}
      />
    );

    const hoverRegion = screen.getByText('2 Online').closest('div');
    expect(hoverRegion).toBeTruthy();
    fireEvent.mouseEnter(hoverRegion!);
    act(() => {
      vi.advanceTimersByTime(210);
    });

    expect(screen.getByText('No Photo')).toBeInTheDocument();
    expect(screen.getByText('NP')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Current User'));
    expect(onChatUserSelect).not.toHaveBeenCalled();
  });

  it('supports presence list when user is logged out', () => {
    useAuthStoreMock.mockReturnValue({ user: null });
    usePresenceStoreMock.mockReturnValue({
      onlineUsers: 0,
      onlineUsersList: [onlineUsersList[1]],
    });

    render(
      <Navbar
        onChatUserSelect={vi.fn()}
        showChatSidebar={false}
        sidebarCollapsed={true}
      />
    );

    expect(screen.getByText('0 Online')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-stack')).toHaveTextContent('1:false');
  });
});
