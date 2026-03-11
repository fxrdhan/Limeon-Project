import { useMemo } from 'react';
import type { ComposerPanelModel } from '../components/ComposerPanel';

interface UseChatComposerModelProps {
  message: string;
  editingMessagePreview: string | null;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  isSendSuccessGlowVisible: boolean;
  isAttachModalOpen: boolean;
  pendingComposerAttachments: ComposerPanelModel['pendingComposerAttachments'];
  previewComposerImageAttachment: ComposerPanelModel['previewComposerImageAttachment'];
  isComposerImageExpanded: boolean;
  isComposerImageExpandedVisible: boolean;
  messageInputRef: ComposerPanelModel['messageInputRef'];
  composerContainerRef: ComposerPanelModel['composerContainerRef'];
  attachButtonRef: ComposerPanelModel['attachButtonRef'];
  attachModalRef: ComposerPanelModel['attachModalRef'];
  imageInputRef: ComposerPanelModel['imageInputRef'];
  documentInputRef: ComposerPanelModel['documentInputRef'];
  audioInputRef: ComposerPanelModel['audioInputRef'];
  openImageActionsAttachmentId: string | null;
  imageActionsMenuPosition: ComposerPanelModel['imageActionsMenuPosition'];
  composerDocumentPreviewUrl: string | null;
  composerDocumentPreviewName: string;
  isComposerDocumentPreviewVisible: boolean;
  imageActionsButtonRef: ComposerPanelModel['imageActionsButtonRef'];
  imageActionsMenuRef: ComposerPanelModel['imageActionsMenuRef'];
  imageActions: ComposerPanelModel['imageActions'];
  setMessage: (value: string) => void;
  handleKeyPress: ComposerPanelModel['onKeyDown'];
  handleComposerPaste: ComposerPanelModel['onPaste'];
  handleSendMessage: () => Promise<void>;
  handleAttachButtonClick: () => void;
  handleAttachImageClick: ComposerPanelModel['onAttachImageClick'];
  handleAttachDocumentClick: ComposerPanelModel['onAttachDocumentClick'];
  handleAttachAudioClick: () => void;
  handleImageFileChange: ComposerPanelModel['onImageFileChange'];
  handleDocumentFileChange: ComposerPanelModel['onDocumentFileChange'];
  handleAudioFileChange: ComposerPanelModel['onAudioFileChange'];
  handleCancelEditMessage: () => void;
  focusEditingTargetMessage: () => void;
  openComposerImagePreview: (attachmentId: string) => void;
  closeComposerImagePreview: () => void;
  removePendingComposerAttachment: (attachmentId: string) => void;
  queueComposerImage: (file: File, replaceAttachmentId?: string) => boolean;
  closeComposerDocumentPreview: () => void;
  openDocumentAttachmentInPortal: ComposerPanelModel['onOpenDocumentAttachmentInPortal'];
  handleToggleImageActionsMenu: ComposerPanelModel['onToggleImageActionsMenu'];
}

