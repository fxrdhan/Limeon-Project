import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import {
  CHAT_PDF_COMPRESS_DEFAULT_LEVEL,
  type ChatPdfCompressionLevel,
} from '../../../../../shared/chatFunctionContracts';
import { useMemo } from 'react';
import {
  TbEye,
  TbCheckbox,
  TbFileIsr,
  TbFileMinus,
  TbPhotoEdit,
  TbPhotoMinus,
  TbTrash,
} from 'react-icons/tb';
import type { PendingComposerAttachment } from '../../types';
import { resolveComposerAttachmentExtension } from '../../utils/composer-attachment';

interface UseComposerAttachmentActionsProps {
  openImageActionsAttachment?: PendingComposerAttachment;
  closeImageActionsMenu: () => void;
  closePdfCompressionMenu: () => void;
  openPdfCompressionMenu: (targetButton: HTMLButtonElement) => void;
  onAttachImageClick: (replaceAttachmentId?: string) => void;
  onAttachDocumentClick: (replaceAttachmentId?: string) => void;
  onCompressPendingComposerImage: (attachmentId: string) => Promise<boolean>;
  onCompressPendingComposerPdf: (
    attachmentId: string,
    compressionLevel?: ChatPdfCompressionLevel
  ) => Promise<boolean>;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onOpenComposerImagePreview: (attachmentId: string) => void;
  openDocumentAttachmentInPortal: (
    attachment: PendingComposerAttachment
  ) => void;
  handleToggleComposerAttachmentSelection: (attachmentId: string) => void;
}

export const useComposerAttachmentActions = ({
  openImageActionsAttachment,
  closeImageActionsMenu,
  closePdfCompressionMenu,
  openPdfCompressionMenu,
  onAttachImageClick,
  onAttachDocumentClick,
  onCompressPendingComposerImage,
  onCompressPendingComposerPdf,
  onRemovePendingComposerAttachment,
  onOpenComposerImagePreview,
  openDocumentAttachmentInPortal,
  handleToggleComposerAttachmentSelection,
}: UseComposerAttachmentActionsProps) => {
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
    handleToggleComposerAttachmentSelection,
    onAttachDocumentClick,
    onAttachImageClick,
    onCompressPendingComposerImage,
    onOpenComposerImagePreview,
    onRemovePendingComposerAttachment,
    openDocumentAttachmentInPortal,
    openImageActionsAttachment,
    openPdfCompressionMenu,
  ]);

  return {
    imageActions,
    pdfCompressionLevelActions,
  };
};
