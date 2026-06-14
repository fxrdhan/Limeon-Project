import type { TransformOptions } from '@supabase/storage-js';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  extractChatStoragePath,
  resolveFileExtension,
} from '../../../../shared/chatStoragePaths';
import { chatRuntimeCache } from './chatRuntimeCache';

export const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const isDirectChatAssetUrl = (url: string) =>
  /^(https?:\/\/|blob:|data:|\/)/i.test(url);

export const SIGNED_CHAT_ASSET_URL_TTL_MS = 55 * 60 * 1000;
export interface ResolvedChatAssetUrlEntry {
  url: string;
  expiresAt: number | null;
}

export const getFreshResolvedChatAssetUrl = (
  entry?: ResolvedChatAssetUrlEntry | null,
  now = Date.now()
) => {
  if (!entry) {
    return null;
  }

  if (entry.expiresAt !== null && entry.expiresAt <= now) {
    return null;
  }

  return entry.url;
};

export type ChatAssetTransformOptions = TransformOptions;

const buildSignedChatAssetCacheKey = (
  storagePath: string,
  transform?: ChatAssetTransformOptions
) => {
  if (!transform || Object.keys(transform).length === 0) {
    return storagePath;
  }

  return [
    storagePath,
    transform.width ?? '',
    transform.height ?? '',
    transform.resize ?? '',
    transform.quality ?? '',
    transform.format ?? '',
  ].join('::');
};

const resolveFallbackChatAssetStoragePath = (
  url: string,
  storagePathHint?: string | null
) =>
  storagePathHint?.trim() ||
  extractChatStoragePath(url) ||
  (!isDirectChatAssetUrl(url) ? url.trim() : null);

const coerceBlobMimeType = (blob: Blob, forcedMimeType?: string | null) => {
  const normalizedForcedMimeType = forcedMimeType?.toLowerCase();
  if (
    !normalizedForcedMimeType ||
    blob.type.toLowerCase() === normalizedForcedMimeType
  ) {
    return blob;
  }

  return new Blob([blob], { type: normalizedForcedMimeType });
};

export const fetchChatFileBlobWithFallback = async (
  url: string,
  storagePathHint?: string | null,
  forcedMimeType?: string | null
): Promise<Blob | null> => {
  const normalizedForcedMimeType = forcedMimeType?.toLowerCase();
  const storagePath = resolveFallbackChatAssetStoragePath(url, storagePathHint);

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
          return coerceBlobMimeType(responseBlob, normalizedForcedMimeType);
        }
      }
    } catch {
      // Continue to storage fallback.
    }
  }

  if (!storagePath) return null;

  try {
    const data = await chatSidebarAssetsGateway.downloadAsset(storagePath);

    return coerceBlobMimeType(data, normalizedForcedMimeType);
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
  expiresInSeconds = 3600,
  transform?: ChatAssetTransformOptions
): Promise<ResolvedChatAssetUrlEntry | null> => {
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

  const signedAssetCacheKey = buildSignedChatAssetCacheKey(
    storagePath,
    transform
  );
  chatRuntimeCache.signedAssets.pruneExpired();
  const cachedSignedUrl =
    chatRuntimeCache.signedAssets.getEntry(signedAssetCacheKey);
  if (cachedSignedUrl) {
    return {
      url: cachedSignedUrl.signedUrl,
      expiresAt: cachedSignedUrl.expiresAt,
    };
  }

  try {
    const signedUrl = await chatSidebarAssetsGateway.createSignedAssetUrl(
      storagePath,
      expiresInSeconds,
      transform
    );

    const expiresAt = Date.now() + SIGNED_CHAT_ASSET_URL_TTL_MS;
    chatRuntimeCache.signedAssets.setEntry(
      signedAssetCacheKey,
      signedUrl,
      expiresAt
    );

    return {
      url: signedUrl,
      expiresAt,
    };
  } catch {
    return null;
  }
};

export const getCachedResolvedChatAssetUrl = (
  url: string,
  storagePathHint?: string | null,
  transform?: ChatAssetTransformOptions
) => {
  if (isDirectChatAssetUrl(url)) {
    return url;
  }

  const storagePath = resolveFallbackChatAssetStoragePath(url, storagePathHint);
  if (!storagePath) {
    return null;
  }

  const signedAssetCacheKey = buildSignedChatAssetCacheKey(
    storagePath,
    transform
  );
  chatRuntimeCache.signedAssets.pruneExpired();
  const cachedSignedUrl =
    chatRuntimeCache.signedAssets.getEntry(signedAssetCacheKey);

  return cachedSignedUrl?.signedUrl ?? null;
};

export const resolveChatAssetUrl = async (
  url: string,
  storagePathHint?: string | null,
  expiresInSeconds = 3600,
  transform?: ChatAssetTransformOptions
) => {
  const resolvedAsset = await resolveChatAssetUrlWithExpiry(
    url,
    storagePathHint,
    expiresInSeconds,
    transform
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
    const normalizedMimeType = (forcedMimeType || fileBlob.type).toLowerCase();
    const fileExtension = resolveFileExtension(
      storagePathHint ?? null,
      url,
      normalizedMimeType
    );
    const isSafeInlineType =
      normalizedMimeType === 'application/pdf' ||
      (normalizedMimeType.startsWith('image/') &&
        normalizedMimeType !== 'image/svg+xml' &&
        fileExtension !== 'svg');
    const objectUrl = URL.createObjectURL(fileBlob);

    if (isSafeInlineType) {
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 30_000);
      return true;
    }

    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download =
      storagePathHint?.split('/').pop() || url.split('/').pop() || 'attachment';
    downloadLink.rel = 'noopener noreferrer';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1_000);
    return true;
  }

  if (!isDirectChatAssetUrl(url)) {
    return false;
  }

  openInNewTab(url);
  return true;
};

export const resetSignedChatAssetUrlCache = () => {
  chatRuntimeCache.signedAssets.reset();
};
