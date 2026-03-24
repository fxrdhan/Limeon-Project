import { buildPdfPreviewStoragePath } from '../../../../shared/chatStoragePaths';
import { createImagePreviewUploadArtifact } from './image-message-preview';
import {
  createPdfPreviewUploadArtifact,
  readBlobAsDataUrl,
} from './pdf-message-preview';

export interface PreparedImagePreviewPersistence {
  file: File;
  storagePath: string;
}

export interface PreparedPdfPreviewPersistence {
  coverDataUrl: string;
  file: File;
  pageCount: number;
  storagePath: string;
}

export interface AttachmentPreviewMessageFields {
  file_preview_error: string | null;
  file_preview_page_count: number | null;
  file_preview_status: 'failed' | 'ready';
  file_preview_url: string | null;
}

export const buildFailedAttachmentPreviewFields = (
  errorMessage: string
): AttachmentPreviewMessageFields => ({
  file_preview_url: null,
  file_preview_page_count: null,
  file_preview_status: 'failed',
  file_preview_error: errorMessage,
});

export const buildReadyImagePreviewFields = (
  storagePath: string
): AttachmentPreviewMessageFields => ({
  file_preview_url: storagePath,
  file_preview_page_count: null,
  file_preview_status: 'ready',
  file_preview_error: null,
});

export const buildReadyPdfPreviewFields = (
  storagePath: string,
  pageCount: number
): AttachmentPreviewMessageFields => ({
  file_preview_url: storagePath,
  file_preview_page_count: Math.max(1, pageCount),
  file_preview_status: 'ready',
  file_preview_error: null,
});

export const prepareImagePreviewPersistence = async (
  file: File,
  storagePath: string
): Promise<PreparedImagePreviewPersistence | null> => {
  const previewArtifact = await createImagePreviewUploadArtifact(
    file,
    storagePath
  );
  if (!previewArtifact) {
    return null;
  }

  return {
    file: previewArtifact.previewFile,
    storagePath: previewArtifact.previewStoragePath,
  };
};

export const preparePdfPreviewPersistence = async (
  file: File,
  storagePath: string
): Promise<PreparedPdfPreviewPersistence | null> => {
  const previewFileNamePrefix =
    storagePath
      .split('/')
      .pop()
      ?.replace(/\.[^./]+$/, '') || 'preview';
  const previewArtifact = await createPdfPreviewUploadArtifact(
    file,
    previewFileNamePrefix
  );
  if (!previewArtifact) {
    return null;
  }

  return {
    file: previewArtifact.previewFile,
    storagePath: buildPdfPreviewStoragePath(storagePath),
    pageCount: previewArtifact.pageCount,
    coverDataUrl: await readBlobAsDataUrl(previewArtifact.previewFile),
  };
};
