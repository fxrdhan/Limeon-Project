import type { PendingComposerAttachment } from '../types';

const IMAGE_COMPOSER_ATTACHMENT_EXTENSIONS = new Set([
  'apng',
  'avif',
  'bmp',
  'gif',
  'heic',
  'heif',
  'jpg',
  'jpeg',
  'png',
  'svg',
  'webp',
]);

export const resolveComposerAttachmentExtension = (
  attachment: PendingComposerAttachment
) => {
  const extensionFromName = attachment.fileName
    .split(/[?#]/)[0]
    .split('.')
    .pop()
    ?.trim()
    .toLowerCase();
  if (extensionFromName) return extensionFromName;

  const mimeSubtype = attachment.mimeType
    .split('/')[1]
    ?.split('+')[0]
    ?.trim()
    .toLowerCase();
  if (!mimeSubtype) return '';
  if (mimeSubtype === 'jpeg') return 'jpg';
  return mimeSubtype;
};

export const isImagePreviewableComposerAttachment = (
  attachment: PendingComposerAttachment
) =>
  attachment.fileKind === 'image' ||
  attachment.mimeType.toLowerCase().startsWith('image/') ||
  IMAGE_COMPOSER_ATTACHMENT_EXTENSIONS.has(
    resolveComposerAttachmentExtension(attachment)
  );
