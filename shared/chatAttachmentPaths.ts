export type ChatAttachmentFileKind = 'audio' | 'document';

export const CHAT_IMAGE_FOLDER = 'images';
export const CHAT_AUDIO_FOLDER = 'audio';
export const CHAT_DOCUMENT_FOLDER = 'documents';

const FALLBACK_RANDOM_SEGMENT_LENGTH = 10;
const IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX = '.fit-v2';

const buildFallbackRandomSegment = () =>
  Math.random()
    .toString(36)
    .slice(2, 2 + FALLBACK_RANDOM_SEGMENT_LENGTH)
    .padEnd(FALLBACK_RANDOM_SEGMENT_LENGTH, '0');

const createChatAttachmentUploadId = (prefix: string) => {
  const rawId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${buildFallbackRandomSegment()}`;

  return `${prefix}_${rawId}`;
};

const sanitizePathExtension = (
  fileName?: string | null,
  mimeType?: string | null,
  fallbackExtension = 'bin'
) => {
  const extensionFromName = fileName?.split('.').pop()?.toLowerCase();
  const extensionFromType = mimeType?.split('/')[1]?.toLowerCase();
  const rawExtension =
    extensionFromName || extensionFromType || fallbackExtension;

  return rawExtension.replace(/[^a-z0-9]/g, '') || fallbackExtension;
};

const sanitizeChannelId = (channelId: string) =>
  channelId.replace(/[^a-zA-Z0-9_-]/g, '_');

export const buildChatImageStoragePath = ({
  channelId,
  senderId,
  fileName,
  mimeType,
}: {
  channelId: string;
  senderId: string;
  fileName?: string | null;
  mimeType?: string | null;
}) => {
  const safeExtension = sanitizePathExtension(fileName, mimeType, 'jpg');

  return `${CHAT_IMAGE_FOLDER}/${sanitizeChannelId(channelId)}/${senderId}_${createChatAttachmentUploadId('image')}.${safeExtension}`;
};

export const buildChatFileStoragePath = ({
  channelId,
  senderId,
  fileName,
  mimeType,
  fileKind,
}: {
  channelId: string;
  senderId: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileKind: ChatAttachmentFileKind;
}) => {
  const safeExtension = sanitizePathExtension(fileName, mimeType, 'bin');
  const baseFolder =
    fileKind === 'audio' ? CHAT_AUDIO_FOLDER : CHAT_DOCUMENT_FOLDER;

  return `${baseFolder}/${sanitizeChannelId(channelId)}/${senderId}_${createChatAttachmentUploadId(fileKind)}.${safeExtension}`;
};

const getImagePreviewExtension = (mimeType: string) => {
  if (mimeType === 'image/webp') {
    return 'webp';
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  return 'jpg';
};

export const buildImagePreviewStoragePath = (
  filePath: string,
  mimeType = 'image/webp'
) => {
  const normalizedPath = filePath.replace(/^(images|documents)\//, 'previews/');
  const extension = getImagePreviewExtension(mimeType);

  if (/\.[^./]+$/.test(normalizedPath)) {
    return normalizedPath.replace(
      /\.[^./]+$/,
      `${IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX}.${extension}`
    );
  }

  return `${normalizedPath}${IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX}.${extension}`;
};

export const inferPreviewMimeTypeFromStoragePath = (
  storagePath?: string | null
) => {
  const normalizedPath = storagePath?.trim().toLowerCase() || '';
  if (normalizedPath.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedPath.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
};

export const isAspectPreservingImagePreviewPath = (
  filePreviewPath?: string | null
) => filePreviewPath?.includes(IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX) ?? false;
