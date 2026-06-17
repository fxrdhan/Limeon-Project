import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  getCachedImage,
  getCachedImageBlobUrl,
  getCachedImageSet,
  removeCachedImageSet,
  resetImageCache,
  setCachedImage,
  setCachedImageSet,
} from './imageCache';

const STORAGE_KEY = 'pharmasys_image_cache_v1';

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
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns null for non-cacheable blob lookups without touching browser caches', async () => {
    await expect(
      getCachedImageBlobUrl('blob:local-preview')
    ).resolves.toBeNull();
    await expect(getCachedImageBlobUrl('/relative.png')).resolves.toBeNull();
  });

  it('loads only well-formed persisted entries from local storage', async () => {
    await resetImageCache();
    vi.resetModules();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        entries: {
          'item:broken-date': {
            type: 'set',
            urls: ['https://cdn.example.test/missing-date.png'],
          },
          'item:broken-urls': {
            type: 'set',
            urls: 'https://cdn.example.test/broken.png',
            updatedAt: 3,
          },
          'item:valid': {
            type: 'set',
            urls: ['', 'https://cdn.example.test/front.png'],
            updatedAt: 2,
          },
          'patient:broken': {
            type: 'single',
            updatedAt: 4,
          },
          'patient:valid': {
            type: 'single',
            url: 'https://cdn.example.test/patient.png',
            updatedAt: 1,
          },
        },
      })
    );

    const cacheModule = await import('./imageCache');

    expect(cacheModule.getCachedImage('patient:valid')).toBe(
      'https://cdn.example.test/patient.png'
    );
    expect(cacheModule.getCachedImageSet('item:valid')).toEqual([
      '',
      'https://cdn.example.test/front.png',
    ]);
    expect(cacheModule.getCachedImage('patient:broken')).toBeNull();
    expect(cacheModule.getCachedImageSet('item:broken-date')).toBeNull();
    expect(cacheModule.getCachedImageSet('item:broken-urls')).toBeNull();

    await cacheModule.resetImageCache();
  });
});
