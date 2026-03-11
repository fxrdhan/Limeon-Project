import { useMemo, type RefObject } from 'react';
import type { ComposerPanelModel } from '../components/ComposerPanel';
import type { PendingComposerAttachment } from '../types';

interface UseChatComposerModelProps {
  message: string;
  editingMessagePreview: string | null;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  isSendSuccessGlowVisible: boolean;
  isAttachModalOpen: boolean;
  pendingComposerAttachments: PendingComposerAttachment[];
  previewComposerImageAttachment: PendingComposerAttachment | undefined;
  isComposerImageExpanded: boolean;
  isComposerImageExpandedVisible: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  composerContainerRef: RefObject<HTMLDivElement | null>;
  attachButtonRef: RefObject<HTMLButtonElement | null>;
  attachModalRef: RefObject<HTMLDivElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  openImageActionsAttachmentId: string | null;
  imageActionsMenuPosition: { top: number; left: number } | null;
  composerDocumentPreviewUrl: string | null;
  composerDocumentPreviewName: string;
  isComposerDocumentPreviewVisible: boolean;
  imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
  imageActionsMenuRef: RefObject<HTMLDivElement | null>;
  imageActions: ComposerPanelModel['imageActions'];
  setMessage: (nextMessage: string) => void;
  handleKeyPress: ComposerPanelModel['onKeyDown'];
  handleComposerPaste: ComposerPanelModel['onPaste'];
  handleSendMessage: () => Promise<void>;
  handleAttachButtonClick: () => void;
  handleAttachImageClick: (replaceAttachmentId?: string) => void;
  handleAttachDocumentClick: (replaceAttachmentId?: string) => void;
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
  openDocumentAttachmentInPortal: (
    attachment: PendingComposerAttachment
  ) => void;
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
