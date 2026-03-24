import type { ComposerPanelModel } from '../models';
import type { ChatSidebarRefs } from './useChatSidebarRefs';
import type { ChatSidebarRuntimeState } from './useChatSidebarRuntimeState';

const buildComposerPanelStateModel = (
  runtime: ChatSidebarRuntimeState
): ComposerPanelModel['state'] => ({
  message: runtime.composer.message,
  editingMessagePreview: runtime.composer.editingMessagePreview,
  messageInputHeight: runtime.composer.messageInputHeight,
  isMessageInputMultiline: runtime.composer.isMessageInputMultiline,
  isSendSuccessGlowVisible: runtime.composer.isSendSuccessGlowVisible,
  isSendDisabled: runtime.composer.isLoadingAttachmentComposerAttachments,
});

const buildComposerPanelAttachmentsModel = (
  runtime: ChatSidebarRuntimeState
): ComposerPanelModel['attachments'] => ({
  isAttachModalOpen: runtime.composer.isAttachModalOpen,
  attachmentPastePromptUrl: runtime.composer.attachmentPastePromptUrl,
  isAttachmentPastePromptAttachmentCandidate:
    runtime.composer.isAttachmentPastePromptAttachmentCandidate,
  isAttachmentPastePromptShortenable:
    runtime.composer.isAttachmentPastePromptShortenable,
  hoverableAttachmentCandidates: runtime.composer.hoverableAttachmentCandidates,
  hoverableAttachmentUrl: runtime.composer.hoverableAttachmentUrl,
  pendingComposerAttachments: [
    ...runtime.composer.composerAttachmentPreviewItems,
  ],
  previewComposerImageAttachment:
    runtime.composer.previewComposerImageAttachment,
  isComposerImageExpanded: runtime.composer.isComposerImageExpanded,
  isComposerImageExpandedVisible:
    runtime.composer.isComposerImageExpandedVisible,
  openImageActionsAttachmentId: runtime.previews.openImageActionsAttachmentId,
  imageActionsMenuPosition: runtime.previews.imageActionsMenuPosition,
  pdfCompressionMenuPosition: runtime.previews.pdfCompressionMenuPosition,
  imageActions: runtime.previews.imageActions,
  pdfCompressionLevelActions: runtime.previews.pdfCompressionLevelActions,
});

const buildComposerPanelDocumentPreviewModel = (
  runtime: ChatSidebarRuntimeState
): ComposerPanelModel['documentPreview'] => ({
  composerDocumentPreviewUrl: runtime.previews.composerDocumentPreviewUrl,
  composerDocumentPreviewName: runtime.previews.composerDocumentPreviewName,
  isComposerDocumentPreviewVisible:
    runtime.previews.isComposerDocumentPreviewVisible,
});

const buildComposerPanelRefsModel = (
  runtime: ChatSidebarRuntimeState,
  refs: ChatSidebarRefs
): ComposerPanelModel['refs'] => ({
  messageInputRef: refs.messageInputRef,
  composerContainerRef: refs.composerContainerRef,
  attachButtonRef: runtime.composer.attachButtonRef,
  attachModalRef: runtime.composer.attachModalRef,
  attachmentPastePromptRef: runtime.composer.attachmentPastePromptRef,
  imageInputRef: runtime.composer.imageInputRef,
  documentInputRef: runtime.composer.documentInputRef,
  audioInputRef: runtime.composer.audioInputRef,
  imageActionsButtonRef: runtime.previews.imageActionsButtonRef,
  imageActionsMenuRef: runtime.previews.imageActionsMenuRef,
  pdfCompressionMenuRef: runtime.previews.pdfCompressionMenuRef,
});

const buildComposerPanelActionsModel = (
  runtime: ChatSidebarRuntimeState
): ComposerPanelModel['actions'] => ({
  onMessageChange: runtime.composer.handleMessageChange,
  onKeyDown: runtime.mutations.handleKeyPress,
  onPaste: runtime.composer.handleComposerPaste,
  onDismissAttachmentPastePrompt: runtime.composer.dismissAttachmentPastePrompt,
  onOpenAttachmentPastePrompt: runtime.composer.openAttachmentPastePrompt,
  onOpenComposerLinkPrompt: runtime.composer.openComposerLinkPrompt,
  onEditAttachmentLink: runtime.composer.handleEditAttachmentLink,
  onOpenAttachmentPastePromptLink:
    runtime.composer.handleOpenAttachmentPastePromptLink,
  onCopyAttachmentPastePromptLink:
    runtime.composer.handleCopyAttachmentPastePromptLink,
  onShortenAttachmentPastePromptLink:
    runtime.composer.handleShortenAttachmentPastePromptLink,
  onUseAttachmentPasteAsUrl: runtime.composer.handleUseAttachmentPasteAsUrl,
  onUseAttachmentPasteAsAttachment:
    runtime.composer.handleUseAttachmentPasteAsAttachment,
  onSendMessage: runtime.mutations.handleSendMessage,
  onAttachButtonClick: runtime.composer.handleAttachButtonClick,
  onAttachImageClick: runtime.composer.handleAttachImageClick,
  onAttachDocumentClick: runtime.composer.handleAttachDocumentClick,
  onAttachAudioClick: runtime.composer.handleAttachAudioClick,
  onImageFileChange: runtime.composer.handleImageFileChange,
  onDocumentFileChange: runtime.composer.handleDocumentFileChange,
  onAudioFileChange: runtime.composer.handleAudioFileChange,
  onCancelEditMessage: runtime.mutations.handleCancelEditMessage,
  onFocusEditingTargetMessage: runtime.viewport.focusEditingTargetMessage,
  onOpenComposerImagePreview: runtime.composer.openComposerImagePreview,
  onCloseComposerImagePreview: runtime.composer.closeComposerImagePreview,
  onCancelLoadingComposerAttachment:
    runtime.composer.cancelLoadingComposerAttachment,
  onRemovePendingComposerAttachment:
    runtime.composer.removePendingComposerAttachment,
  onToggleImageActionsMenu: runtime.previews.handleToggleImageActionsMenu,
  onQueueComposerImage: runtime.composer.queueComposerImage,
  onCloseComposerDocumentPreview: runtime.previews.closeComposerDocumentPreview,
  onOpenDocumentAttachmentInPortal:
    runtime.previews.openDocumentAttachmentInPortal,
  onClosePdfCompressionMenu: runtime.previews.closePdfCompressionMenu,
});

export const useComposerPanelModel = (
  runtime: ChatSidebarRuntimeState,
  refs: ChatSidebarRefs
): ComposerPanelModel => ({
  state: buildComposerPanelStateModel(runtime),
  attachments: buildComposerPanelAttachmentsModel(runtime),
  documentPreview: buildComposerPanelDocumentPreviewModel(runtime),
  refs: buildComposerPanelRefsModel(runtime, refs),
  actions: buildComposerPanelActionsModel(runtime),
});
