import type {
  ComposerPendingFileKind,
  PendingComposerAttachment,
  PendingComposerAttachmentKind,
} from '../types';

interface UpsertPendingComposerAttachmentOptions {
  maxAttachments: number;
  replaceAttachmentId?: string;
  replaceableKinds: PendingComposerAttachmentKind[];
}

interface UpsertPendingComposerAttachmentResult {
  attachments: PendingComposerAttachment[];
  exceededLimit: boolean;
  replacedPreviewUrl: string | null;
}

const buildPendingAttachmentId = (prefix: 'pending_image' | 'pending_file') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getFileTypeLabel = (file: File, fallbackLabel: string) => {
  const mimeSubtype = file.type.split('/')[1];
  const extensionFromName = file.name.split('.').pop();

  return (mimeSubtype || extensionFromName || fallbackLabel).toUpperCase();
};

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

      return {
        attachments: nextAttachments,
        exceededLimit: false,
        replacedPreviewUrl: replacedAttachment.previewUrl,
      };
    }
  }

  if (previousAttachments.length >= maxAttachments) {
    return {
      attachments: previousAttachments,
      exceededLimit: true,
      replacedPreviewUrl: null,
    };
  }

  return {
    attachments: [...previousAttachments, nextAttachment],
    exceededLimit: false,
    replacedPreviewUrl: null,
  };
};
