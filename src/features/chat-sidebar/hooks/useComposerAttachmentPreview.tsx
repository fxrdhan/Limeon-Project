import { useMemo } from 'react';
import { useComposerAttachmentActions } from './composer-attachment-preview/useComposerAttachmentActions';
import { useComposerAttachmentDocumentPreview } from './composer-attachment-preview/useComposerAttachmentDocumentPreview';
import { useComposerAttachmentMenuState } from './composer-attachment-preview/useComposerAttachmentMenuState';
import { useComposerAttachmentSelection } from './composer-attachment-preview/useComposerAttachmentSelection';
import type { UseComposerAttachmentPreviewProps } from './composer-attachment-preview/types';

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
  const {
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
  } = useComposerAttachmentMenuState({
    pendingComposerAttachments,
    onOpenImageActionsMenu,
  });

  const {
    isComposerAttachmentSelectionMode,
    selectedComposerAttachmentIds,
    handleClearComposerAttachmentSelection,
    handleSelectAllComposerAttachments,
    handleDeleteSelectedComposerAttachments,
    handleToggleComposerAttachmentSelection,
  } = useComposerAttachmentSelection({
    pendingComposerAttachments,
    closeImageActionsMenu,
    onRemovePendingComposerAttachment,
  });

  const {
    composerDocumentPreviewUrl,
    composerDocumentPreviewName,
    isComposerDocumentPreviewVisible,
    closeComposerDocumentPreview,
    openDocumentAttachmentInPortal,
  } = useComposerAttachmentDocumentPreview({
    onOpenComposerImagePreview,
  });

  const openImageActionsAttachment = useMemo(
    () =>
      pendingComposerAttachments.find(
        attachment =>
          attachment.id === openImageActionsAttachmentId &&
          (attachment.fileKind === 'image' ||
            attachment.fileKind === 'document')
      ),
    [openImageActionsAttachmentId, pendingComposerAttachments]
  );

  const { imageActions, pdfCompressionLevelActions } =
    useComposerAttachmentActions({
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
    });

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
