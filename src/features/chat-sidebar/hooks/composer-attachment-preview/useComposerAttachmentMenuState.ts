import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { PendingComposerAttachment } from '../../types';
import { COMPOSER_ATTACHMENT_ACTION_TRIGGER_SELECTOR } from './constants';
import {
  getImageActionsMenuPosition,
  getPdfCompressionMenuPosition,
} from './menuGeometry';
import type { MenuPosition } from './types';

interface UseComposerAttachmentMenuStateProps {
  pendingComposerAttachments: PendingComposerAttachment[];
  onOpenImageActionsMenu: () => void;
}

const isActionMenuAttachment = (attachment: PendingComposerAttachment) =>
  attachment.fileKind === 'image' || attachment.fileKind === 'document';

export const useComposerAttachmentMenuState = ({
  pendingComposerAttachments,
  onOpenImageActionsMenu,
}: UseComposerAttachmentMenuStateProps) => {
  const [openImageActionsAttachmentId, setOpenImageActionsAttachmentId] =
    useState<string | null>(null);
  const [
    isAttachmentMenuRepositionPaused,
    setIsAttachmentMenuRepositionPaused,
  ] = useState(false);
  const [imageActionsMenuPosition, setImageActionsMenuPosition] =
    useState<MenuPosition | null>(null);
  const [pdfCompressionMenuPosition, setPdfCompressionMenuPosition] =
    useState<MenuPosition | null>(null);
  const imageActionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const pdfCompressionMenuRef = useRef<HTMLDivElement | null>(null);
  const pdfCompressionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);

  const resolveImageActionsMenuPosition = useCallback(
    (targetButton: HTMLButtonElement) =>
      getImageActionsMenuPosition(targetButton, imageActionsMenuRef.current),
    []
  );

  const resolvePdfCompressionMenuPosition = useCallback(
    (targetButton: HTMLButtonElement) =>
      getPdfCompressionMenuPosition(
        targetButton,
        pdfCompressionMenuRef.current
      ),
    []
  );

  const closeImageActionsMenu = useCallback(() => {
    setOpenImageActionsAttachmentId(null);
    setImageActionsMenuPosition(null);
    setPdfCompressionMenuPosition(null);
    pdfCompressionMenuAnchorRef.current = null;
  }, []);

  const closePdfCompressionMenu = useCallback(() => {
    setPdfCompressionMenuPosition(null);
    pdfCompressionMenuAnchorRef.current = null;
  }, []);

  const openPdfCompressionMenu = useCallback(
    (targetButton: HTMLButtonElement) => {
      const isAlreadyOpen =
        pdfCompressionMenuAnchorRef.current === targetButton;
      if (isAlreadyOpen && pdfCompressionMenuPosition) {
        closePdfCompressionMenu();
        return;
      }

      pdfCompressionMenuAnchorRef.current = targetButton;
      setPdfCompressionMenuPosition(
        resolvePdfCompressionMenuPosition(targetButton)
      );
    },
    [
      closePdfCompressionMenu,
      pdfCompressionMenuPosition,
      resolvePdfCompressionMenuPosition,
    ]
  );

  const handleToggleImageActionsMenu = useCallback(
    (attachmentId: string) => {
      if (openImageActionsAttachmentId === attachmentId) {
        closeImageActionsMenu();
        return;
      }

      onOpenImageActionsMenu();
      closePdfCompressionMenu();
      setOpenImageActionsAttachmentId(attachmentId);
      setImageActionsMenuPosition(currentPosition =>
        openImageActionsAttachmentId === null ? null : currentPosition
      );
    },
    [
      closeImageActionsMenu,
      closePdfCompressionMenu,
      onOpenImageActionsMenu,
      openImageActionsAttachmentId,
    ]
  );

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;
    const isOpenTargetStillPresent = pendingComposerAttachments.some(
      attachment =>
        attachment.id === openImageActionsAttachmentId &&
        isActionMenuAttachment(attachment)
    );
    if (!isOpenTargetStillPresent) {
      closeImageActionsMenu();
    }
  }, [
    closeImageActionsMenu,
    openImageActionsAttachmentId,
    pendingComposerAttachments,
  ]);

  useEffect(() => {
    if (openImageActionsAttachmentId) {
      return;
    }

    setIsAttachmentMenuRepositionPaused(false);
  }, [openImageActionsAttachmentId]);

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (imageActionsMenuRef.current?.contains(target)) return;
      if (pdfCompressionMenuRef.current?.contains(target)) return;
      if (imageActionsButtonRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest(COMPOSER_ATTACHMENT_ACTION_TRIGGER_SELECTOR)
      ) {
        return;
      }
      closeImageActionsMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeImageActionsMenu();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeImageActionsMenu, openImageActionsAttachmentId]);

  useLayoutEffect(() => {
    if (!openImageActionsAttachmentId) return;

    const syncMenuPosition = () => {
      const targetButton = imageActionsButtonRef.current;
      if (!targetButton) {
        closeImageActionsMenu();
        return;
      }

      setImageActionsMenuPosition(
        resolveImageActionsMenuPosition(targetButton)
      );
      const compressionMenuAnchor = pdfCompressionMenuAnchorRef.current;
      if (compressionMenuAnchor) {
        const nextCompressionMenuPosition = resolvePdfCompressionMenuPosition(
          compressionMenuAnchor
        );
        setPdfCompressionMenuPosition(currentPosition => {
          if (
            currentPosition?.top === nextCompressionMenuPosition.top &&
            currentPosition?.left === nextCompressionMenuPosition.left
          ) {
            return currentPosition;
          }

          return nextCompressionMenuPosition;
        });
      }
    };

    syncMenuPosition();
    window.addEventListener('resize', syncMenuPosition);
    window.addEventListener('scroll', syncMenuPosition, true);

    return () => {
      window.removeEventListener('resize', syncMenuPosition);
      window.removeEventListener('scroll', syncMenuPosition, true);
    };
  }, [
    closeImageActionsMenu,
    openImageActionsAttachmentId,
    resolveImageActionsMenuPosition,
    resolvePdfCompressionMenuPosition,
  ]);

  return {
    openImageActionsAttachmentId,
    isAttachmentMenuRepositionPaused,
    imageActionsMenuPosition,
    pdfCompressionMenuPosition,
    imageActionsButtonRef,
    imageActionsMenuRef,
    pdfCompressionMenuRef,
    closeImageActionsMenu,
    closePdfCompressionMenu,
    openPdfCompressionMenu,
    handleToggleImageActionsMenu,
    setIsAttachmentMenuRepositionPaused,
  };
};
