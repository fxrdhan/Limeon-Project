import { useMemo } from 'react';
import type { RefObject } from 'react';
import type { ComposerPanelModel } from '../components/ComposerPanel';

type ComposerState = {
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
  attachButtonRef: RefObject<HTMLButtonElement | null>;
  attachModalRef: RefObject<HTMLDivElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  setMessage: (nextMessage: string) => void;
  handleKeyPress: ComposerPanelModel['onKeyDown'];
  handleComposerPaste: ComposerPanelModel['onPaste'];
  handleSendMessage: ComposerPanelModel['onSendMessage'];
  handleAttachButtonClick: ComposerPanelModel['onAttachButtonClick'];
  handleAttachImageClick: ComposerPanelModel['onAttachImageClick'];
  handleAttachDocumentClick: ComposerPanelModel['onAttachDocumentClick'];
  handleAttachAudioClick: ComposerPanelModel['onAttachAudioClick'];
  handleImageFileChange: ComposerPanelModel['onImageFileChange'];
  handleDocumentFileChange: ComposerPanelModel['onDocumentFileChange'];
  handleAudioFileChange: ComposerPanelModel['onAudioFileChange'];
  handleCancelEditMessage: ComposerPanelModel['onCancelEditMessage'];
  openComposerImagePreview: ComposerPanelModel['onOpenComposerImagePreview'];
  closeComposerImagePreview: ComposerPanelModel['onCloseComposerImagePreview'];
  removePendingComposerAttachment: ComposerPanelModel['onRemovePendingComposerAttachment'];
  queueComposerImage: ComposerPanelModel['onQueueComposerImage'];
};

interface ComposerPreviewState {
  openImageActionsAttachmentId: string | null;
  imageActionsMenuPosition: ComposerPanelModel['imageActionsMenuPosition'];
  composerDocumentPreviewUrl: string | null;
  composerDocumentPreviewName: string;
  isComposerDocumentPreviewVisible: boolean;
  imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
  imageActionsMenuRef: RefObject<HTMLDivElement | null>;
  imageActions: ComposerPanelModel['imageActions'];
  closeComposerDocumentPreview: () => void;
  openDocumentAttachmentInPortal: ComposerPanelModel['onOpenDocumentAttachmentInPortal'];
  handleToggleImageActionsMenu: ComposerPanelModel['onToggleImageActionsMenu'];
}

type ComposerViewportState = Pick<
  ComposerPanelModel,
  'onFocusEditingTargetMessage'
>;

interface UseChatSidebarComposerModelProps {
  composer: ComposerState;
  previewState: ComposerPreviewState;
  viewport: ComposerViewportState;
  refs: {
    messageInputRef: RefObject<HTMLTextAreaElement | null>;
    composerContainerRef: RefObject<HTMLDivElement | null>;
  };
}

export const useChatSidebarComposerModel = ({
  composer,
  previewState,
  viewport,
  refs,
}: UseChatSidebarComposerModelProps) =>
  useMemo<ComposerPanelModel>(
    () => ({
      message: composer.message,
      editingMessagePreview: composer.editingMessagePreview,
      messageInputHeight: composer.messageInputHeight,
      isMessageInputMultiline: composer.isMessageInputMultiline,
      isSendSuccessGlowVisible: composer.isSendSuccessGlowVisible,
      isAttachModalOpen: composer.isAttachModalOpen,
      pendingComposerAttachments: composer.pendingComposerAttachments,
      previewComposerImageAttachment: composer.previewComposerImageAttachment,
      isComposerImageExpanded: composer.isComposerImageExpanded,
      isComposerImageExpandedVisible: composer.isComposerImageExpandedVisible,
      messageInputRef: refs.messageInputRef,
      composerContainerRef: refs.composerContainerRef,
      attachButtonRef: composer.attachButtonRef,
      attachModalRef: composer.attachModalRef,
      imageInputRef: composer.imageInputRef,
      documentInputRef: composer.documentInputRef,
      audioInputRef: composer.audioInputRef,
      openImageActionsAttachmentId: previewState.openImageActionsAttachmentId,
      imageActionsMenuPosition: previewState.imageActionsMenuPosition,
      composerDocumentPreviewUrl: previewState.composerDocumentPreviewUrl,
      composerDocumentPreviewName: previewState.composerDocumentPreviewName,
      isComposerDocumentPreviewVisible:
        previewState.isComposerDocumentPreviewVisible,
      imageActionsButtonRef: previewState.imageActionsButtonRef,
      imageActionsMenuRef: previewState.imageActionsMenuRef,
      imageActions: previewState.imageActions,
      onMessageChange: composer.setMessage,
      onKeyDown: composer.handleKeyPress,
      onPaste: composer.handleComposerPaste,
      onSendMessage: composer.handleSendMessage,
      onAttachButtonClick: composer.handleAttachButtonClick,
      onAttachImageClick: composer.handleAttachImageClick,
      onAttachDocumentClick: composer.handleAttachDocumentClick,
      onAttachAudioClick: composer.handleAttachAudioClick,
      onImageFileChange: composer.handleImageFileChange,
      onDocumentFileChange: composer.handleDocumentFileChange,
      onAudioFileChange: composer.handleAudioFileChange,
      onCancelEditMessage: composer.handleCancelEditMessage,
      onFocusEditingTargetMessage: viewport.onFocusEditingTargetMessage,
      onOpenComposerImagePreview: composer.openComposerImagePreview,
      onCloseComposerImagePreview: composer.closeComposerImagePreview,
      onRemovePendingComposerAttachment:
        composer.removePendingComposerAttachment,
      onQueueComposerImage: composer.queueComposerImage,
      onCloseComposerDocumentPreview: previewState.closeComposerDocumentPreview,
      onOpenDocumentAttachmentInPortal:
        previewState.openDocumentAttachmentInPortal,
      onToggleImageActionsMenu: previewState.handleToggleImageActionsMenu,
    }),
    [
      composer.attachButtonRef,
      composer.attachModalRef,
      composer.audioInputRef,
      composer.closeComposerImagePreview,
      composer.documentInputRef,
      composer.editingMessagePreview,
      composer.handleAttachAudioClick,
      composer.handleAttachButtonClick,
      composer.handleAttachDocumentClick,
      composer.handleAttachImageClick,
      composer.handleAudioFileChange,
      composer.handleCancelEditMessage,
      composer.handleComposerPaste,
      composer.handleDocumentFileChange,
      composer.handleImageFileChange,
      composer.handleKeyPress,
      composer.handleSendMessage,
      composer.imageInputRef,
      composer.isAttachModalOpen,
      composer.isComposerImageExpanded,
      composer.isComposerImageExpandedVisible,
      composer.isMessageInputMultiline,
      composer.isSendSuccessGlowVisible,
      composer.message,
      composer.messageInputHeight,
      composer.openComposerImagePreview,
      composer.pendingComposerAttachments,
      composer.previewComposerImageAttachment,
      composer.queueComposerImage,
      composer.removePendingComposerAttachment,
      composer.setMessage,
      previewState.closeComposerDocumentPreview,
      previewState.composerDocumentPreviewName,
      previewState.composerDocumentPreviewUrl,
      previewState.handleToggleImageActionsMenu,
      previewState.imageActions,
      previewState.imageActionsButtonRef,
      previewState.imageActionsMenuPosition,
      previewState.imageActionsMenuRef,
      previewState.isComposerDocumentPreviewVisible,
      previewState.openDocumentAttachmentInPortal,
      previewState.openImageActionsAttachmentId,
      refs.composerContainerRef,
      refs.messageInputRef,
      viewport.onFocusEditingTargetMessage,
    ]
  );
