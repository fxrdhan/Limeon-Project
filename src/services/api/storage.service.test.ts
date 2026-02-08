import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service';

const uploadMock = vi.hoisted(() => vi.fn());
const removeMock = vi.hoisted(() => vi.fn());
const getPublicUrlMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const compressImageIfNeededMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: fromMock,
    },
  },
}));

vi.mock('@/utils/image', () => ({
  compressImageIfNeeded: compressImageIfNeededMock,
}));

describe('StorageService', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    removeMock.mockReset();
    getPublicUrlMock.mockReset();
    fromMock.mockReset();
    compressImageIfNeededMock.mockReset();

    fromMock.mockReturnValue({
      upload: uploadMock,
      remove: removeMock,
      getPublicUrl: getPublicUrlMock,
    });
  });

  it('uploads file and returns public URL', async () => {
    const originalFile = new File(['raw'], 'photo.jpg', { type: 'image/jpeg' });
    const compressedFile = new File(['compressed'], 'photo.jpg', {
      type: 'image/jpeg',
    });
    compressImageIfNeededMock.mockResolvedValueOnce(compressedFile);
    uploadMock.mockResolvedValueOnce({
      data: { path: 'users/u1/image_1.jpg' },
      error: null,
    });
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: 'https://cdn.example.com/users/u1/image_1.jpg' },
    });

    const result = await StorageService.uploadFile(
      'profiles',
      originalFile,
      'users/u1/image_1.jpg'
    );

    expect(compressImageIfNeededMock).toHaveBeenCalledWith(originalFile);
    expect(uploadMock).toHaveBeenCalledWith(
      'users/u1/image_1.jpg',
      compressedFile,
      { cacheControl: '3600', upsert: true }
    );
    expect(result).toEqual({
      path: 'users/u1/image_1.jpg',
      publicUrl: 'https://cdn.example.com/users/u1/image_1.jpg',
    });
  });

  it('throws on upload error', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    compressImageIfNeededMock.mockResolvedValueOnce(file);
    uploadMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'bucket unavailable' },
    });

    await expect(
      StorageService.uploadFile('profiles', file, 'users/u1/image_1.jpg')
    ).rejects.toThrow('Upload failed: bucket unavailable');
  });

  it('deletes file and throws on failure', async () => {
    removeMock.mockResolvedValueOnce({ error: null });
    await expect(
      StorageService.deleteFile('profiles', 'users/u1/image_1.jpg')
    ).resolves.toBeUndefined();
    expect(removeMock).toHaveBeenCalledWith(['users/u1/image_1.jpg']);

    removeMock.mockResolvedValueOnce({
      error: { message: 'permission denied' },
    });
    await expect(
      StorageService.deleteFile('profiles', 'users/u1/image_1.jpg')
    ).rejects.toThrow('Delete failed: permission denied');
  });

  it('builds entity image path and delegates upload', async () => {
    const uploadSpy = vi
      .spyOn(StorageService, 'uploadFile')
      .mockResolvedValueOnce({
        path: 'u1/image_123.png',
        publicUrl: 'https://cdn.example.com/u1/image_123.png',
      });
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123);

    await expect(
      StorageService.uploadEntityImage('profiles', 'u1', file)
    ).resolves.toEqual({
      path: 'u1/image_123.png',
      publicUrl: 'https://cdn.example.com/u1/image_123.png',
    });

    expect(uploadSpy).toHaveBeenCalledWith(
      'profiles',
      file,
      'u1/image_123.png'
    );
    nowSpy.mockRestore();
    uploadSpy.mockRestore();
  });

  it('delegates deleteEntityImage to deleteFile', async () => {
    const deleteSpy = vi
      .spyOn(StorageService, 'deleteFile')
      .mockResolvedValueOnce(undefined);

    await StorageService.deleteEntityImage('profiles', 'u1/image_123.png');
    expect(deleteSpy).toHaveBeenCalledWith('profiles', 'u1/image_123.png');

    deleteSpy.mockRestore();
  });

  it('extracts path from standard and fallback URLs', () => {
    const standardUrl =
      'https://x.supabase.co/storage/v1/object/public/profiles/u1/image_123.png';
    expect(StorageService.extractPathFromUrl(standardUrl, 'profiles')).toBe(
      'u1/image_123.png'
    );

    const nonStandardUrl =
      'https://x.supabase.co/other/storage/v1/object/public/profiles/u2/img.jpg';
    expect(
      StorageService.extractPathFromUrl(nonStandardUrl, '/profiles/')
    ).toBe('u2/img.jpg');

    expect(
      StorageService.extractPathFromUrl(
        'https://x.supabase.co/no-match',
        'profiles'
      )
    ).toBeNull();
  });

  it('returns public URL from bucket/path', () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: 'https://cdn.example.com/profiles/u1/image.jpg' },
    });

    const result = StorageService.getPublicUrl('profiles', 'u1/image.jpg');
    expect(result).toBe('https://cdn.example.com/profiles/u1/image.jpg');
    expect(getPublicUrlMock).toHaveBeenCalledWith('u1/image.jpg');
  });
});
