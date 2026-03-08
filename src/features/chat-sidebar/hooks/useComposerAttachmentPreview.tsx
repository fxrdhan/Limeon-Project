import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TbEye,
  TbFileIsr,
  TbFileShredder,
  TbPhotoEdit,
  TbPhotoMinus,
} from 'react-icons/tb';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { PendingComposerAttachment } from '../types';
import { resolveComposerAttachmentExtension } from '../utils/composer-attachment';
import { useDocumentPreviewPortal } from './useDocumentPreviewPortal';

const IMAGE_ACTIONS_MENU_SIDE_GAP = 6;
const IMAGE_ACTIONS_MENU_VIEWPORT_PADDING = 8;
const IMAGE_ACTIONS_MENU_FALLBACK_WIDTH = 148;
const IMAGE_ACTIONS_MENU_FALLBACK_HEIGHT = 92;

interface UseComposerAttachmentPreviewProps {
  pendingComposerAttachments: PendingComposerAttachment[];
  onAttachImageClick: (replaceAttachmentId?: string) => void;
  onAttachDocumentClick: (replaceAttachmentId?: string) => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onOpenComposerImagePreview: (attachmentId: string) => void;
}

export const useComposerAttachmentPreview = ({
  pendingComposerAttachments,
  onAttachImageClick,
  onAttachDocumentClick,
  onRemovePendingComposerAttachment,
  onOpenComposerImagePreview,
}: UseComposerAttachmentPreviewProps) => {
  const [openImageActionsAttachmentId, setOpenImageActionsAttachmentId] =
    useState<string | null>(null);
  const [imageActionsMenuPosition, setImageActionsMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const imageActionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const {
    previewUrl: composerDocumentPreviewUrl,
    previewName: composerDocumentPreviewName,
    isPreviewVisible: isComposerDocumentPreviewVisible,
    closeDocumentPreview: closeComposerDocumentPreview,
    openDocumentPreview,
  } = useDocumentPreviewPortal();

  const getImageActionsMenuPosition = useCallback(
    (targetButton: HTMLButtonElement) => {
      const triggerRect = targetButton.getBoundingClientRect();
      const renderedMenuRect =
        imageActionsMenuRef.current?.getBoundingClientRect();
      const menuWidth = Math.ceil(
        renderedMenuRect?.width ?? IMAGE_ACTIONS_MENU_FALLBACK_WIDTH
      );
      const menuHeight = Math.ceil(
        renderedMenuRect?.height ?? IMAGE_ACTIONS_MENU_FALLBACK_HEIGHT
      );
      const maxLeft = Math.max(
        IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
        window.innerWidth - menuWidth - IMAGE_ACTIONS_MENU_VIEWPORT_PADDING
      );
      const preferredLeft =
        triggerRect.left - menuWidth - IMAGE_ACTIONS_MENU_SIDE_GAP;
      const left = Math.min(
        Math.max(preferredLeft, IMAGE_ACTIONS_MENU_VIEWPORT_PADDING),
        maxLeft
      );
      const preferredTop =
        triggerRect.top + triggerRect.height / 2 - menuHeight / 2;
      const maxTop = Math.max(
        IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
        window.innerHeight - menuHeight - IMAGE_ACTIONS_MENU_VIEWPORT_PADDING
      );
      const top = Math.min(
        Math.max(preferredTop, IMAGE_ACTIONS_MENU_VIEWPORT_PADDING),
        maxTop
      );

      return { top, left };
    },
    []
  );

  const closeImageActionsMenu = useCallback(() => {
    setOpenImageActionsAttachmentId(null);
    setImageActionsMenuPosition(null);
  }, []);

  const openDocumentAttachmentInPortal = useCallback(
    (attachment: PendingComposerAttachment) => {
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
          URL.revokeObjectURL(nonPdfUrl);
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
    [openDocumentPreview]
  );

  const openImageActionsAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === openImageActionsAttachmentId &&
      (attachment.fileKind === 'image' || attachment.fileKind === 'document')
  );

  const imageActions = useMemo<PopupMenuAction[]>(() => {
    if (!openImageActionsAttachment) {
      return [];
    }

    if (openImageActionsAttachment.fileKind === 'image') {
      return [
        {
          label: 'Buka',
          icon: <TbEye className="h-4.5 w-4.5" />,
          onClick: () => {
            closeImageActionsMenu();
            onOpenComposerImagePreview(openImageActionsAttachment.id);
          },
        },
        {
          label: 'Ganti',
          icon: <TbPhotoEdit className="-ml-px h-4.5 w-4.5" />,
          onClick: () => {
            closeImageActionsMenu();
            onAttachImageClick(openImageActionsAttachment.id);
          },
        },
        {
          label: 'Hapus',
          icon: <TbPhotoMinus className="h-4 w-4" />,
          tone: 'danger',
          onClick: () => {
            closeImageActionsMenu();
            onRemovePendingComposerAttachment(openImageActionsAttachment.id);
          },
        },
      ];
    }

    return [
      {
        label: 'Buka',
        icon: <TbEye className="h-4.5 w-4.5" />,
        onClick: () => {
          closeImageActionsMenu();
          openDocumentAttachmentInPortal(openImageActionsAttachment);
        },
      },
      {
        label: 'Ganti',
        icon: <TbFileIsr className="h-4.5 w-4.5" />,
        onClick: () => {
          closeImageActionsMenu();
          onAttachDocumentClick(openImageActionsAttachment.id);
        },
      },
      {
        label: 'Hapus',
        icon: <TbFileShredder className="h-4 w-4" />,
        tone: 'danger',
        onClick: () => {
          closeImageActionsMenu();
          onRemovePendingComposerAttachment(openImageActionsAttachment.id);
        },
      },
    ];
  }, [
    closeImageActionsMenu,
    onAttachDocumentClick,
    onAttachImageClick,
    onOpenComposerImagePreview,
    onRemovePendingComposerAttachment,
    openDocumentAttachmentInPortal,
    openImageActionsAttachment,
  ]);

  const handleToggleImageActionsMenu = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, attachmentId: string) => {
      if (openImageActionsAttachmentId === attachmentId) {
        closeImageActionsMenu();
        return;
      }

      setOpenImageActionsAttachmentId(attachmentId);
      setImageActionsMenuPosition(
        getImageActionsMenuPosition(event.currentTarget)
      );
    },
    [
      closeImageActionsMenu,
      getImageActionsMenuPosition,
      openImageActionsAttachmentId,
    ]
  );

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;
    const isOpenTargetStillPresent = pendingComposerAttachments.some(
      attachment =>
        attachment.id === openImageActionsAttachmentId &&
        (attachment.fileKind === 'image' || attachment.fileKind === 'document')
    );
    if (!isOpenTargetStillPresent) {
      setOpenImageActionsAttachmentId(null);
    }
  }, [openImageActionsAttachmentId, pendingComposerAttachments]);

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (imageActionsMenuRef.current?.contains(target)) return;
      if (imageActionsButtonRef.current?.contains(target)) return;
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

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;

    const syncMenuPosition = () => {
      const targetButton = imageActionsButtonRef.current;
      if (!targetButton) {
        closeImageActionsMenu();
        return;
      }

      setImageActionsMenuPosition(getImageActionsMenuPosition(targetButton));
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
    getImageActionsMenuPosition,
    openImageActionsAttachmentId,
  ]);

  return {
    openImageActionsAttachmentId,
    imageActionsMenuPosition,
    composerDocumentPreviewUrl,
    composerDocumentPreviewName,
    isComposerDocumentPreviewVisible,
    imageActionsButtonRef,
    imageActionsMenuRef,
    imageActions,
    closeImageActionsMenu,
    closeComposerDocumentPreview,
    openDocumentAttachmentInPortal,
    handleToggleImageActionsMenu,
  };
};
