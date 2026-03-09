import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTargetProfilePhoto } from '../hooks/useTargetProfilePhoto';

const mockImageCache = vi.hoisted(() => ({
  cacheImageBlob: vi.fn(),
  getCachedImageBlobUrl: vi.fn(),
  releaseCachedImageBlob: vi.fn(),
  setCachedImage: vi.fn(),
}));

vi.mock('@/utils/imageCache', () => mockImageCache);

const flushImageEffect = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useTargetProfilePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImageCache.getCachedImageBlobUrl.mockResolvedValue(null);
    mockImageCache.cacheImageBlob.mockResolvedValue(
      'blob:https://example.com/target'
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('releases cached blob references when the target image changes', async () => {
    const { rerender } = renderHook(
      ({ profilephoto }: { profilephoto: string | null }) =>
        useTargetProfilePhoto({
          id: 'user-b',
          profilephoto,
        }),
      {
        initialProps: {
          profilephoto: 'https://example.com/target-a.png',
        },
      }
    );

    await flushImageEffect();

    rerender({
      profilephoto: 'https://example.com/target-b.png',
    });

    await flushImageEffect();

    expect(mockImageCache.releaseCachedImageBlob).toHaveBeenCalledWith(
      'https://example.com/target-a.png'
    );
  });

  it('releases cached blob references on unmount', async () => {
    const { unmount } = renderHook(() =>
      useTargetProfilePhoto({
        id: 'user-b',
        profilephoto: 'https://example.com/target-a.png',
      })
    );

    await flushImageEffect();
    unmount();

    expect(mockImageCache.releaseCachedImageBlob).toHaveBeenCalledWith(
      'https://example.com/target-a.png'
    );
  });
});
