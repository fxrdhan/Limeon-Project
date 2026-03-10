export interface ChatStoragePathRecord {
  message: string;
  message_type: string | null;
  file_name?: string | null;
  file_mime_type?: string | null;
  file_preview_url?: string | null;
  file_storage_path?: string | null;
}

export interface ChatCleanupMessageRecord extends ChatStoragePathRecord {
  id: string;
  sender_id: string;
}

const CHAT_STORAGE_PATH_PATTERNS = [
  '/storage/v1/object/public/chat/',
  '/storage/v1/object/sign/chat/',
  '/storage/v1/object/authenticated/chat/',
];

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

export const extractChatStoragePath = (url: string): string | null => {
  for (const pattern of CHAT_STORAGE_PATH_PATTERNS) {
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
  message: ChatStoragePathRecord
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

export const isOwnedChatPath = (storagePath: string, userId: string) => {
  const fileName = storagePath.split('/')[2] ?? '';
  return fileName.startsWith(`${userId}_`);
};
