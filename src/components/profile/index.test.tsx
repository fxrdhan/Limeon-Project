import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from './index';

const authStateStore = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    name: 'Andi',
    role: 'Admin',
    email: 'andi@example.com',
    profilephoto: null as string | null,
  },
  logout: vi.fn().mockResolvedValue(undefined),
}));

const authActionsStore = vi.hoisted(() => ({
  updateProfilePhoto: vi.fn().mockResolvedValue(undefined),
  deleteProfilePhoto: vi.fn().mockResolvedValue(undefined),
}));

const cacheImageBlobMock = vi.hoisted(() => vi.fn());
const getCachedImageBlobUrlMock = vi.hoisted(() => vi.fn());
const setCachedImageMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/authStore', () => {
  const useAuthStore = Object.assign(() => authStateStore, {
    getState: () => authActionsStore,
  });

  return { useAuthStore };
});

vi.mock('@/utils/imageCache', () => ({
  cacheImageBlob: (url: string) => cacheImageBlobMock(url),
  getCachedImageBlobUrl: (url: string) => getCachedImageBlobUrlMock(url),
  setCachedImage: (key: string, url: string) => setCachedImageMock(key, url),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/components/image-manager', () => ({
  default: ({
    id,
    children,
    onImageUpload,
    onImageDelete,
  }: {
    id: string;
    children: ReactNode;
    onImageUpload?: (file: File) => Promise<void>;
    onImageDelete?: () => Promise<void>;
  }) => (
    <div data-testid={`image-manager-${id}`}>
      <button
        type="button"
        onClick={async () => {
          if (onImageUpload) {
            await onImageUpload(
              new File(['img'], 'profile.png', { type: 'image/png' })
            );
          }
        }}
      >
        upload-image
      </button>
      <button
        type="button"
        onClick={async () => {
          if (onImageDelete) {
            await onImageDelete();
          }
        }}
      >
        delete-image
      </button>
      {children}
    </div>
  ),
}));

describe('Profile', () => {
  const getTriggerButton = () =>
    document.querySelector('button[aria-haspopup="true"]') as HTMLButtonElement;

  beforeEach(() => {
    authStateStore.user = {
      id: 'user-1',
      name: 'Andi',
      role: 'Admin',
      email: 'andi@example.com',
      profilephoto: null,
    };
    authStateStore.logout.mockReset();
    authStateStore.logout.mockResolvedValue(undefined);

    authActionsStore.updateProfilePhoto.mockReset();
    authActionsStore.updateProfilePhoto.mockResolvedValue(undefined);
    authActionsStore.deleteProfilePhoto.mockReset();
    authActionsStore.deleteProfilePhoto.mockResolvedValue(undefined);

    cacheImageBlobMock.mockReset();
    getCachedImageBlobUrlMock.mockReset();
    setCachedImageMock.mockReset();
    getCachedImageBlobUrlMock.mockResolvedValue(null);
    cacheImageBlobMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens portal, keeps it open for uploader portal clicks, closes outside, and handles logout/settings', async () => {
    render(<Profile />);

    expect(screen.getByText('A')).toBeInTheDocument();
    fireEvent.click(getTriggerButton());
    expect(await screen.findByText('Pengaturan Profil')).toBeInTheDocument();

    const uploaderPopup = document.createElement('div');
    uploaderPopup.className = 'z-[9999]-popup';
    document.body.appendChild(uploaderPopup);
    fireEvent.mouseDown(uploaderPopup);
    expect(screen.getByText('Pengaturan Profil')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText('Pengaturan Profil')).not.toBeInTheDocument();
    });

    fireEvent.click(getTriggerButton());
    fireEvent.click(
      await screen.findByRole('button', { name: 'Pengaturan Profil' })
    );
    await waitFor(() => {
      expect(screen.queryByText('Pengaturan Profil')).not.toBeInTheDocument();
    });

    fireEvent.click(getTriggerButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));
    await waitFor(() => {
      expect(authStateStore.logout).toHaveBeenCalledTimes(1);
    });
  });

  it('caches http profile photo and prefers cached blob url', async () => {
    authStateStore.user.profilephoto = 'https://cdn.example.com/profile.jpg';
    getCachedImageBlobUrlMock.mockResolvedValue('blob://cached-profile');

    render(<Profile />);

    await waitFor(() => {
      expect(setCachedImageMock).toHaveBeenCalledWith(
        'profile:user-1',
        'https://cdn.example.com/profile.jpg'
      );
      expect(getCachedImageBlobUrlMock).toHaveBeenCalledWith(
        'https://cdn.example.com/profile.jpg'
      );
    });

    const images = screen.getAllByAltText('Profile') as HTMLImageElement[];
    expect(
      images.some(image => image.src.includes('blob://cached-profile'))
    ).toBe(true);
  });

  it('uses uploaded/deleted profile image actions and non-http local image directly', async () => {
    authStateStore.user.profilephoto = 'data:image/png;base64,abc';

    render(<Profile />);
    fireEvent.click(getTriggerButton());

    await screen.findByText('Pengaturan Profil');
    const uploadButton = screen.getByRole('button', { name: 'upload-image' });
    const deleteButton = screen.getByRole('button', { name: 'delete-image' });

    fireEvent.click(uploadButton);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(authActionsStore.updateProfilePhoto).toHaveBeenCalledTimes(1);
      expect(authActionsStore.deleteProfilePhoto).toHaveBeenCalledTimes(1);
      expect(getCachedImageBlobUrlMock).not.toHaveBeenCalled();
      expect(cacheImageBlobMock).not.toHaveBeenCalled();
    });

    const images = screen.getAllByAltText('Profile') as HTMLImageElement[];
    expect(
      images.some(image => image.src.includes('data:image/png;base64,abc'))
    ).toBe(true);
  });
});
