import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  getCachedImage,
  getCachedImageBlobUrl,
  getCachedImageSet,
  removeCachedImageSet,
  resetImageCache,
  setCachedImage,
  setCachedImageSet,
} from './imageCache';

describe('image cache utilities', () => {
  beforeEach(async () => {
    await resetImageCache();
  });

  it('caches only http and https single-image urls', () => {
    setCachedImage('patient:1', 'https://cdn.example.test/patient.png');
    setCachedImage('patient:2', 'blob:local-preview');
    setCachedImage('patient:3', '/local-image.png');

    expect(getCachedImage('patient:1')).toBe(
      'https://cdn.example.test/patient.png'
    );
    expect(getCachedImage('patient:2')).toBeNull();
    expect(getCachedImage('patient:3')).toBeNull();
  });

  it('caches and removes image url sets', () => {
    setCachedImageSet('item:images', [
      'https://cdn.example.test/front.png',
      'https://cdn.example.test/back.png',
    ]);

    expect(getCachedImageSet('item:images')).toEqual([
      'https://cdn.example.test/front.png',
      'https://cdn.example.test/back.png',
    ]);

    removeCachedImageSet('item:images');

    expect(getCachedImageSet('item:images')).toBeNull();
  });

  it('resets cached entries from memory and local storage', async () => {
    setCachedImage('supplier:1', 'https://cdn.example.test/supplier.png');

    expect(getCachedImage('supplier:1')).toBe(
      'https://cdn.example.test/supplier.png'
    );

    await resetImageCache();

    expect(getCachedImage('supplier:1')).toBeNull();
    expect(localStorage.getItem('pharmasys_image_cache_v1')).toBeNull();
  });

  it('returns null for non-cacheable blob lookups without touching browser caches', async () => {
    await expect(
      getCachedImageBlobUrl('blob:local-preview')
    ).resolves.toBeNull();
    await expect(getCachedImageBlobUrl('/relative.png')).resolves.toBeNull();
  });
});
