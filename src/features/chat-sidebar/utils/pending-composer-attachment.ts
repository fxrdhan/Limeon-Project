import type {
  ComposerPendingFileKind,
  PendingComposerAttachment,
  PendingComposerAttachmentKind,
} from '../types';
import { resolveFileExtension } from '../../../../shared/chatStoragePaths';

interface UpsertPendingComposerAttachmentOptions {
  maxAttachments: number;
  maxTotalBytes: number;
  replaceAttachmentId?: string;
  replaceableKinds: PendingComposerAttachmentKind[];
}

interface UpsertPendingComposerAttachmentResult {
  attachments: PendingComposerAttachment[];
  exceededLimit: boolean;
  exceededSizeLimit: boolean;
  replacedPreviewUrl: string | null;
  rejectedPreviewUrl: string | null;
}

const buildPendingAttachmentId = (prefix: 'pending_image' | 'pending_file') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getFileTypeLabel = (file: File, fallbackLabel: string) => {
  const resolvedExtension = resolveFileExtension(
    file.name || null,
    null,
    file.type
  );

  return (resolvedExtension || fallbackLabel).toUpperCase();
};

const getPendingComposerAttachmentTotalBytes = (
  attachments: PendingComposerAttachment[]
) =>
  attachments.reduce((totalSize, attachment) => {
    if (!(attachment.file instanceof Blob)) {
      return totalSize;
    }

    return totalSize + attachment.file.size;
  }, 0);

export const isPdfComposerAttachment = (
  attachment: Pick<
    PendingComposerAttachment,
    'fileKind' | 'mimeType' | 'fileName'
  >
) =>
  attachment.fileKind === 'document' &&
  (attachment.mimeType === 'application/pdf' ||
    attachment.fileName.toLowerCase().endsWith('.pdf'));

export const buildPendingImageComposerAttachment = (
  file: File
): PendingComposerAttachment => ({
  id: buildPendingAttachmentId('pending_image'),
  file,
  previewUrl: URL.createObjectURL(file),
  fileName: file.name || 'Gambar',
  fileTypeLabel: getFileTypeLabel(file, 'image'),
  fileKind: 'image',
  mimeType: file.type,
  pdfCoverUrl: null,
  pdfPageCount: null,
});

export const buildPendingFileComposerAttachment = (
  file: File,
  fileKind: ComposerPendingFileKind
): PendingComposerAttachment => ({
  id: buildPendingAttachmentId('pending_file'),
  file,
  fileName: file.name || (fileKind === 'audio' ? 'Audio' : 'Dokumen'),
  fileTypeLabel: getFileTypeLabel(
    file,
    fileKind === 'audio' ? 'audio' : 'document'
  ),
  fileKind,
  mimeType: file.type,
  previewUrl: null,
  pdfCoverUrl: null,
  pdfPageCount: null,
});

export const upsertPendingComposerAttachment = (
  previousAttachments: PendingComposerAttachment[],
  nextAttachment: PendingComposerAttachment,
  {
    maxAttachments,
    maxTotalBytes,
    replaceAttachmentId,
    replaceableKinds,
  }: UpsertPendingComposerAttachmentOptions
): UpsertPendingComposerAttachmentResult => {
  if (replaceAttachmentId) {
    const replaceIndex = previousAttachments.findIndex(
      attachment =>
        attachment.id === replaceAttachmentId &&
        replaceableKinds.includes(attachment.fileKind)
    );

    if (replaceIndex !== -1) {
      const replacedAttachment = previousAttachments[replaceIndex];
      const nextAttachments = [...previousAttachments];
      nextAttachments[replaceIndex] = nextAttachment;
      const nextTotalBytes =
        getPendingComposerAttachmentTotalBytes(nextAttachments);

      if (nextTotalBytes > maxTotalBytes) {
        return {
          attachments: previousAttachments,
          exceededLimit: false,
          exceededSizeLimit: true,
          replacedPreviewUrl: null,
          rejectedPreviewUrl: nextAttachment.previewUrl,
        };
      }

      return {
        attachments: nextAttachments,
        exceededLimit: false,
        exceededSizeLimit: false,
        replacedPreviewUrl: replacedAttachment.previewUrl,
        rejectedPreviewUrl: null,
      };
    }
  }

  if (previousAttachments.length >= maxAttachments) {
    return {
      attachments: previousAttachments,
      exceededLimit: true,
      exceededSizeLimit: false,
      replacedPreviewUrl: null,
      rejectedPreviewUrl: nextAttachment.previewUrl,
    };
  }

  const nextAttachments = [...previousAttachments, nextAttachment];
  const nextTotalBytes =
    getPendingComposerAttachmentTotalBytes(nextAttachments);

  if (nextTotalBytes > maxTotalBytes) {
    return {
      attachments: previousAttachments,
      exceededLimit: false,
      exceededSizeLimit: true,
      replacedPreviewUrl: null,
      rejectedPreviewUrl: nextAttachment.previewUrl,
    };
  }

  return {
    attachments: nextAttachments,
    exceededLimit: false,
    exceededSizeLimit: false,
    replacedPreviewUrl: null,
    rejectedPreviewUrl: null,
  };
};
