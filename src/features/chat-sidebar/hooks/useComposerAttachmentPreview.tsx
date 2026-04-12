import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import {
  CHAT_PDF_COMPRESS_DEFAULT_LEVEL,
  type ChatPdfCompressionLevel,
} from '../../../../shared/chatFunctionContracts';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TbEye,
  TbCheckbox,
  TbFileIsr,
  TbFileMinus,
  TbPhotoEdit,
  TbPhotoMinus,
  TbTrash,
} from 'react-icons/tb';
import type { PendingComposerAttachment } from '../types';
import {
  isImagePreviewableComposerAttachment,
  resolveComposerAttachmentExtension,
} from '../utils/composer-attachment';
import { useDocumentPreviewPortal } from './useDocumentPreviewPortal';

const IMAGE_ACTIONS_MENU_SIDE_GAP = 6;
const IMAGE_ACTIONS_MENU_VIEWPORT_PADDING = 8;
const IMAGE_ACTIONS_MENU_FALLBACK_WIDTH = 148;
const IMAGE_ACTIONS_MENU_FALLBACK_HEIGHT = 128;
const PDF_COMPRESSION_LEVELS_MENU_SIDE_GAP = 6;
const PDF_COMPRESSION_LEVELS_MENU_FALLBACK_WIDTH = 168;
const PDF_COMPRESSION_LEVELS_MENU_FALLBACK_HEIGHT = 180;
const COMPOSER_ATTACHMENT_ACTION_TRIGGER_SELECTOR =
  '[data-chat-composer-attachment-action-trigger="true"]';

interface UseComposerAttachmentPreviewProps {
  pendingComposerAttachments: PendingComposerAttachment[];
  onOpenImageActionsMenu: () => void;
  onAttachImageClick: (replaceAttachmentId?: string) => void;
  onAttachDocumentClick: (replaceAttachmentId?: string) => void;
  onCompressPendingComposerImage: (attachmentId: string) => Promise<boolean>;
  onCompressPendingComposerPdf: (
    attachmentId: string,
    compressionLevel?: ChatPdfCompressionLevel
  ) => Promise<boolean>;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onOpenComposerImagePreview: (attachmentId: string) => void;
}

