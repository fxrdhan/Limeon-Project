import type { PendingComposerAttachment } from '../types';

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