export const useChatComposerModel = ({
  message,
  editingMessagePreview,
  messageInputHeight,
  isMessageInputMultiline,
  isSendSuccessGlowVisible,
  isAttachModalOpen,
  pendingComposerAttachments,
  previewComposerImageAttachment,
  isComposerImageExpanded,
  isComposerImageExpandedVisible,
  messageInputRef,
  composerContainerRef,
  attachButtonRef,
  attachModalRef,
  imageInputRef,
  documentInputRef,
  audioInputRef,
  openImageActionsAttachmentId,
  imageActionsMenuPosition,
  composerDocumentPreviewUrl,
  composerDocumentPreviewName,
  isComposerDocumentPreviewVisible,
  imageActionsButtonRef,
  imageActionsMenuRef,
  imageActions,
  setMessage,
  handleKeyPress,
  handleComposerPaste,
  handleSendMessage,
  handleAttachButtonClick,
  handleAttachImageClick,
  handleAttachDocumentClick,
  handleAttachAudioClick,
  handleImageFileChange,
  handleDocumentFileChange,
  handleAudioFileChange,
  handleCancelEditMessage,
  focusEditingTargetMessage,
  openComposerImagePreview,
  closeComposerImagePreview,
  removePendingComposerAttachment,
  queueComposerImage,
  closeComposerDocumentPreview,
  openDocumentAttachmentInPortal,
  handleToggleImageActionsMenu,
}: UseChatComposerModelProps) =>
  useMemo<ComposerPanelModel>(
    () => ({
      message,
      editingMessagePreview,
      messageInputHeight,
      isMessageInputMultiline,
      isSendSuccessGlowVisible,
      isAttachModalOpen,
      pendingComposerAttachments,
      previewComposerImageAttachment,
      isComposerImageExpanded,
      isComposerImageExpandedVisible,
      messageInputRef,
      composerContainerRef,
      attachButtonRef,
      attachModalRef,
      imageInputRef,
      documentInputRef,
      audioInputRef,
      openImageActionsAttachmentId,
      imageActionsMenuPosition,
      composerDocumentPreviewUrl,
      composerDocumentPreviewName,
      isComposerDocumentPreviewVisible,
      imageActionsButtonRef,
      imageActionsMenuRef,
      imageActions,
      onMessageChange: setMessage,
      onKeyDown: handleKeyPress,
      onPaste: handleComposerPaste,
      onSendMessage: () => {
        void handleSendMessage();
      },
      onAttachButtonClick: handleAttachButtonClick,
      onAttachImageClick: handleAttachImageClick,
      onAttachDocumentClick: handleAttachDocumentClick,
      onAttachAudioClick: handleAttachAudioClick,
      onImageFileChange: handleImageFileChange,
      onDocumentFileChange: handleDocumentFileChange,
      onAudioFileChange: handleAudioFileChange,
      onCancelEditMessage: handleCancelEditMessage,
      onFocusEditingTargetMessage: focusEditingTargetMessage,
      onOpenComposerImagePreview: openComposerImagePreview,
      onCloseComposerImagePreview: closeComposerImagePreview,
      onRemovePendingComposerAttachment: removePendingComposerAttachment,
      onQueueComposerImage: queueComposerImage,
      onCloseComposerDocumentPreview: closeComposerDocumentPreview,
      onOpenDocumentAttachmentInPortal: openDocumentAttachmentInPortal,
      onToggleImageActionsMenu: handleToggleImageActionsMenu,
    }),
    [
      attachButtonRef,
      attachModalRef,
      audioInputRef,
      closeComposerDocumentPreview,
      closeComposerImagePreview,
      composerContainerRef,
      composerDocumentPreviewName,
      composerDocumentPreviewUrl,
      documentInputRef,
      editingMessagePreview,
      focusEditingTargetMessage,
      handleAttachAudioClick,
      handleAttachButtonClick,
      handleAttachDocumentClick,
      handleAttachImageClick,
      handleAudioFileChange,
      handleCancelEditMessage,
      handleComposerPaste,
      handleDocumentFileChange,
      handleImageFileChange,
      handleKeyPress,
      handleSendMessage,
      handleToggleImageActionsMenu,
      imageActions,
      imageActionsButtonRef,
      imageActionsMenuPosition,
      imageActionsMenuRef,
      imageInputRef,
      isAttachModalOpen,
      isComposerDocumentPreviewVisible,
      isComposerImageExpanded,
      isComposerImageExpandedVisible,
      isMessageInputMultiline,
      isSendSuccessGlowVisible,
      message,
      messageInputHeight,
      messageInputRef,
      openComposerImagePreview,
      openDocumentAttachmentInPortal,
      openImageActionsAttachmentId,
      pendingComposerAttachments,
      previewComposerImageAttachment,
      queueComposerImage,
      removePendingComposerAttachment,
      setMessage,
    ]
  );
