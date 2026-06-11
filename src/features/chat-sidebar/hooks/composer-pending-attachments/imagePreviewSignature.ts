import type { PendingComposerAttachment } from '../../types';

export const buildPendingImagePreviewSignature = (
  attachment: PendingComposerAttachment
) =>
  attachment.fileKind === 'image'
    ? [
        attachment.id,
        attachment.file.name,
        attachment.file.size,
        attachment.file.lastModified,
        attachment.file.type,
      ].join(':')
    : null;
