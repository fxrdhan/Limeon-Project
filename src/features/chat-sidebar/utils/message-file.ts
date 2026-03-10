import { CHAT_IMAGE_BUCKET } from '../constants';
import { StorageService } from '@/services/api/storage.service';
import type { ComposerPendingFileKind } from '../types';
import {
  buildPdfPreviewStoragePath,
  extractChatStoragePath,
  resolveChatMessageStoragePaths,
  resolveFileExtension,
} from '../../../../shared/chatStoragePaths';

export {
  buildPdfPreviewStoragePath,
  extractChatStoragePath,
  resolveChatMessageStoragePaths,
  resolveFileExtension,
};

export const formatFileSize = (sizeBytes?: number | null) => {
  if (
    typeof sizeBytes !== 'number' ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes < 0
  ) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let value = sizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
};

export const formatFileFallbackLabel = (
  fileExtension: string,
  fileKind: ComposerPendingFileKind
) => {
  if (fileExtension) return fileExtension.toUpperCase();
  return fileKind === 'audio' ? 'AUDIO' : 'FILE';
};

export const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const isDirectChatAssetUrl = (url: string) =>
  /^(https?:\/\/|blob:|data:|\/)/i.test(url);

export const SIGNED_CHAT_ASSET_URL_TTL_MS = 55 * 60 * 1000;
export const SIGNED_CHAT_ASSET_URL_CACHE_MAX_ENTRIES = 128;
const signedChatAssetUrlCache = new Map<
  string,
  { signedUrl: string; expiresAt: number }
>();

const pruneExpiredSignedChatAssetUrls = (now = Date.now()) => {
  for (const [storagePath, cachedEntry] of signedChatAssetUrlCache) {
    if (cachedEntry.expiresAt > now) {
      continue;
    }

    signedChatAssetUrlCache.delete(storagePath);
  }
};

const setSignedChatAssetUrlCacheEntry = (
  storagePath: string,
  signedUrl: string,
  expiresAt: number
) => {
  if (signedChatAssetUrlCache.has(storagePath)) {
    signedChatAssetUrlCache.delete(storagePath);
  }

  signedChatAssetUrlCache.set(storagePath, {
    signedUrl,
    expiresAt,
  });

  while (
    signedChatAssetUrlCache.size > SIGNED_CHAT_ASSET_URL_CACHE_MAX_ENTRIES
  ) {
    const oldestStoragePath = signedChatAssetUrlCache.keys().next().value;
    if (!oldestStoragePath) {
      break;
    }

    signedChatAssetUrlCache.delete(oldestStoragePath);
  }
};

export const fetchChatFileBlobWithFallback = async (
  url: string,
  storagePathHint?: string | null,
  forcedMimeType?: string | null
): Promise<Blob | null> => {
  const normalizedForcedMimeType = forcedMimeType?.toLowerCase();
  const storagePath =
    storagePathHint?.trim() ||
    extractChatStoragePath(url) ||
    (!isDirectChatAssetUrl(url) ? url.trim() : null);

  if (isDirectChatAssetUrl(url)) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const responseBlob = await response.blob();
        const responseMimeType = responseBlob.type.toLowerCase();
        const isHtmlFallback =
          responseMimeType.startsWith('text/html') ||
          responseMimeType.startsWith('application/xhtml+xml');
        const isForcedMimeTypeMismatch =
          normalizedForcedMimeType &&
          responseMimeType &&
          normalizedForcedMimeType !== responseMimeType &&
          ((normalizedForcedMimeType.startsWith('image/') &&
            !responseMimeType.startsWith('image/')) ||
            (normalizedForcedMimeType === 'application/pdf' &&
              responseMimeType !== 'application/pdf'));

        if (!isHtmlFallback && !isForcedMimeTypeMismatch) {
          if (
            !normalizedForcedMimeType ||
            responseMimeType === normalizedForcedMimeType
          ) {
            return responseBlob;
          }

          return new Blob([responseBlob], { type: normalizedForcedMimeType });
        }
      }
    } catch {
      // Continue to storage fallback.
    }
  }

  if (!storagePath) return null;

  try {
    const data = await StorageService.downloadFile(
      CHAT_IMAGE_BUCKET,
      storagePath
    );

    if (
      !normalizedForcedMimeType ||
      data.type.toLowerCase() === normalizedForcedMimeType
    ) {
      return data;
    }

    return new Blob([data], { type: normalizedForcedMimeType });
  } catch {
    return null;
  }
};

export const fetchPdfBlobWithFallback = (
  url: string,
  storagePathHint?: string | null
) => fetchChatFileBlobWithFallback(url, storagePathHint, 'application/pdf');

export const resolveChatAssetUrlWithExpiry = async (
  url: string,
  storagePathHint?: string | null,
  expiresInSeconds = 3600
) => {
  if (isDirectChatAssetUrl(url)) {
    return {
      url,
      expiresAt: null,
    };
  }

  const storagePath = storagePathHint?.trim() || extractChatStoragePath(url);
  if (!storagePath) {
    return null;
  }

  pruneExpiredSignedChatAssetUrls();
  const cachedSignedUrl = signedChatAssetUrlCache.get(storagePath);
  if (cachedSignedUrl && cachedSignedUrl.expiresAt > Date.now()) {
    return {
      url: cachedSignedUrl.signedUrl,
      expiresAt: cachedSignedUrl.expiresAt,
    };
  }

  try {
    const signedUrl = await StorageService.createSignedUrl(
      CHAT_IMAGE_BUCKET,
      storagePath,
      expiresInSeconds
    );

    const expiresAt = Date.now() + SIGNED_CHAT_ASSET_URL_TTL_MS;
    setSignedChatAssetUrlCacheEntry(storagePath, signedUrl, expiresAt);

    return {
      url: signedUrl,
      expiresAt,
    };
  } catch {
    return null;
  }
};

export const resolveChatAssetUrl = async (
  url: string,
  storagePathHint?: string | null,
  expiresInSeconds = 3600
) => {
  const resolvedAsset = await resolveChatAssetUrlWithExpiry(
    url,
    storagePathHint,
    expiresInSeconds
  );

  return resolvedAsset?.url ?? null;
};

export const openChatFileInNewTab = async (
  url: string,
  storagePathHint?: string | null,
  forcedMimeType?: string | null
) => {
  const fileBlob = await fetchChatFileBlobWithFallback(
    url,
    storagePathHint,
    forcedMimeType
  );

  if (fileBlob) {
    const objectUrl = URL.createObjectURL(fileBlob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 30_000);
    return true;
  }

  if (!isDirectChatAssetUrl(url)) {
    return false;
  }

  openInNewTab(url);
  return true;
};

const IMAGE_FILE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'svg',
  'heic',
  'heif',
]);

export const isImageFileExtensionOrMime = (
  extension: string,
  mimeType?: string | null
) =>
  IMAGE_FILE_EXTENSIONS.has(extension) ||
  mimeType?.toLowerCase().startsWith('image/') === true;

export const resetSignedChatAssetUrlCache = () => {
  signedChatAssetUrlCache.clear();
};
