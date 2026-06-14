import type { ComposerPendingFileKind } from '../types';
import { chatSidebarShareGateway } from '../data/chatSidebarGateway';
import {
  buildPdfPreviewStoragePath,
  extractChatStoragePath,
  resolveChatMessageStoragePaths,
  resolveFileExtension,
} from '../../../../shared/chatStoragePaths';
import {
  isDirectChatAssetUrl,
  resolveChatAssetUrl,
} from './message-file-assets';

export {
  buildPdfPreviewStoragePath,
  extractChatStoragePath,
  resolveChatMessageStoragePaths,
  resolveFileExtension,
};
export {
  fetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback,
  getCachedResolvedChatAssetUrl,
  getFreshResolvedChatAssetUrl,
  isDirectChatAssetUrl,
  openChatFileInNewTab,
  openInNewTab,
  resetSignedChatAssetUrlCache,
  resolveChatAssetUrl,
  resolveChatAssetUrlWithExpiry,
  SIGNED_CHAT_ASSET_URL_TTL_MS,
} from './message-file-assets';
export type {
  ChatAssetTransformOptions,
  ResolvedChatAssetUrlEntry,
} from './message-file-assets';

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

const CHAT_SHARED_LINK_SLUG_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{10}$/;

const buildCopyableChatAssetRequest = (
  url: string,
  storagePathHint?: string | null
) => {
  const normalizedUrl = url.trim();
  const storagePath =
    storagePathHint?.trim() || extractChatStoragePath(normalizedUrl);
  if (!storagePath) {
    return null;
  }

  return {
    normalizedUrl,
    storagePath,
    requestKey: `storage:${storagePath}`,
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

  return chatSidebarShareGateway.buildShortUrl(normalizedSharedLinkSlug);
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
        : {
            storagePath: request.storagePath,
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

export const resolveCopyableChatAssetUrl = async (
  url: string,
  storagePathHint?: string | null,
  options?: {
    messageId?: string | null;
    sharedLinkSlug?: string | null;
    allowAssetUrlFallback?: boolean;
  }
) => {
  const normalizedUrl = url.trim();
  const allowAssetUrlFallback = options?.allowAssetUrlFallback !== false;
  const shortUrlFromPayload = buildCopyableChatSharedLinkUrl(
    options?.sharedLinkSlug
  );
  if (shortUrlFromPayload) {
    return shortUrlFromPayload;
  }

  const request = buildCopyableChatAssetRequest(normalizedUrl, storagePathHint);
  const storagePath = request?.storagePath ?? null;

  if (!storagePath) {
    return allowAssetUrlFallback && isDirectChatAssetUrl(normalizedUrl)
      ? normalizedUrl
      : null;
  }

  const shortUrl = await ensureCopyableChatSharedLink(
    normalizedUrl,
    storagePathHint,
    options
  );
  if (shortUrl) {
    return shortUrl;
  }

  if (!allowAssetUrlFallback) {
    return null;
  }

  const resolvedAssetUrl = storagePath
    ? await resolveChatAssetUrl(normalizedUrl || storagePath, storagePath)
    : null;

  return (
    resolvedAssetUrl ??
    (isDirectChatAssetUrl(normalizedUrl) ? normalizedUrl : null)
  );
};

const IMAGE_FILE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'heic',
  'heif',
]);

export const isImageFileExtensionOrMime = (
  extension: string,
  mimeType?: string | null
) =>
  IMAGE_FILE_EXTENSIONS.has(extension) ||
  mimeType?.toLowerCase().startsWith('image/') === true;
