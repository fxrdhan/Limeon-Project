type CachedImageEntry =
  | {
      type: 'single';
      url: string;
      updatedAt: number;
    }
  | {
      type: 'set';
      urls: string[];
      updatedAt: number;
    };

interface ImageCacheState {
  version: number;
  entries: Record<string, CachedImageEntry>;
}

const STORAGE_KEY = 'pharmasys_image_cache_v1';
const CACHE_VERSION = 1;
const cache = new Map<string, CachedImageEntry>();
const preloadedUrls = new Set<string>();
const blobUrlCache = new Map<string, string>();
const blobUrlRefCount = new Map<string, number>();
const BLOB_CACHE_NAME = 'pharmasys-image-blobs-v1';

const isBrowser = typeof window !== 'undefined';

const isCacheableUrl = (url: string) =>
  url.startsWith('http://') || url.startsWith('https://');

const openBlobCache = async () => {
  if (!isBrowser || !('caches' in window)) return null;
  return caches.open(BLOB_CACHE_NAME);
};

const retainBlobUrl = (url: string) => {
  const current = blobUrlRefCount.get(url) ?? 0;
  blobUrlRefCount.set(url, current + 1);
};

const releaseBlobUrl = (url: string) => {
  const current = blobUrlRefCount.get(url);
  if (!current) return;
  if (current > 1) {
    blobUrlRefCount.set(url, current - 1);
    return;
  }
  blobUrlRefCount.delete(url);
  const cachedObjectUrl = blobUrlCache.get(url);
  if (cachedObjectUrl) {
    URL.revokeObjectURL(cachedObjectUrl);
    blobUrlCache.delete(url);
  }
};

const createBlobUrl = async (url: string, response: Response) => {
  if (blobUrlCache.has(url)) {
    retainBlobUrl(url);
    return blobUrlCache.get(url) || null;
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  blobUrlCache.set(url, objectUrl);
  retainBlobUrl(url);
  return objectUrl;
};

const loadCacheFromStorage = () => {
  if (!isBrowser) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ImageCacheState;
    if (!parsed || parsed.version !== CACHE_VERSION) return;
    Object.entries(parsed.entries || {}).forEach(([key, entry]) => {
      if (entry.type === 'set') {
        const urls = entry.urls || [];
        const hasImage = urls.some(Boolean);
        if (!hasImage) return;
      }
      if (entry.type === 'single' && !entry.url) return;
      cache.set(key, entry);
    });
    persistCache();
  } catch {
    // ignore
  }
};

const persistCache = () => {
  if (!isBrowser) return;
  try {
    const entries = Object.fromEntries(cache.entries());
    const payload: ImageCacheState = {
      version: CACHE_VERSION,
      entries,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

loadCacheFromStorage();

export const getCachedImage = (key: string): string | null => {
  const entry = cache.get(key);
  if (!entry || entry.type !== 'single') return null;
  return entry.url;
};

export const setCachedImage = (key: string, url: string) => {
  if (!isCacheableUrl(url)) return;
  cache.set(key, {
    type: 'single',
    url,
    updatedAt: Date.now(),
  });
  persistCache();
};

export const getCachedImageSet = (key: string): string[] | null => {
  const entry = cache.get(key);
  if (!entry || entry.type !== 'set') return null;
  return entry.urls;
};

export const setCachedImageSet = (key: string, urls: string[]) => {
  cache.set(key, {
    type: 'set',
    urls,
    updatedAt: Date.now(),
  });
  persistCache();
};

export const removeCachedImageSet = (key: string) => {
  if (!cache.has(key)) return;
  cache.delete(key);
  persistCache();
};

export const getCachedImageBlobUrl = async (
  url: string
): Promise<string | null> => {
  if (!isCacheableUrl(url)) return null;
  const existing = blobUrlCache.get(url);
  if (existing) {
    retainBlobUrl(url);
    return existing;
  }

  const cacheStore = await openBlobCache();
  if (!cacheStore) return null;
  const match = await cacheStore.match(url);
  if (!match) return null;
  return createBlobUrl(url, match);
};

export const cacheImageBlob = async (url: string): Promise<string | null> => {
  if (!isCacheableUrl(url)) return null;
  const cached = await getCachedImageBlobUrl(url);
  if (cached) return cached;

  const cacheStore = await openBlobCache();
  if (!cacheStore) return null;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    await cacheStore.put(url, response.clone());
    return createBlobUrl(url, response);
  } catch {
    return null;
  }
};

export const primeImageCache = async (urls: string[]) => {
  const cacheStore = await openBlobCache();
  if (!cacheStore) return;

  const uniqueUrls = Array.from(
    new Set(urls.filter(url => url && isCacheableUrl(url)))
  );

  await Promise.all(
    uniqueUrls.map(async url => {
      const existing = await cacheStore.match(url);
      if (existing) return;
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return;
        await cacheStore.put(url, response);
      } catch {
        // ignore
      }
    })
  );
};

export const preloadImage = (url?: string | null) => {
  if (!url || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  void primeImageCache([url]);
};

export const preloadImages = (urls: string[]) => {
  const filteredUrls = urls.filter(Boolean);
  const urlsToPreload = filteredUrls.filter(url => !preloadedUrls.has(url));
  urlsToPreload.forEach(url => preloadedUrls.add(url));
  void primeImageCache(urlsToPreload);
};

export const preloadCachedImages = () => {
  const urls: string[] = [];
  cache.forEach(entry => {
    if (entry.type === 'single') {
      urls.push(entry.url);
    } else {
      urls.push(...entry.urls);
    }
  });
  void primeImageCache(urls);
};

export const removeCachedImageBlob = async (url: string) => {
  if (!isCacheableUrl(url)) return;

  blobUrlRefCount.delete(url);
  const cachedObjectUrl = blobUrlCache.get(url);
  if (cachedObjectUrl) {
    URL.revokeObjectURL(cachedObjectUrl);
    blobUrlCache.delete(url);
  }

  preloadedUrls.delete(url);

  const cacheStore = await openBlobCache();
  if (!cacheStore) return;
  await cacheStore.delete(url);
};

export const releaseCachedImageBlob = (url: string) => {
  if (!isCacheableUrl(url)) return;
  releaseBlobUrl(url);
};

export const removeCachedImageBlobs = async (urls: string[]) => {
  await Promise.all(urls.map(url => removeCachedImageBlob(url)));
};

export const releaseCachedImageBlobs = (urls: string[]) => {
  urls.forEach(url => releaseCachedImageBlob(url));
};
