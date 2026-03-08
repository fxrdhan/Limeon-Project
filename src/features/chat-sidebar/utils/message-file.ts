import { CHAT_IMAGE_BUCKET } from '../constants';
import { chatSidebarGateway } from '../data/chatSidebarGateway';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ComposerPendingFileKind } from '../types';

export const resolveFileExtension = (
  fileName: string | null,
  fileUrl: string | null,
  mimeType?: string | null
) => {
  const rawSource = fileName || fileUrl || '';
  const sourceWithoutQuery = rawSource.split(/[?#]/)[0];
  const directExtension = sourceWithoutQuery
    .split('.')
    .pop()
    ?.trim()
    .toLowerCase();

  if (directExtension) {
    return directExtension;
  }

  const mimeSubtype = mimeType?.split('/')[1]?.split('+')[0]?.toLowerCase();
  if (!mimeSubtype) return '';

  if (mimeSubtype === 'jpeg') return 'jpg';
  if (mimeSubtype === 'png') return 'png';
  if (mimeSubtype === 'pdf') return 'pdf';
  if (mimeSubtype === 'msword') return 'doc';
  if (mimeSubtype.includes('wordprocessingml')) return 'docx';
  if (mimeSubtype === 'csv') return 'csv';
  if (mimeSubtype === 'plain') return 'txt';
  if (
    mimeSubtype.includes('powerpoint') ||
    mimeSubtype.includes('presentation')
  ) {
    return 'pptx';
  }
  if (mimeSubtype.includes('excel') || mimeSubtype.includes('spreadsheet')) {
    return 'xlsx';
  }
  if (mimeSubtype.includes('zip') || mimeSubtype.includes('compressed')) {
    return 'zip';
  }

  return '';
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

export const extractChatStoragePath = (url: string): string | null => {
  const patterns = [
    '/storage/v1/object/public/chat/',
    '/storage/v1/object/sign/chat/',
    '/storage/v1/object/authenticated/chat/',
  ];

  for (const pattern of patterns) {
    const rawPath = url.split(pattern)[1];
    if (!rawPath) continue;

    const pathWithoutQuery = rawPath.split(/[?#]/)[0];
    if (!pathWithoutQuery) continue;

    try {
      return decodeURIComponent(pathWithoutQuery);
    } catch {
      return pathWithoutQuery;
    }
  }

  return null;
};

const SIGNED_CHAT_ASSET_URL_TTL_MS = 55 * 60 * 1000;
const signedChatAssetUrlCache = new Map<
  string,
  { signedUrl: string; expiresAt: number }
>();

export const buildPdfPreviewStoragePath = (filePath: string) => {
  const normalizedPath = filePath.replace(/^documents\//, 'previews/');
  if (/\.[^./]+$/.test(normalizedPath)) {
    return normalizedPath.replace(/\.[^./]+$/, '.png');
  }

  return `${normalizedPath}.png`;
};

export const resolveChatMessageStoragePaths = (
  message: Pick<
    ChatMessage,
    | 'message'
    | 'message_type'
    | 'file_name'
    | 'file_mime_type'
    | 'file_preview_url'
    | 'file_storage_path'
  >
) => {
  const storagePaths = new Set<string>();
  const primaryStoragePath =
    message.file_storage_path?.trim() ||
    extractChatStoragePath(message.message);

  if (primaryStoragePath) {
    storagePaths.add(primaryStoragePath);
  }

  if (message.message_type !== 'file') {
    return [...storagePaths];
  }

  const fileExtension = resolveFileExtension(
    message.file_name ?? null,
    message.message,
    message.file_mime_type
  );
  const isPdfFile =
    fileExtension === 'pdf' ||
    message.file_mime_type?.toLowerCase().includes('pdf') === true;

  if (!isPdfFile) {
    return [...storagePaths];
  }

  const previewStoragePath = message.file_preview_url
    ? extractChatStoragePath(message.file_preview_url)
    : primaryStoragePath?.startsWith('documents/')
      ? buildPdfPreviewStoragePath(primaryStoragePath)
      : null;

  if (previewStoragePath) {
    storagePaths.add(previewStoragePath);
  }

  return [...storagePaths];
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
    const data = await chatSidebarGateway.downloadStorageFile(
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

export const resolveChatAssetUrl = async (
  url: string,
  storagePathHint?: string | null,
  expiresInSeconds = 3600
) => {
  if (isDirectChatAssetUrl(url)) {
    return url;
  }

  const storagePath = storagePathHint?.trim() || extractChatStoragePath(url);
  if (!storagePath) {
    return null;
  }

  const cachedSignedUrl = signedChatAssetUrlCache.get(storagePath);
  if (cachedSignedUrl && cachedSignedUrl.expiresAt > Date.now()) {
    return cachedSignedUrl.signedUrl;
  }

  try {
    const signedUrl = await chatSidebarGateway.createSignedStorageUrl(
      CHAT_IMAGE_BUCKET,
      storagePath,
      expiresInSeconds
    );

    signedChatAssetUrlCache.set(storagePath, {
      signedUrl,
      expiresAt: Date.now() + SIGNED_CHAT_ASSET_URL_TTL_MS,
    });

    return signedUrl;
  } catch {
    return null;
  }
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
