import type { ComposerPendingFileKind } from '../types';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import { chatSidebarShareGateway } from '../data/chatSidebarGateway';
import { buildChatSharedLinkShortUrl } from '@/services/api/chat/link.service';
import type { TransformOptions } from '@supabase/storage-js';
import {
  buildPdfPreviewStoragePath,
  extractChatStoragePath,
  resolveChatMessageStoragePaths,
  resolveFileExtension,
} from '../../../../shared/chatStoragePaths';
import { chatRuntimeCache } from './chatRuntimeCache';

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

export type ChatAssetTransformOptions = TransformOptions;
const CHAT_SHARED_LINK_SLUG_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{10}$/;

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

const buildCopyableChatAssetRequest = (
  url: string,
  storagePathHint?: string | null
) => {
  const normalizedUrl = url.trim();
  const storagePath =
    storagePathHint?.trim() || extractChatStoragePath(normalizedUrl);
  const targetUrl = storagePath ? null : normalizedUrl || null;

  if (!storagePath && !targetUrl) {
    return null;
  }

  return {
    normalizedUrl,
    storagePath: storagePath || null,
    targetUrl,
    requestKey: storagePath
      ? `storage:${storagePath}`
      : `target:${targetUrl || normalizedUrl}`,
  };
};

const buildCopyableChatSharedLinkUrl = (sharedLinkSlug?: string | null) => {
  const normalizedSharedLinkSlug = sharedLinkSlug?.trim().toLowerCase();
  if (
    !normalizedSharedLinkSlug ||
    !CHAT_SHARED_LINK_SLUG_PATTERN.test(normalizedSharedLinkSlug)
  ) {
    return null;
  }

  return buildChatSharedLinkShortUrl(normalizedSharedLinkSlug);
};

const pendingCopyableChatAssetRequests = new Map<
  string,
  Promise<string | null>
>();

const ensureCopyableChatSharedLink = async (
  url: string,
  storagePathHint?: string | null,
  options?: {
    messageId?: string | null;
  }
) => {
  const request = buildCopyableChatAssetRequest(url, storagePathHint);
  if (!request) {
    return null;
  }

  const normalizedMessageId = options?.messageId?.trim() || '';

  const pendingRequest = pendingCopyableChatAssetRequests.get(
    request.requestKey
  );
  if (pendingRequest) {
    return await pendingRequest;
  }

  const nextRequest = (async () => {
    const sharedLinkResult = await chatSidebarShareGateway.createSharedLink(
      normalizedMessageId
        ? {
            messageId: normalizedMessageId,
          }
        : request.storagePath
          ? { storagePath: request.storagePath }
          : {
              targetUrl: request.targetUrl || request.normalizedUrl,
            }
    );

    const shortUrl = sharedLinkResult.data?.shortUrl?.trim() || null;
    if (!shortUrl) {
      return null;
    }

    return shortUrl;
  })();

  pendingCopyableChatAssetRequests.set(request.requestKey, nextRequest);

  try {
    return await nextRequest;
  } finally {
    const activeRequest = pendingCopyableChatAssetRequests.get(
      request.requestKey
    );
    if (activeRequest === nextRequest) {
      pendingCopyableChatAssetRequests.delete(request.requestKey);
    }
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
    const data = await chatSidebarAssetsGateway.downloadAsset(storagePath);

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
  expiresInSeconds = 3600,
  transform?: ChatAssetTransformOptions
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

export const resolveCopyableChatAssetUrl = async (
  url: string,
  storagePathHint?: string | null,
  options?: {
    messageId?: string | null;
    sharedLinkSlug?: string | null;
  }
) => {
  const normalizedUrl = url.trim();
  const shortUrlFromPayload = buildCopyableChatSharedLinkUrl(
    options?.sharedLinkSlug
  );
  if (shortUrlFromPayload) {
    return shortUrlFromPayload;
  }

  const request = buildCopyableChatAssetRequest(normalizedUrl, storagePathHint);
  const storagePath = request?.storagePath ?? null;

  if (!storagePath && !normalizedUrl) {
    return normalizedUrl || null;
  }

  const shortUrl = await ensureCopyableChatSharedLink(
    normalizedUrl,
    storagePathHint,
    options
  );
  if (shortUrl) {
    return shortUrl;
  }

  const resolvedAssetUrl = storagePath
    ? await resolveChatAssetUrl(normalizedUrl || storagePath, storagePath)
    : null;

  return (
    resolvedAssetUrl ??
    (isDirectChatAssetUrl(normalizedUrl) ? normalizedUrl : null)
  );
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
  chatRuntimeCache.signedAssets.reset();
};
