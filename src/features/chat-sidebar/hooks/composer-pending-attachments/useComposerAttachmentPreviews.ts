import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createImagePreviewBlob } from '../../utils/image-message-preview';
import { renderPdfPreviewDataUrl } from '../../utils/pdf-preview';
import { isPdfComposerAttachment } from '../../utils/pending-composer-attachment';
import type { PendingComposerAttachment } from '../../types';
import { buildPendingImagePreviewSignature } from './imagePreviewSignature';
import type {
  PendingComposerAttachmentsRef,
  SetPendingComposerAttachments,
} from './types';

export const useComposerAttachmentPreviews = ({
  pendingComposerAttachments,
  pendingComposerAttachmentsRef,
  setPendingComposerAttachments,
}: {
  pendingComposerAttachments: PendingComposerAttachment[];
  pendingComposerAttachmentsRef: PendingComposerAttachmentsRef;
  setPendingComposerAttachments: SetPendingComposerAttachments;
}) => {
  const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());
  const pendingImagePreviewGenerationRef = useRef<Map<string, string>>(
    new Map()
  );
  const isMountedRef = useRef(true);

  const releasePendingImagePreviewUrl = useCallback(
    (attachmentId: string, previewUrl?: string | null) => {
      const trackedPreviewUrl =
        pendingImagePreviewUrlsRef.current.get(attachmentId) || null;

      if (trackedPreviewUrl) {
        URL.revokeObjectURL(trackedPreviewUrl);
        pendingImagePreviewUrlsRef.current.delete(attachmentId);
      }

      if (previewUrl && previewUrl !== trackedPreviewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      pendingImagePreviewGenerationRef.current.delete(attachmentId);
    },
    []
  );

  useLayoutEffect(() => {
    let isCancelled = false;
    const pendingPdfAttachments = pendingComposerAttachments.filter(
      attachment =>
        attachment.pdfCoverUrl === null && isPdfComposerAttachment(attachment)
    );
    if (pendingPdfAttachments.length === 0) return;

    const renderPdfCovers = async () => {
      try {
        for (const pendingAttachment of pendingPdfAttachments) {
          if (isCancelled) return;

          const renderedPreview = await renderPdfPreviewDataUrl(
            pendingAttachment.file,
            44
          );
          if (isCancelled) return;
          if (!renderedPreview) continue;

          setPendingComposerAttachments(previousAttachments =>
            previousAttachments.map(attachment =>
              attachment.id === pendingAttachment.id
                ? {
                    ...attachment,
                    pdfCoverUrl: renderedPreview.coverDataUrl,
                    pdfPageCount: renderedPreview.pageCount,
                  }
                : attachment
            )
          );
        }
      } catch (error) {
        console.error('Error rendering PDF cover preview:', error);
      }
    };

    void renderPdfCovers();

    return () => {
      isCancelled = true;
    };
  }, [pendingComposerAttachments, setPendingComposerAttachments]);

  useEffect(() => {
    const imageAttachments = pendingComposerAttachments.filter(
      attachment => attachment.fileKind === 'image'
    );
    const activeImageAttachmentIds = new Set(
      imageAttachments.map(attachment => attachment.id)
    );

    pendingImagePreviewGenerationRef.current.forEach((_, attachmentId) => {
      if (!activeImageAttachmentIds.has(attachmentId)) {
        pendingImagePreviewGenerationRef.current.delete(attachmentId);
      }
    });

    imageAttachments.forEach(attachment => {
      const previewSignature = buildPendingImagePreviewSignature(attachment);

      if (!previewSignature) {
        return;
      }

      if (
        pendingImagePreviewGenerationRef.current.get(attachment.id) ===
        previewSignature
      ) {
        return;
      }

      pendingImagePreviewGenerationRef.current.set(
        attachment.id,
        previewSignature
      );

      void (async () => {
        const previewBlob = await createImagePreviewBlob(attachment.file);
        if (!previewBlob) {
          return;
        }

        if (
          !isMountedRef.current ||
          pendingImagePreviewGenerationRef.current.get(attachment.id) !==
            previewSignature
        ) {
          return;
        }

        const nextPreviewUrl = URL.createObjectURL(previewBlob);

        setPendingComposerAttachments(previousAttachments => {
          const targetAttachment = previousAttachments.find(
            previousAttachment =>
              previousAttachment.id === attachment.id &&
              previousAttachment.fileKind === 'image'
          );

          if (!targetAttachment) {
            URL.revokeObjectURL(nextPreviewUrl);
            return previousAttachments;
          }

          if (
            buildPendingImagePreviewSignature(targetAttachment) !==
            previewSignature
          ) {
            URL.revokeObjectURL(nextPreviewUrl);
            return previousAttachments;
          }

          if (targetAttachment.previewUrl === nextPreviewUrl) {
            return previousAttachments;
          }

          const previousPreviewUrl = targetAttachment.previewUrl;
          pendingImagePreviewUrlsRef.current.set(attachment.id, nextPreviewUrl);

          if (previousPreviewUrl) {
            URL.revokeObjectURL(previousPreviewUrl);
          }

          return previousAttachments.map(previousAttachment =>
            previousAttachment.id === attachment.id
              ? {
                  ...previousAttachment,
                  previewUrl: nextPreviewUrl,
                }
              : previousAttachment
          );
        });
      })();
    });
  }, [pendingComposerAttachments, setPendingComposerAttachments]);

  useEffect(() => {
    isMountedRef.current = true;
    const pendingImagePreviewUrls = pendingImagePreviewUrlsRef.current;
    const pendingAttachments = pendingComposerAttachmentsRef.current;
    const pendingImagePreviewGeneration =
      pendingImagePreviewGenerationRef.current;

    return () => {
      isMountedRef.current = false;
      pendingImagePreviewUrls.forEach(previewUrl => {
        URL.revokeObjectURL(previewUrl);
      });
      pendingImagePreviewUrls.clear();
      pendingImagePreviewGeneration.clear();

      pendingAttachments.forEach(attachment => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      pendingComposerAttachmentsRef.current = [];
    };
  }, [pendingComposerAttachmentsRef]);

  return {
    pendingImagePreviewUrlsRef,
    releasePendingImagePreviewUrl,
  };
};
