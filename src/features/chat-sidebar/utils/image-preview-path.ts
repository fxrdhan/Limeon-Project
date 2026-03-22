const getPreviewExtension = (mimeType: string) =>
  mimeType === 'image/webp' ? 'webp' : 'jpg';

export const buildImagePreviewStoragePath = (
  filePath: string,
  mimeType = 'image/webp'
) => {
  const normalizedPath = filePath.replace(/^(images|documents)\//, 'previews/');
  const extension = getPreviewExtension(mimeType);

  if (/\.[^./]+$/.test(normalizedPath)) {
    return normalizedPath.replace(/\.[^./]+$/, `.${extension}`);
  }

  return `${normalizedPath}.${extension}`;
};
