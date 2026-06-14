import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerFile } from '../types';
import {
  buildFailedAttachmentPreviewFields,
  type AttachmentPreviewMessageFields,
  type PreparedPdfPreviewPersistence,
} from '../utils/attachment-preview-persistence';

export const getFileAttachmentSendFailureToast = (
  fileKind: PendingComposerFile['fileKind']
) => (fileKind === 'audio' ? 'Gagal mengirim audio' : 'Gagal mengirim dokumen');

export const buildFileAttachmentMetadata = (
  pendingFile: PendingComposerFile,
  filePath: string
) => ({
  file_name: pendingFile.fileName,
  file_kind: pendingFile.fileKind,
  file_mime_type: pendingFile.mimeType,
  file_size: pendingFile.file.size,
  file_storage_path: filePath,
});

export const buildInitialFilePreviewFields = ({
  shouldPersistImagePreview,
  shouldPersistPdfPreview,
}: {
  shouldPersistImagePreview: boolean;
  shouldPersistPdfPreview: boolean;
}): AttachmentPreviewMessageFields | null => {
  if (!shouldPersistImagePreview && !shouldPersistPdfPreview) {
    return null;
  }

  return buildFailedAttachmentPreviewFields(
    shouldPersistImagePreview
      ? 'Thumbnail gambar tidak tersedia'
      : 'Preview dokumen tidak tersedia'
  );
};

export const resolvePendingFileWithPreparedPdfPreview = (
  pendingFile: PendingComposerFile,
  preparedPdfPreview: Pick<
    PreparedPdfPreviewPersistence,
    'coverDataUrl' | 'pageCount'
  > | null
) =>
  preparedPdfPreview && (!pendingFile.pdfCoverUrl || !pendingFile.pdfPageCount)
    ? {
        ...pendingFile,
        pdfCoverUrl: pendingFile.pdfCoverUrl ?? preparedPdfPreview.coverDataUrl,
        pdfPageCount: pendingFile.pdfPageCount ?? preparedPdfPreview.pageCount,
      }
    : pendingFile;

export const buildFilePreviewSyncMessage = ({
  realMessage,
  pendingFile,
  filePath,
  senderId,
}: {
  realMessage: ChatMessage;
  pendingFile: PendingComposerFile;
  filePath: string;
  senderId: string;
}) => ({
  ...realMessage,
  sender_id: senderId,
  file_name: pendingFile.fileName,
  file_mime_type: pendingFile.mimeType,
  file_storage_path: realMessage.file_storage_path || filePath,
});
