import type { AttachmentComposerRemoteFile } from '../utils/composer-attachment-link';
import { buildPendingFileComposerAttachment } from '../utils/pending-composer-attachment';
import type { PendingComposerAttachment } from '../types';
import type { SendableComposerAttachment } from './useChatAttachmentSend';

export const buildRemoteComposerAttachment = (
  attachmentRemoteFile: AttachmentComposerRemoteFile
): SendableComposerAttachment => {
  if (attachmentRemoteFile.fileKind === 'image') {
    return attachmentRemoteFile;
  }

  const pendingAttachment = buildPendingFileComposerAttachment(
    attachmentRemoteFile.file,
    'document'
  );

  return {
    file: pendingAttachment.file,
    fileName: pendingAttachment.fileName,
    fileTypeLabel: pendingAttachment.fileTypeLabel,
    fileKind: 'document' as const,
    mimeType: pendingAttachment.mimeType,
    pdfCoverUrl: pendingAttachment.pdfCoverUrl,
    pdfPageCount: pendingAttachment.pdfPageCount,
  };
};

export const buildPendingAttachmentSendPlan = (
  attachments: PendingComposerAttachment[],
  messageText: string
) => {
  const shouldAttachCaption =
    attachments.length > 0 && messageText.trim().length > 0;
  const lastAttachmentIndex = attachments.length - 1;

  return {
    shouldAttachCaption,
    jobs: attachments.map((attachment, attachmentIndex) => ({
      attachment,
      captionText:
        shouldAttachCaption && attachmentIndex === lastAttachmentIndex
          ? messageText
          : undefined,
    })),
  };
};

export const shouldPreappendBulkImageOptimisticBatch = (
  attachments: PendingComposerAttachment[]
) =>
  attachments.length > 1 &&
  attachments.every(attachment => attachment.fileKind === 'image');
