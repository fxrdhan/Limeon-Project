import { useCallback, useEffect, useRef, useState } from 'react';
import { COMPOSER_IMAGE_PREVIEW_EXIT_DURATION } from '../constants';
import type { PendingComposerAttachment } from '../types';
import { isImagePreviewableComposerAttachment } from '../utils/composer-attachment';

interface UseComposerAttachmentPreviewStateProps {
  closeAttachModal: () => void;
  closeMessageMenu: () => void;
  pendingComposerAttachments: PendingComposerAttachment[];
  resetKey?: string | null;
}

export const useComposerAttachmentPreviewState = ({
  closeAttachModal,
  closeMessageMenu,
  pendingComposerAttachments,
  resetKey,
}: UseComposerAttachmentPreviewStateProps) => {
  const [
    composerImagePreviewAttachmentId,
    setComposerImagePreviewAttachmentId,
  ] = useState<string | null>(null);
  const [isComposerImageExpanded, setIsComposerImageExpanded] = useState(false);
  const [isComposerImageExpandedVisible, setIsComposerImageExpandedVisible] =
    useState(false);
  const [composerImageExpandedUrl, setComposerImageExpandedUrl] = useState<
    string | null
  >(null);
  const composerImagePreviewOpenFrameRef = useRef<number | null>(null);
  const composerImagePreviewCloseTimerRef = useRef<number | null>(null);
  const composerImageExpandedUrlRef = useRef<string | null>(null);

  const previewComposerImageAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === composerImagePreviewAttachmentId &&
      isImagePreviewableComposerAttachment(attachment)
  );

  const resetComposerImageExpandedUrl = useCallback(() => {
    if (composerImageExpandedUrlRef.current) {
      URL.revokeObjectURL(composerImageExpandedUrlRef.current);
      composerImageExpandedUrlRef.current = null;
    }

    setComposerImageExpandedUrl(null);
  }, []);

  const cancelComposerImagePreviewOpenFrame = useCallback(() => {
    if (composerImagePreviewOpenFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(composerImagePreviewOpenFrameRef.current);
    composerImagePreviewOpenFrameRef.current = null;
  }, []);

  const resetComposerImagePreviewState = useCallback(() => {
    cancelComposerImagePreviewOpenFrame();
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }

    setIsComposerImageExpandedVisible(false);
    setIsComposerImageExpanded(false);
    setComposerImagePreviewAttachmentId(null);
    resetComposerImageExpandedUrl();
  }, [cancelComposerImagePreviewOpenFrame, resetComposerImageExpandedUrl]);

  useEffect(() => {
    if (previewComposerImageAttachment || !isComposerImageExpanded) {
      return;
    }

    resetComposerImagePreviewState();
  }, [
    isComposerImageExpanded,
    previewComposerImageAttachment,
    resetComposerImagePreviewState,
  ]);

  useEffect(() => {
    if (!isComposerImageExpanded) {
      return;
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      cancelComposerImagePreviewOpenFrame();
      setIsComposerImageExpandedVisible(false);
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }

      composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
        setIsComposerImageExpanded(false);
        setComposerImagePreviewAttachmentId(null);
        resetComposerImageExpandedUrl();
        composerImagePreviewCloseTimerRef.current = null;
      }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [
    cancelComposerImagePreviewOpenFrame,
    isComposerImageExpanded,
    resetComposerImageExpandedUrl,
  ]);

  useEffect(() => {
    resetComposerImagePreviewState();
  }, [resetComposerImagePreviewState, resetKey]);

  useEffect(() => {
    return () => {
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }

      cancelComposerImagePreviewOpenFrame();
      resetComposerImageExpandedUrl();
    };
  }, [cancelComposerImagePreviewOpenFrame, resetComposerImageExpandedUrl]);

  const closeComposerImagePreview = useCallback(() => {
    cancelComposerImagePreviewOpenFrame();
    setIsComposerImageExpandedVisible(false);
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }

    composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setIsComposerImageExpanded(false);
      setComposerImagePreviewAttachmentId(null);
      resetComposerImageExpandedUrl();
      composerImagePreviewCloseTimerRef.current = null;
    }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
  }, [cancelComposerImagePreviewOpenFrame, resetComposerImageExpandedUrl]);

  const openComposerImagePreview = useCallback(
    (attachmentId: string) => {
      const targetAttachment = pendingComposerAttachments.find(
        attachment =>
          attachment.id === attachmentId &&
          isImagePreviewableComposerAttachment(attachment)
      );
      if (!targetAttachment) {
        return;
      }

      closeAttachModal();
      closeMessageMenu();
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }

      cancelComposerImagePreviewOpenFrame();
      resetComposerImageExpandedUrl();
      const originalImageUrl = URL.createObjectURL(targetAttachment.file);
      composerImageExpandedUrlRef.current = originalImageUrl;
      setComposerImageExpandedUrl(originalImageUrl);
      setComposerImagePreviewAttachmentId(attachmentId);
      setIsComposerImageExpanded(true);
      const frameId = window.requestAnimationFrame(() => {
        if (composerImagePreviewOpenFrameRef.current !== frameId) {
          return;
        }

        composerImagePreviewOpenFrameRef.current = null;
        setIsComposerImageExpandedVisible(true);
      });
      composerImagePreviewOpenFrameRef.current = frameId;
    },
    [
      cancelComposerImagePreviewOpenFrame,
      closeAttachModal,
      closeMessageMenu,
      pendingComposerAttachments,
      resetComposerImageExpandedUrl,
    ]
  );

  return {
    previewComposerImageAttachment,
    composerImageExpandedUrl,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    openComposerImagePreview,
    closeComposerImagePreview,
    resetComposerImagePreviewState,
  };
};
