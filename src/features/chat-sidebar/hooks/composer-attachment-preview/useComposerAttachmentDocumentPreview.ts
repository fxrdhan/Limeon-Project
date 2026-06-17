import { useCallback } from 'react';
import type { PendingComposerAttachment } from '../../types';
import {
  isImagePreviewableComposerAttachment,
  resolveComposerAttachmentExtension,
} from '../../utils/composer-attachment';
import { useDocumentPreviewPortal } from '../useDocumentPreviewPortal';

interface UseComposerAttachmentDocumentPreviewProps {
  onOpenComposerImagePreview: (attachmentId: string) => void;
}

const downloadObjectUrl = (objectUrl: string, fileName: string) => {
  const downloadLink = document.createElement('a');
  downloadLink.href = objectUrl;
  downloadLink.download = fileName || 'attachment';
  downloadLink.rel = 'noopener noreferrer';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1_000);
};

export const useComposerAttachmentDocumentPreview = ({
  onOpenComposerImagePreview,
}: UseComposerAttachmentDocumentPreviewProps) => {
  const {
    previewUrl: composerDocumentPreviewUrl,
    previewName: composerDocumentPreviewName,
    isPreviewVisible: isComposerDocumentPreviewVisible,
    closeDocumentPreview: closeComposerDocumentPreview,
    openDocumentPreview,
  } = useDocumentPreviewPortal();

  const openDocumentAttachmentInPortal = useCallback(
    (attachment: PendingComposerAttachment) => {
      if (isImagePreviewableComposerAttachment(attachment)) {
        onOpenComposerImagePreview(attachment.id);
        return;
      }

      const isPdfAttachment =
        resolveComposerAttachmentExtension(attachment) === 'pdf' ||
        attachment.mimeType.toLowerCase().includes('pdf');
      if (!isPdfAttachment) {
        const nonPdfUrl = URL.createObjectURL(attachment.file);
        const openedTab = window.open(
          nonPdfUrl,
          '_blank',
          'noopener,noreferrer'
        );
        if (!openedTab) {
          downloadObjectUrl(nonPdfUrl, attachment.fileName);
          return;
        }
        window.setTimeout(() => {
          URL.revokeObjectURL(nonPdfUrl);
        }, 60_000);
        return;
      }

      void openDocumentPreview({
        previewName: attachment.fileName || 'Dokumen',
        resolvePreviewUrl: async () => {
          const openTarget =
            attachment.file.type !== 'application/pdf'
              ? new Blob([attachment.file], { type: 'application/pdf' })
              : attachment.file;
          return {
            previewUrl: URL.createObjectURL(openTarget),
            revokeOnClose: true,
          };
        },
      });
    },
    [onOpenComposerImagePreview, openDocumentPreview]
  );

  return {
    composerDocumentPreviewUrl,
    composerDocumentPreviewName,
    isComposerDocumentPreviewVisible,
    closeComposerDocumentPreview,
    openDocumentAttachmentInPortal,
  };
};
