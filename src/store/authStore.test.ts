import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

const initializeAuthMock = vi.hoisted(() => vi.fn());
const signInMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());
const updateProfileMock = vi.hoisted(() => vi.fn());
const clearProfileMock = vi.hoisted(() => vi.fn());

const extractPathMock = vi.hoisted(() => vi.fn());
const deleteImageMock = vi.hoisted(() => vi.fn());
const uploadImageMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/authService', () => ({
  default: {
    initializeAuth: initializeAuthMock,
    signInWithEmailPassword: signInMock,
    signOut: signOutMock,
    updateUserProfilePhotoUrl: updateProfileMock,
    clearUserProfilePhoto: clearProfileMock,
  },
}));

vi.mock('@/services/api/storage.service', () => ({
  StorageService: {
    extractPathFromUrl: extractPathMock,
    deleteEntityImage: deleteImageMock,
    uploadEntityImage: uploadImageMock,
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      user: null,
      loading: true,
      error: null,
    });
    initializeAuthMock.mockReset();
    signInMock.mockReset();
    signOutMock.mockReset();
    updateProfileMock.mockReset();
    clearProfileMock.mockReset();
    extractPathMock.mockReset();
    deleteImageMock.mockReset();
    uploadImageMock.mockReset();
  });

  it('initializes auth state', async () => {
    initializeAuthMock.mockResolvedValue({
      session: { user: { id: '1' } },
      user: { id: '1', name: 'User' },
    });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.session).toBeTruthy();
    expect(state.user?.id).toBe('1');
    expect(state.loading).toBe(false);
  });

  it('handles initialize errors', async () => {
    initializeAuthMock.mockRejectedValue(new Error('fail'));

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('handles login success and failure', async () => {
    signInMock.mockResolvedValue({
      session: { user: { id: '1' } },
      user: { id: '1', name: 'User' },
    });

    await useAuthStore.getState().login('a@b.com', 'pw');
    expect(useAuthStore.getState().user?.id).toBe('1');

    signInMock.mockRejectedValueOnce(new Error('bad'));
    await useAuthStore.getState().login('a@b.com', 'pw');
    expect(useAuthStore.getState().error).toBe('bad');
  });

  it('handles login with non-error failures', async () => {
    signInMock.mockRejectedValueOnce('boom');
    await useAuthStore.getState().login('a@b.com', 'pw');
    expect(useAuthStore.getState().error).toBe('An unknown error occurred');
  });

  it('logs out user and handles errors', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1' },
    });
    signOutMock.mockResolvedValue(undefined);

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().session).toBeNull();

    signOutMock.mockRejectedValueOnce(new Error('fail'));
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().error).toBe('fail');
  });

  it('handles logout with non-error failures', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1' },
    });
    signOutMock.mockRejectedValueOnce('boom');
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().error).toBe('An unknown error occurred');
  });

  it('updates profile photo', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: 'https://example.com/old.png' },
      loading: false,
      error: null,
    });

    extractPathMock.mockReturnValue('old.png');
    uploadImageMock.mockResolvedValue({
      publicUrl: 'https://example.com/new.png',
    });
    updateProfileMock.mockResolvedValue(undefined);

    const file = new File([new Uint8Array(10)], 'img.png', {
      type: 'image/png',
    });

    await useAuthStore.getState().updateProfilePhoto(file);
    expect(deleteImageMock).toHaveBeenCalled();
    expect(useAuthStore.getState().user?.profilephoto).toBe(
      'https://example.com/new.png'
    );
  });

  it('skips delete when old profile path is missing on update', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: 'https://example.com/old.png' },
      loading: false,
      error: null,
    });

    extractPathMock.mockReturnValue(null);
    uploadImageMock.mockResolvedValue({
      publicUrl: 'https://example.com/new.png',
    });
    updateProfileMock.mockResolvedValue(undefined);

    await useAuthStore
      .getState()
      .updateProfilePhoto(
        new File([new Uint8Array(10)], 'img.png', { type: 'image/png' })
      );

    expect(deleteImageMock).not.toHaveBeenCalled();
  });

  it('handles update profile photo errors', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: null },
      loading: false,
      error: null,
    });

    uploadImageMock.mockRejectedValue(new Error('fail'));

    await expect(
      useAuthStore
        .getState()
        .updateProfilePhoto(
          new File([new Uint8Array(10)], 'img.png', { type: 'image/png' })
        )
    ).rejects.toThrow('fail');

    expect(useAuthStore.getState().error).toBe('fail');
  });

  it('handles update profile photo with non-error failures', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: null },
      loading: false,
      error: null,
    });

    uploadImageMock.mockRejectedValue('boom');

    await expect(
      useAuthStore
        .getState()
        .updateProfilePhoto(
          new File([new Uint8Array(10)], 'img.png', { type: 'image/png' })
        )
    ).rejects.toBe('boom');

    expect(useAuthStore.getState().error).toBe(
      'Failed to update profile photo'
    );
  });

  it('handles delete profile photo', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: 'https://example.com/old.png' },
    });

    extractPathMock.mockReturnValue('old.png');
    clearProfileMock.mockResolvedValue(undefined);

    await useAuthStore.getState().deleteProfilePhoto();
    expect(deleteImageMock).toHaveBeenCalled();
    expect(useAuthStore.getState().user?.profilephoto).toBeNull();
  });

  it('skips delete when old profile path is missing on delete', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: 'https://example.com/old.png' },
    });

    extractPathMock.mockReturnValue(null);
    clearProfileMock.mockResolvedValue(undefined);

    await useAuthStore.getState().deleteProfilePhoto();
    expect(deleteImageMock).not.toHaveBeenCalled();
  });

  it('skips delete when no profile photo set', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: null },
    });

    clearProfileMock.mockResolvedValue(undefined);

    await useAuthStore.getState().deleteProfilePhoto();
    expect(deleteImageMock).not.toHaveBeenCalled();
  });

  it('handles delete profile photo errors', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: 'https://example.com/old.png' },
    });

    extractPathMock.mockReturnValue('old.png');
    deleteImageMock.mockRejectedValue(new Error('boom'));

    await expect(useAuthStore.getState().deleteProfilePhoto()).rejects.toThrow(
      'boom'
    );

    expect(useAuthStore.getState().error).toBe('boom');
  });

  it('returns error when unauthenticated on photo updates', async () => {
    await useAuthStore
      .getState()
      .updateProfilePhoto(
        new File([new Uint8Array(10)], 'img.png', { type: 'image/png' })
      );
    expect(useAuthStore.getState().error).toBe('User not authenticated');
  });

  it('returns error when unauthenticated on delete photo', async () => {
    await useAuthStore.getState().deleteProfilePhoto();
    expect(useAuthStore.getState().error).toBe('User not authenticated');
  });

  it('handles delete profile photo with non-error failures', async () => {
    useAuthStore.setState({
      session: { user: { id: '1' } },
      user: { id: '1', profilephoto: 'https://example.com/old.png' },
    });

    extractPathMock.mockReturnValue('old.png');
    deleteImageMock.mockRejectedValue('boom');

    await expect(useAuthStore.getState().deleteProfilePhoto()).rejects.toBe(
      'boom'
    );
    expect(useAuthStore.getState().error).toBe(
      'Failed to delete profile photo'
    );
  });
});
