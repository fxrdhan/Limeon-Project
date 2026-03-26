export const PROFILE_PHOTO_BUCKET = 'profiles';
export const PROFILE_PHOTO_THUMBNAIL_SIZE = 96;
export const PROFILE_PHOTO_THUMBNAIL_OUTPUT_QUALITY = 0.82;

const FALLBACK_RANDOM_SEGMENT_LENGTH = 10;
const PROFILE_PHOTO_THUMBNAIL_SUFFIX = `.thumb-${PROFILE_PHOTO_THUMBNAIL_SIZE}`;

const buildFallbackRandomSegment = () =>
  Math.random()
    .toString(36)
    .slice(2, 2 + FALLBACK_RANDOM_SEGMENT_LENGTH)
    .padEnd(FALLBACK_RANDOM_SEGMENT_LENGTH, '0');

const createProfilePhotoUploadId = () => {
  const rawId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${buildFallbackRandomSegment()}`;

  return rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
};

const sanitizePathExtension = (
  fileName?: string | null,
  mimeType?: string | null,
  fallbackExtension = 'jpg'
) => {
  const extensionFromName = fileName?.split('.').pop()?.toLowerCase();
  const extensionFromType = mimeType?.split('/')[1]?.toLowerCase();
  const rawExtension =
    extensionFromName || extensionFromType || fallbackExtension;

  return rawExtension.replace(/[^a-z0-9]/g, '') || fallbackExtension;
};

const getImageExtensionFromMimeType = (mimeType = 'image/webp') => {
  if (mimeType === 'image/webp') {
    return 'webp';
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  return 'jpg';
};

export const buildProfilePhotoStoragePath = ({
  userId,
  fileName,
  mimeType,
}: {
  userId: string;
  fileName?: string | null;
  mimeType?: string | null;
}) => {
  const extension = sanitizePathExtension(fileName, mimeType, 'jpg');

  return `${userId}/image_${createProfilePhotoUploadId()}.${extension}`;
};

export const buildProfilePhotoThumbnailStoragePath = (
  filePath: string,
  mimeType = 'image/webp'
) => {
  const extension = getImageExtensionFromMimeType(mimeType);

  if (/\.[^./]+$/.test(filePath)) {
    return filePath.replace(
      /\.[^./]+$/,
      `${PROFILE_PHOTO_THUMBNAIL_SUFFIX}.${extension}`
    );
  }

  return `${filePath}${PROFILE_PHOTO_THUMBNAIL_SUFFIX}.${extension}`;
};
