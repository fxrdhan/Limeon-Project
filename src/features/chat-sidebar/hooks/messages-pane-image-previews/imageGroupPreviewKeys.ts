export const IMAGE_GROUP_THUMBNAIL_PREFETCH_CONCURRENCY = 4;

export const buildImageGroupPreviewLoadKey = (
  messageId: string,
  variant: 'thumbnail' | 'full'
) => `${messageId}::${variant}`;
