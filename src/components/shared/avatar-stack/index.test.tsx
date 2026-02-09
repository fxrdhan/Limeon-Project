import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarStack from './index';

const useAuthStoreMock = vi.hoisted(() => vi.fn());
const setCachedImageMock = vi.hoisted(() => vi.fn());
const getCachedImageBlobUrlMock = vi.hoisted(() => vi.fn());
const cacheImageBlobMock = vi.hoisted(() => vi.fn());

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/utils/imageCache', () => ({
  setCachedImage: setCachedImageMock,
  getCachedImageBlobUrl: getCachedImageBlobUrlMock,
  cacheImageBlob: cacheImageBlobMock,
}));

const users = [
  {
    id: 'u-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    profilephoto: null,
    online_at: '2026-01-01',
  },
  {
    id: 'u-2',
    name: 'Bob Stone',
    email: 'bob@example.com',
    profilephoto: null,
    online_at: '2026-01-01',
  },
  {
    id: 'u-3',
    name: 'Cara Lane',
    email: 'cara@example.com',
    profilephoto: null,
    online_at: '2026-01-01',
  },
  {
    id: 'u-4',
    name: 'Dan West',
    email: 'dan@example.com',
    profilephoto: null,
    online_at: '2026-01-01',
  },
];

describe('AvatarStack', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
    setCachedImageMock.mockReset();
    getCachedImageBlobUrlMock.mockReset();
    cacheImageBlobMock.mockReset();
    useAuthStoreMock.mockReturnValue({ user: { id: 'u-2' } });
    getCachedImageBlobUrlMock.mockResolvedValue(null);
    cacheImageBlobMock.mockResolvedValue(null);
  });

  it('reorders current user to the end and shows overflow count', () => {
    render(<AvatarStack users={users} maxVisible={3} />);

    const avatarTitles = screen
      .getAllByTitle(/Online/)
      .map(node => node.getAttribute('title'));

    expect(avatarTitles).toEqual([
      'Alice Smith - Online',
      'Cara Lane - Online',
      'Dan West - Online',
    ]);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('uses cached/http image flow and local image flow', async () => {
    getCachedImageBlobUrlMock.mockResolvedValueOnce('blob:cached-img');

    const httpUser = [
      {
        ...users[0],
        profilephoto: 'https://cdn.example/avatar-alice.jpg',
      },
    ];
    const { rerender } = render(
      <AvatarStack users={httpUser} maxVisible={1} />
    );

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:cached-img');
    });
    expect(setCachedImageMock).toHaveBeenCalledWith(
      'profile:u-1',
      'https://cdn.example/avatar-alice.jpg'
    );

    rerender(
      <AvatarStack
        users={[{ ...users[1], profilephoto: 'blob:local-preview' }]}
        maxVisible={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'blob:local-preview'
      );
    });
  });

  it('falls back to cached fetch and applies portal blur state', async () => {
    getCachedImageBlobUrlMock.mockResolvedValueOnce(null);
    cacheImageBlobMock.mockResolvedValueOnce('blob:fetched-img');

    render(
      <AvatarStack
        users={[{ ...users[2], profilephoto: 'https://cdn.example/cara.jpg' }]}
        maxVisible={1}
        showPortal
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'blob:fetched-img'
      );
    });
    expect(cacheImageBlobMock).toHaveBeenCalledWith(
      'https://cdn.example/cara.jpg'
    );
    expect(document.querySelector('.blur-xs')).toBeTruthy();
  });
});
