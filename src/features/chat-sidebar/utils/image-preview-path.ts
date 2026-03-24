const IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX = '.fit-v2';

const getPreviewExtension = (mimeType: string) => {
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
  const extension = getPreviewExtension(mimeType);

  if (/\.[^./]+$/.test(normalizedPath)) {
    return normalizedPath.replace(
      /\.[^./]+$/,
      `${IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX}.${extension}`
    );
  }

  return `${normalizedPath}${IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX}.${extension}`;
};

export const isAspectPreservingImagePreviewPath = (
  filePreviewPath?: string | null
) => filePreviewPath?.includes(IMAGE_PREVIEW_ASPECT_VERSION_SUFFIX) ?? false;
