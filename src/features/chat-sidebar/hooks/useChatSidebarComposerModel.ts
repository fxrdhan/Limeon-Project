import { useMemo } from 'react';
import type { ComposerPanelModel } from '../components/ComposerPanel';
import { useChatComposer } from './useChatComposer';
import { useChatSidebarPreviewState } from './useChatSidebarPreviewState';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useChatViewport } from './useChatViewport';

type ComposerState = Pick<
  ReturnType<typeof useChatComposer>,
  | 'message'
  | 'editingMessagePreview'
  | 'messageInputHeight'
  | 'isMessageInputMultiline'
  | 'isSendSuccessGlowVisible'
  | 'isAttachModalOpen'
  | 'pendingComposerAttachments'
  | 'previewComposerImageAttachment'
  | 'isComposerImageExpanded'
  | 'isComposerImageExpandedVisible'
  | 'attachButtonRef'
  | 'attachModalRef'
  | 'imageInputRef'
  | 'documentInputRef'
  | 'audioInputRef'
  | 'setMessage'
  | 'handleKeyPress'
  | 'handleComposerPaste'
  | 'handleSendMessage'
  | 'handleAttachButtonClick'
  | 'handleAttachImageClick'
  | 'handleAttachDocumentClick'
  | 'handleAttachAudioClick'
  | 'handleImageFileChange'
  | 'handleDocumentFileChange'
  | 'handleAudioFileChange'
  | 'handleCancelEditMessage'
  | 'openComposerImagePreview'
  | 'closeComposerImagePreview'
  | 'removePendingComposerAttachment'
  | 'queueComposerImage'
>;

type ComposerPreviewState = Pick<
  ReturnType<typeof useChatSidebarPreviewState>,
  | 'openImageActionsAttachmentId'
  | 'imageActionsMenuPosition'
  | 'composerDocumentPreviewUrl'
  | 'composerDocumentPreviewName'
  | 'isComposerDocumentPreviewVisible'
  | 'imageActionsButtonRef'
  | 'imageActionsMenuRef'
  | 'imageActions'
  | 'closeComposerDocumentPreview'
  | 'openDocumentAttachmentInPortal'
  | 'handleToggleImageActionsMenu'
>;

type ComposerViewportState = Pick<
  ReturnType<typeof useChatViewport>,
  'focusEditingTargetMessage'
>;

interface UseChatSidebarComposerModelProps {
  composer: ComposerState;
  previewState: ComposerPreviewState;
  viewport: ComposerViewportState;
  refs: ReturnType<typeof useChatSidebarRefs>;
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
      onFocusEditingTargetMessage: viewport.focusEditingTargetMessage,
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
      viewport.focusEditingTargetMessage,
    ]
  );
