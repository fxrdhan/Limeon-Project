import { fireEvent, render, screen } from '@testing-library/react';
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

  it('loads the online users control after interaction', async () => {
    render(<Navbar sidebarCollapsed={false} />);

    expect(screen.queryByTestId('navbar-online-users-control')).toBeNull();

    fireEvent.click(screen.getByLabelText('Muat daftar pengguna online'));

    expect(
      await screen.findByTestId('navbar-online-users-control')
    ).toBeTruthy();
  });
});
