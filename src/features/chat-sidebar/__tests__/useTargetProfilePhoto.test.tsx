import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { useTargetProfilePhoto } from '../hooks/useTargetProfilePhoto';

describe('useTargetProfilePhoto', () => {
  it('prefers the thumbnail URL when available', () => {
    const { result } = renderHook(() =>
      useTargetProfilePhoto({
        id: 'user-b',
        profilephoto: 'https://example.com/profile-full.png',
        profilephoto_thumb: 'https://example.com/profile-thumb.webp',
      })
    );

    expect(result.current.displayTargetPhotoUrl).toBe(
      'https://example.com/profile-thumb.webp'
    );
  });

  it('falls back to the original profile photo when no thumbnail exists', () => {
    const { result } = renderHook(() =>
      useTargetProfilePhoto({
        id: 'user-b',
        profilephoto: 'https://example.com/profile-full.png',
        profilephoto_thumb: null,
      })
    );

    expect(result.current.displayTargetPhotoUrl).toBe(
      'https://example.com/profile-full.png'
    );
  });
});
