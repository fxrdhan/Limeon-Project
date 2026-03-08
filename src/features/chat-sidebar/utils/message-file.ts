import { CHAT_IMAGE_BUCKET } from '../constants';
import { chatSidebarGateway } from '../data/chatSidebarGateway';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ComposerPendingFileKind } from '../types';

export const resolveFileExtension = (
  fileName: string | null,
  fileUrl: string,
  mimeType?: string
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

export const formatFileSize = (sizeBytes?: number) => {
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
  forcedMimeType?: string
): Promise<Blob | null> => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const responseBlob = await response.blob();
      if (!forcedMimeType || responseBlob.type === forcedMimeType) {
        return responseBlob;
      }

      return new Blob([responseBlob], { type: forcedMimeType });
    }
  } catch {
    // Continue to storage fallback.
  }

  const storagePath = storagePathHint?.trim() || extractChatStoragePath(url);
  if (!storagePath) return null;

  try {
    const data = await chatSidebarGateway.downloadStorageFile(
      CHAT_IMAGE_BUCKET,
      storagePath
    );

    if (!forcedMimeType || data.type === forcedMimeType) {
      return data;
    }

    return new Blob([data], { type: forcedMimeType });
  } catch {
    return null;
  }
};

export const fetchPdfBlobWithFallback = (
  url: string,
  storagePathHint?: string | null
) => fetchChatFileBlobWithFallback(url, storagePathHint, 'application/pdf');

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
  mimeType?: string
) =>
  IMAGE_FILE_EXTENSIONS.has(extension) ||
  mimeType?.toLowerCase().startsWith('image/') === true;
