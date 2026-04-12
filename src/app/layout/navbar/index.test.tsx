import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import Navbar from './index';

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('./online-users-control', () => ({
  default: () => <div data-testid="navbar-online-users-control" />,
}));

vi.mock('./live-datetime', () => ({
  default: () => <div data-testid="navbar-live-datetime" />,
}));

vi.mock('@/components/profile', () => ({
  default: () => <div data-testid="navbar-profile" />,
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
  });

  it('loads the online users control automatically after mount', async () => {
    const onOnlineUsersIntent = vi.fn();

    render(
      <Navbar
        sidebarCollapsed={false}
        onOnlineUsersIntent={onOnlineUsersIntent}
      />
    );

    expect(
      await screen.findByTestId('navbar-online-users-control')
    ).toBeTruthy();
    expect(onOnlineUsersIntent).toHaveBeenCalledTimes(1);
  });
});