export const useComposerAttachmentPreview = ({
  pendingComposerAttachments,
  onOpenImageActionsMenu,
  onAttachImageClick,
  onAttachDocumentClick,
  onCompressPendingComposerImage,
  onCompressPendingComposerPdf,
  onRemovePendingComposerAttachment,
  onOpenComposerImagePreview,
}: UseComposerAttachmentPreviewProps) => {
  const [openImageActionsAttachmentId, setOpenImageActionsAttachmentId] =
    useState<string | null>(null);
  const [
    isAttachmentMenuRepositionPaused,
    setIsAttachmentMenuRepositionPaused,
  ] = useState(false);
  const [imageActionsMenuPosition, setImageActionsMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [pdfCompressionMenuPosition, setPdfCompressionMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const imageActionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const pdfCompressionMenuRef = useRef<HTMLDivElement | null>(null);
  const pdfCompressionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [
    isComposerAttachmentSelectionMode,
    setIsComposerAttachmentSelectionMode,
  ] = useState(false);
  const [selectedComposerAttachmentIds, setSelectedComposerAttachmentIds] =
    useState<string[]>([]);
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
    setPdfCompressionMenuPosition(null);
    pdfCompressionMenuAnchorRef.current = null;
  }, []);

  const getPdfCompressionMenuPosition = useCallback(
    (targetButton: HTMLButtonElement) => {
      const triggerRect = targetButton.getBoundingClientRect();
      const renderedMenuRect =
        pdfCompressionMenuRef.current?.getBoundingClientRect();
      const menuWidth = Math.ceil(
        renderedMenuRect?.width ?? PDF_COMPRESSION_LEVELS_MENU_FALLBACK_WIDTH
      );
      const menuHeight = Math.ceil(
        renderedMenuRect?.height ?? PDF_COMPRESSION_LEVELS_MENU_FALLBACK_HEIGHT
      );
      const maxLeft = Math.max(
        IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
        window.innerWidth - menuWidth - IMAGE_ACTIONS_MENU_VIEWPORT_PADDING
      );
      const preferredLeft =
        triggerRect.left - menuWidth - PDF_COMPRESSION_LEVELS_MENU_SIDE_GAP;
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

  const closePdfCompressionMenu = useCallback(() => {
    setPdfCompressionMenuPosition(null);
    pdfCompressionMenuAnchorRef.current = null;
  }, []);

  const selectableComposerAttachmentIds = useMemo(
    () =>
      pendingComposerAttachments
        .filter(
          attachment =>
            attachment.fileKind === 'image' ||
            attachment.fileKind === 'document'
        )
        .map(attachment => attachment.id),
    [pendingComposerAttachments]
  );

  useEffect(() => {
    setSelectedComposerAttachmentIds(previousIds => {
      const nextIds = previousIds.filter(id =>
        selectableComposerAttachmentIds.includes(id)
      );
      const hasChanged =
        nextIds.length !== previousIds.length ||
        nextIds.some((id, index) => id !== previousIds[index]);

      return hasChanged ? nextIds : previousIds;
    });
  }, [selectableComposerAttachmentIds]);

  useEffect(() => {
    if (selectableComposerAttachmentIds.length === 0) {
      setIsComposerAttachmentSelectionMode(false);
      setSelectedComposerAttachmentIds([]);
    }
  }, [selectableComposerAttachmentIds.length]);

  const handleToggleComposerAttachmentSelection = useCallback(
    (attachmentId: string) => {
      if (!selectableComposerAttachmentIds.includes(attachmentId)) {
        return;
      }

      setIsComposerAttachmentSelectionMode(true);
      setSelectedComposerAttachmentIds(previousIds =>
        previousIds.includes(attachmentId)
          ? previousIds.filter(id => id !== attachmentId)
          : [...previousIds, attachmentId]
      );
    },
    [selectableComposerAttachmentIds]
  );

  const handleSelectAllComposerAttachments = useCallback(() => {
    setIsComposerAttachmentSelectionMode(true);
    setSelectedComposerAttachmentIds(selectableComposerAttachmentIds);
  }, [selectableComposerAttachmentIds]);

  const handleClearComposerAttachmentSelection = useCallback(() => {
    setIsComposerAttachmentSelectionMode(false);
    setSelectedComposerAttachmentIds([]);
  }, []);

  const handleDeleteSelectedComposerAttachments = useCallback(() => {
    if (selectedComposerAttachmentIds.length === 0) {
      return;
    }

    selectedComposerAttachmentIds.forEach(attachmentId => {
      onRemovePendingComposerAttachment(attachmentId);
    });
    closeImageActionsMenu();
    setSelectedComposerAttachmentIds([]);
  }, [
    closeImageActionsMenu,
    onRemovePendingComposerAttachment,
    selectedComposerAttachmentIds,
  ]);

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
        getPdfCompressionMenuPosition(targetButton)
      );
    },
    [
      closePdfCompressionMenu,
      getPdfCompressionMenuPosition,
      pdfCompressionMenuPosition,
    ]
  );

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
    [onOpenComposerImagePreview, openDocumentPreview]
  );

  const openImageActionsAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === openImageActionsAttachmentId &&
      (attachment.fileKind === 'image' || attachment.fileKind === 'document')
  );

  const pdfCompressionLevelActions = useMemo<PopupMenuAction[]>(() => {
    if (
      !openImageActionsAttachment ||
      openImageActionsAttachment.fileKind !== 'document'
    ) {
      return [];
    }

    return [
      {
        label: 'Extreme',
        icon: <span className="h-4 w-4" aria-hidden="true" />,
        onClick: () => {
          closeImageActionsMenu();
          void onCompressPendingComposerPdf(
            openImageActionsAttachment.id,
            'extreme'
          );
        },
      },
      {
        label: 'Recommended',
        icon: <span className="h-4 w-4" aria-hidden="true" />,
        onClick: () => {
          closeImageActionsMenu();
          void onCompressPendingComposerPdf(
            openImageActionsAttachment.id,
            CHAT_PDF_COMPRESS_DEFAULT_LEVEL
          );
        },
      },
      {
        label: 'Less',
        icon: <span className="h-4 w-4" aria-hidden="true" />,
        onClick: () => {
          closeImageActionsMenu();
          void onCompressPendingComposerPdf(
            openImageActionsAttachment.id,
            'low'
          );
        },
      },
    ];
  }, [
    closeImageActionsMenu,
    onCompressPendingComposerPdf,
    openImageActionsAttachment,
  ]);

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
            closePdfCompressionMenu();
            onOpenComposerImagePreview(openImageActionsAttachment.id);
          },
        },
        {
          label: 'Ganti',
          icon: <TbPhotoEdit className="-ml-px h-4.5 w-4.5" />,
          onClick: () => {
            closePdfCompressionMenu();
            closeImageActionsMenu();
            onAttachImageClick(openImageActionsAttachment.id);
          },
        },
        {
          label: 'Pilih',
          icon: <TbCheckbox className="h-4.5 w-4.5" />,
          onClick: () => {
            closePdfCompressionMenu();
            closeImageActionsMenu();
            handleToggleComposerAttachmentSelection(
              openImageActionsAttachment.id
            );
          },
        },
        {
          label: 'Kompres',
          icon: <TbPhotoMinus className="h-4 w-4" />,
          onClick: () => {
            closeImageActionsMenu();
            void onCompressPendingComposerImage(openImageActionsAttachment.id);
          },
        },
        {
          label: 'Hapus',
          icon: <TbTrash className="h-4 w-4" />,
          tone: 'danger',
          onClick: () => {
            closePdfCompressionMenu();
            closeImageActionsMenu();
            onRemovePendingComposerAttachment(openImageActionsAttachment.id);
          },
        },
      ];
    }

    const isPdfAttachment =
      resolveComposerAttachmentExtension(openImageActionsAttachment) ===
        'pdf' ||
      openImageActionsAttachment.mimeType.toLowerCase().includes('pdf');

    return [
      {
        label: 'Buka',
        icon: <TbEye className="h-4.5 w-4.5" />,
        onClick: () => {
          closePdfCompressionMenu();
          openDocumentAttachmentInPortal(openImageActionsAttachment);
        },
      },
      {
        label: 'Ganti',
        icon: <TbFileIsr className="h-4.5 w-4.5" />,
        onClick: () => {
          closePdfCompressionMenu();
          closeImageActionsMenu();
          onAttachDocumentClick(openImageActionsAttachment.id);
        },
      },
      {
        label: 'Pilih',
        icon: <TbCheckbox className="h-4.5 w-4.5" />,
        onClick: () => {
          closePdfCompressionMenu();
          closeImageActionsMenu();
          handleToggleComposerAttachmentSelection(
            openImageActionsAttachment.id
          );
        },
      },
      ...(isPdfAttachment
        ? [
            {
              label: 'Kompres',
              icon: <TbFileMinus className="h-4.5 w-4.5" />,
              onClick: event => {
                const currentTarget = event?.currentTarget;
                if (!(currentTarget instanceof HTMLButtonElement)) {
                  return;
                }

                openPdfCompressionMenu(currentTarget);
              },
            } satisfies PopupMenuAction,
          ]
        : []),
      {
        label: 'Hapus',
        icon: <TbTrash className="h-4 w-4" />,
        tone: 'danger',
        onClick: () => {
          closePdfCompressionMenu();
          closeImageActionsMenu();
          onRemovePendingComposerAttachment(openImageActionsAttachment.id);
        },
      },
    ];
  }, [
    closeImageActionsMenu,
    closePdfCompressionMenu,
    onCompressPendingComposerImage,
    onAttachDocumentClick,
    onAttachImageClick,
    handleToggleComposerAttachmentSelection,
    onOpenComposerImagePreview,
    onRemovePendingComposerAttachment,
    openDocumentAttachmentInPortal,
    openImageActionsAttachment,
    openPdfCompressionMenu,
  ]);

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
        (attachment.fileKind === 'image' || attachment.fileKind === 'document')
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

      setImageActionsMenuPosition(getImageActionsMenuPosition(targetButton));
      const compressionMenuAnchor = pdfCompressionMenuAnchorRef.current;
      if (compressionMenuAnchor) {
        const nextCompressionMenuPosition = getPdfCompressionMenuPosition(
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
    getPdfCompressionMenuPosition,
    getImageActionsMenuPosition,
    openImageActionsAttachmentId,
  ]);

  return {
    openImageActionsAttachmentId,
    isAttachmentMenuRepositionPaused,
    imageActionsMenuPosition,
    pdfCompressionMenuPosition,
    isComposerAttachmentSelectionMode,
    selectedComposerAttachmentIds,
    composerDocumentPreviewUrl,
    composerDocumentPreviewName,
    isComposerDocumentPreviewVisible,
    imageActionsButtonRef,
    imageActionsMenuRef,
    pdfCompressionMenuRef,
    imageActions,
    pdfCompressionLevelActions,
    closeImageActionsMenu,
    closePdfCompressionMenu,
    closeComposerDocumentPreview,
    handleClearComposerAttachmentSelection,
    handleSelectAllComposerAttachments,
    handleDeleteSelectedComposerAttachments,
    handleToggleComposerAttachmentSelection,
    setIsAttachmentMenuRepositionPaused,
    openDocumentAttachmentInPortal,
    handleToggleImageActionsMenu,
  };
};
