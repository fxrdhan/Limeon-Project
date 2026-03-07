import { CHAT_IMAGE_BUCKET } from '../constants';
import { chatSidebarGateway } from '../data/chatSidebarGateway';
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

export const fetchPdfBlobWithFallback = async (
  url: string,
  storagePathHint?: string | null
): Promise<Blob | null> => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const responseBlob = await response.blob();
      return responseBlob.type === 'application/pdf'
        ? responseBlob
        : new Blob([responseBlob], { type: 'application/pdf' });
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

    return data.type === 'application/pdf'
      ? data
      : new Blob([data], { type: 'application/pdf' });
  } catch {
    return null;
  }
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
  mimeType?: string
) =>
  IMAGE_FILE_EXTENSIONS.has(extension) ||
  mimeType?.toLowerCase().startsWith('image/') === true;
