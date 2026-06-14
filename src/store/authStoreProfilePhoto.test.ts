import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { PROFILE_PHOTO_BUCKET } from '../../shared/profilePhotoPaths';
import type { UserDetails } from '../types/database';
import {
  deleteAuthProfilePhotoAssets,
  updateAuthProfilePhotoAssets,
} from './authStoreProfilePhoto';

const { mockBuildProfilePhotoUploadPlan, mockStorageService } = vi.hoisted(
  () => ({
    mockBuildProfilePhotoUploadPlan: vi.fn(),
    mockStorageService: {
      deleteEntityImage: vi.fn(),
      extractPathFromUrl: vi.fn(),
      uploadFile: vi.fn(),
      uploadRawFile: vi.fn(),
    },
  })
);

vi.mock('@/services/api/storage.service', () => ({
  StorageService: mockStorageService,
}));

vi.mock('@/utils/profilePhoto', () => ({
  buildProfilePhotoUploadPlan: mockBuildProfilePhotoUploadPlan,
}));

const createUser = (overrides: Partial<UserDetails> = {}): UserDetails => ({
  email: 'apoteker@example.com',
  id: 'user-1',
  name: 'Apoteker',
  profilephoto: null,
  profilephoto_path: null,
  profilephoto_thumb: null,
  role: 'admin',
  ...overrides,
});

describe('auth store profile photo helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces stored profile photo assets and persists the uploaded URLs', async () => {
    const file = new File(['original'], 'new-photo.png', {
      type: 'image/png',
    });
    const thumbnailFile = new File(['thumbnail'], 'new-photo.thumb.webp', {
      type: 'image/webp',
    });
    const authService = {
      clearUserProfilePhoto: vi.fn(),
      updateUserProfilePhotoAssets: vi.fn(),
    };
    const currentUser = createUser({
      profilephoto: 'https://cdn.example.com/profiles/user-1/old.png',
      profilephoto_path: 'user-1/old.png',
      profilephoto_thumb:
        'https://cdn.example.com/profiles/user-1/old.thumb.webp',
    });
    const updatedUser = createUser({
      profilephoto: 'https://cdn.example.com/profiles/user-1/new-photo.png',
      profilephoto_path: 'user-1/new-photo.png',
      profilephoto_thumb:
        'https://cdn.example.com/profiles/user-1/new-photo.thumb.webp',
    });

    mockStorageService.extractPathFromUrl.mockReturnValue(
      'user-1/old.thumb.webp'
    );
    mockBuildProfilePhotoUploadPlan.mockResolvedValue({
      originalPath: 'user-1/new-photo.png',
      thumbnailFile,
      thumbnailPath: 'user-1/new-photo.thumb.webp',
    });
    mockStorageService.uploadFile.mockResolvedValue({
      publicUrl: 'https://cdn.example.com/profiles/user-1/new-photo.png',
    });
    mockStorageService.uploadRawFile.mockResolvedValue({
      publicUrl: 'https://cdn.example.com/profiles/user-1/new-photo.thumb.webp',
    });
    authService.updateUserProfilePhotoAssets.mockResolvedValue(updatedUser);

    const result = await updateAuthProfilePhotoAssets({
      authService,
      file,
      user: currentUser,
    });

    expect(mockStorageService.deleteEntityImage).toHaveBeenNthCalledWith(
      1,
      PROFILE_PHOTO_BUCKET,
      'user-1/old.png'
    );
    expect(mockStorageService.deleteEntityImage).toHaveBeenNthCalledWith(
      2,
      PROFILE_PHOTO_BUCKET,
      'user-1/old.thumb.webp'
    );
    expect(mockBuildProfilePhotoUploadPlan).toHaveBeenCalledWith(
      currentUser.id,
      file
    );
    expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
      PROFILE_PHOTO_BUCKET,
      file,
      'user-1/new-photo.png'
    );
    expect(mockStorageService.uploadRawFile).toHaveBeenCalledWith(
      PROFILE_PHOTO_BUCKET,
      thumbnailFile,
      'user-1/new-photo.thumb.webp',
      thumbnailFile.type
    );
    expect(authService.updateUserProfilePhotoAssets).toHaveBeenCalledWith(
      currentUser.id,
      {
        profilephoto: 'https://cdn.example.com/profiles/user-1/new-photo.png',
        profilephoto_path: 'user-1/new-photo.png',
        profilephoto_thumb:
          'https://cdn.example.com/profiles/user-1/new-photo.thumb.webp',
      }
    );
    expect(result).toBe(updatedUser);
  });

  it('falls back to the existing user shape when the profile update returns no row', async () => {
    const file = new File(['original'], 'new-photo.jpg', {
      type: 'image/jpeg',
    });
    const authService = {
      clearUserProfilePhoto: vi.fn(),
      updateUserProfilePhotoAssets: vi.fn().mockResolvedValue(null),
    };
    const currentUser = createUser();

    mockBuildProfilePhotoUploadPlan.mockResolvedValue({
      originalPath: 'user-1/new-photo.jpg',
      thumbnailFile: null,
      thumbnailPath: null,
    });
    mockStorageService.uploadFile.mockResolvedValue({
      publicUrl: 'https://cdn.example.com/profiles/user-1/new-photo.jpg',
    });

    const result = await updateAuthProfilePhotoAssets({
      authService,
      file,
      user: currentUser,
    });

    expect(mockStorageService.deleteEntityImage).not.toHaveBeenCalled();
    expect(mockStorageService.uploadRawFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      ...currentUser,
      profilephoto: 'https://cdn.example.com/profiles/user-1/new-photo.jpg',
      profilephoto_path: 'user-1/new-photo.jpg',
      profilephoto_thumb: null,
    });
  });

  it('deletes existing profile photo assets before clearing the profile fields', async () => {
    const authService = {
      clearUserProfilePhoto: vi.fn(),
      updateUserProfilePhotoAssets: vi.fn(),
    };
    const currentUser = createUser({
      profilephoto: 'https://cdn.example.com/profiles/user-1/old.png',
      profilephoto_path: null,
      profilephoto_thumb:
        'https://cdn.example.com/profiles/user-1/old.thumb.webp',
    });

    mockStorageService.extractPathFromUrl
      .mockReturnValueOnce('user-1/old.png')
      .mockReturnValueOnce('user-1/old.thumb.webp');

    await deleteAuthProfilePhotoAssets({
      authService,
      user: currentUser,
    });

    expect(mockStorageService.deleteEntityImage).toHaveBeenNthCalledWith(
      1,
      PROFILE_PHOTO_BUCKET,
      'user-1/old.png'
    );
    expect(mockStorageService.deleteEntityImage).toHaveBeenNthCalledWith(
      2,
      PROFILE_PHOTO_BUCKET,
      'user-1/old.thumb.webp'
    );
    expect(authService.clearUserProfilePhoto).toHaveBeenCalledWith(
      currentUser.id
    );
  });
});
