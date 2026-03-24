import { useCallback, useEffect, useRef, useState } from 'react';
import { COMPOSER_IMAGE_PREVIEW_EXIT_DURATION } from '../constants';
import type { PendingComposerAttachment } from '../types';

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
  const composerImagePreviewCloseTimerRef = useRef<number | null>(null);

  const previewComposerImageAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === composerImagePreviewAttachmentId &&
      attachment.fileKind === 'image'
  );

  const resetComposerImagePreviewState = useCallback(() => {
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }

    setIsComposerImageExpandedVisible(false);
    setIsComposerImageExpanded(false);
    setComposerImagePreviewAttachmentId(null);
  }, []);

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

      setIsComposerImageExpandedVisible(false);
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }

      composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
        setIsComposerImageExpanded(false);
        setComposerImagePreviewAttachmentId(null);
        composerImagePreviewCloseTimerRef.current = null;
      }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isComposerImageExpanded]);

  useEffect(() => {
    resetComposerImagePreviewState();
  }, [resetComposerImagePreviewState, resetKey]);

  useEffect(() => {
    return () => {
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
    };
  }, []);

  const closeComposerImagePreview = useCallback(() => {
    setIsComposerImageExpandedVisible(false);
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }

    composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setIsComposerImageExpanded(false);
      setComposerImagePreviewAttachmentId(null);
      composerImagePreviewCloseTimerRef.current = null;
    }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
  }, []);

  const openComposerImagePreview = useCallback(
    (attachmentId: string) => {
      const targetAttachment = pendingComposerAttachments.find(
        attachment =>
          attachment.id === attachmentId && attachment.fileKind === 'image'
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

      setComposerImagePreviewAttachmentId(attachmentId);
      setIsComposerImageExpanded(true);
      window.requestAnimationFrame(() => {
        setIsComposerImageExpandedVisible(true);
      });
    },
    [closeAttachModal, closeMessageMenu, pendingComposerAttachments]
  );

  return {
    previewComposerImageAttachment,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    openComposerImagePreview,
    closeComposerImagePreview,
    resetComposerImagePreviewState,
  };
};
