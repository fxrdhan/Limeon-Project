import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockLocalStorage, flushPromises } from '@/test/utils/testHelpers';

const makeResponse = (ok = true) => {
  const response = {
    ok,
    blob: vi
      .fn()
      .mockResolvedValue(new Blob([new Uint8Array(5)], { type: 'image/png' })),
    clone() {
      return this;
    },
  } as unknown as Response;
  return response;
};

describe('imageCache utilities', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLocalStorage();
    const cacheStore = {
      match: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const cachesOpen = vi.fn().mockResolvedValue(cacheStore);
    vi.stubGlobal('caches', { open: cachesOpen });
    // @ts-expect-error assign for test
    window.caches = { open: cachesOpen };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(true)));
    URL.createObjectURL = vi.fn(() => 'blob:cached');
    URL.revokeObjectURL = vi.fn();
  });

  it('loads cached images from storage and persists new entries', async () => {
    localStorage.setItem(
      'pharmasys_image_cache_v1',
      JSON.stringify({
        version: 1,
        entries: {
          single: {
            type: 'single',
            url: 'https://example.com/a.png',
            updatedAt: 1,
          },
          set: {
            type: 'set',
            urls: ['https://example.com/b.png'],
            updatedAt: 2,
          },
        },
      })
    );

    const module = await import('./imageCache');

    expect(module.getCachedImage('single')).toBe('https://example.com/a.png');
    expect(module.getCachedImageSet('set')).toEqual([
      'https://example.com/b.png',
    ]);

    module.setCachedImage('new', 'https://example.com/c.png');
    expect(module.getCachedImage('new')).toBe('https://example.com/c.png');
  });

  it('skips empty set entries on load', async () => {
    localStorage.setItem(
      'pharmasys_image_cache_v1',
      JSON.stringify({
        version: 1,
        entries: {
          emptySet: { type: 'set', updatedAt: 1 },
        },
      })
    );

    const module = await import('./imageCache');
    expect(module.getCachedImageSet('emptySet')).toBeNull();
  });

  it('handles missing entries on load', async () => {
    localStorage.setItem(
      'pharmasys_image_cache_v1',
      JSON.stringify({ version: 1 })
    );

    const module = await import('./imageCache');
    expect(module.getCachedImage('missing')).toBeNull();
  });

  it('ignores non-cacheable urls', async () => {
    const module = await import('./imageCache');
    module.setCachedImage('bad', 'data:image/png;base64,abc');
    expect(module.getCachedImage('bad')).toBeNull();
  });

  it('caches image blobs and releases them', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');

    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    const blobUrl = await module.cacheImageBlob('https://example.com/a.png');

    expect(blobUrl).toBe('blob:cached');
    expect(fetch).toHaveBeenCalled();

    module.releaseCachedImageBlob('https://example.com/a.png');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('returns cached blob urls when available', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(makeResponse(true));

    const blobUrl = await module.getCachedImageBlobUrl(
      'https://example.com/a.png'
    );
    expect(blobUrl).toBe('blob:cached');
  });

  it('releases cached blob urls when present', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(makeResponse(true));

    await module.getCachedImageBlobUrl('https://example.com/a.png');
    module.releaseCachedImageBlob('https://example.com/a.png');

    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('skips revoke when cached object url is falsy', async () => {
    URL.createObjectURL = vi.fn(() => '');

    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);

    await module.cacheImageBlob('https://example.com/a.png');
    module.releaseCachedImageBlob('https://example.com/a.png');

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('removes cached image blobs', async () => {
    const module = await import('./imageCache');
    await module.cacheImageBlob('https://example.com/a.png');

    await module.removeCachedImageBlob('https://example.com/a.png');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('preloads urls without duplicates', async () => {
    const module = await import('./imageCache');
    module.preloadImage('https://example.com/a.png');
    module.preloadImage('https://example.com/a.png');
    module.preloadImages(['https://example.com/b.png', '']);

    await flushPromises();
    expect(fetch).toHaveBeenCalled();
  });

  it('preloads cached images and releases blobs', async () => {
    const module = await import('./imageCache');
    module.setCachedImage('single', 'https://example.com/a.png');
    module.setCachedImageSet('set', ['https://example.com/b.png']);

    module.preloadCachedImages();
    await flushPromises();
    expect(fetch).toHaveBeenCalled();

    await module.cacheImageBlob('https://example.com/a.png');
    module.releaseCachedImageBlobs(['https://example.com/a.png']);
    await module.removeCachedImageBlobs(['https://example.com/a.png']);

    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('returns null when caches are unavailable', async () => {
    const openMock = vi.fn().mockResolvedValue(null);
    vi.stubGlobal('caches', { open: openMock });
    // @ts-expect-error override for test
    window.caches = { open: openMock };

    const module = await import('./imageCache');
    const result = await module.getCachedImageBlobUrl(
      'https://example.com/a.png'
    );
    expect(result).toBeNull();

    const cached = await module.cacheImageBlob('https://example.com/a.png');
    expect(cached).toBeNull();

    await module.primeImageCache(['https://example.com/a.png']);
    await module.removeCachedImageBlob('https://example.com/a.png');
  });

  it('handles non-cacheable urls for blob helpers', async () => {
    const module = await import('./imageCache');
    expect(
      await module.getCachedImageBlobUrl('data:image/png;base64,abc')
    ).toBeNull();
    expect(await module.cacheImageBlob('data:image/png;base64,abc')).toBeNull();

    await module.removeCachedImageBlob('data:image/png;base64,abc');
    module.releaseCachedImageBlob('data:image/png;base64,abc');
  });

  it('retains and releases cached blob references', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(makeResponse(true));

    const first = await module.getCachedImageBlobUrl(
      'https://example.com/a.png'
    );
    const second = await module.getCachedImageBlobUrl(
      'https://example.com/a.png'
    );

    expect(first).toBe('blob:cached');
    expect(second).toBe('blob:cached');

    module.releaseCachedImageBlob('https://example.com/a.png');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    module.releaseCachedImageBlob('https://example.com/a.png');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('ignores releases for unknown blobs', async () => {
    const module = await import('./imageCache');
    module.releaseCachedImageBlob('https://example.com/missing.png');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('ignores invalid stored entries', async () => {
    localStorage.setItem(
      'pharmasys_image_cache_v1',
      JSON.stringify({
        version: 1,
        entries: {
          invalidSet: { type: 'set', urls: [], updatedAt: 1 },
          invalidSingle: { type: 'single', url: '', updatedAt: 1 },
        },
      })
    );

    const module = await import('./imageCache');
    expect(module.getCachedImage('invalidSingle')).toBeNull();
    expect(module.getCachedImageSet('invalidSet')).toBeNull();
  });

  it('skips cache load on version mismatch', async () => {
    localStorage.setItem(
      'pharmasys_image_cache_v1',
      JSON.stringify({
        version: 0,
        entries: {
          single: {
            type: 'single',
            url: 'https://example.com/a.png',
            updatedAt: 1,
          },
        },
      })
    );

    const module = await import('./imageCache');
    expect(module.getCachedImage('single')).toBeNull();
  });

  it('returns null for non-set cached image sets', async () => {
    const module = await import('./imageCache');
    module.setCachedImage('single', 'https://example.com/a.png');
    expect(module.getCachedImageSet('single')).toBeNull();
  });

  it('removes cached image sets', async () => {
    const module = await import('./imageCache');
    module.setCachedImageSet('set', ['https://example.com/a.png']);
    module.removeCachedImageSet('set');
    expect(module.getCachedImageSet('set')).toBeNull();
    module.removeCachedImageSet('missing');
  });

  it('handles cacheImageBlob failures and cached responses', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(makeResponse(true));

    const cached = await module.getCachedImageBlobUrl(
      'https://example.com/a.png'
    );
    expect(cached).toBe('blob:cached');

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResponse(false)
    );
    const failed = await module.cacheImageBlob('https://example.com/b.png');
    expect(failed).toBeNull();
  });

  it('returns cached blobs without refetching', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(makeResponse(true));

    const cached = await module.cacheImageBlob('https://example.com/a.png');
    expect(cached).toBe('blob:cached');

    const cachedAgain = await module.cacheImageBlob(
      'https://example.com/a.png'
    );
    expect(cachedAgain).toBe('blob:cached');
  });

  it('handles cacheImageBlob exceptions', async () => {
    const module = await import('./imageCache');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    );

    const result = await module.cacheImageBlob('https://example.com/a.png');
    expect(result).toBeNull();
  });

  it('handles cache priming failures', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('fail')
    );

    await module.primeImageCache(['https://example.com/a.png']);
    expect(fetch).toHaveBeenCalled();
  });

  it('handles cache priming with non-ok responses', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResponse(false)
    );

    await module.primeImageCache(['https://example.com/a.png']);
    expect(fetch).toHaveBeenCalled();
  });

  it('skips priming when cached response exists', async () => {
    const module = await import('./imageCache');
    const cacheStore = await caches.open('pharmasys-image-blobs-v1');
    (
      cacheStore.match as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(makeResponse(true));

    await module.primeImageCache(['https://example.com/a.png']);
    expect(fetch).not.toHaveBeenCalledWith('https://example.com/a.png', {
      mode: 'cors',
    });
  });
});
