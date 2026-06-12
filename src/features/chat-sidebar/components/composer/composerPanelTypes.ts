import type { ChatSidebarRuntimeState } from '../../hooks/useChatSidebarRuntimeState';

export interface ComposerPanelRuntime {
  composer: Pick<
    ChatSidebarRuntimeState['composer'],
    | 'message'
    | 'messageInputHeight'
    | 'isMessageInputMultiline'
    | 'isSendSuccessGlowVisible'
    | 'isLoadingAttachmentComposerAttachments'
    | 'isAttachModalOpen'
    | 'attachmentPastePromptUrl'
    | 'isAttachmentPastePromptAttachmentCandidate'
    | 'isAttachmentPastePromptShortenable'
    | 'hoverableAttachmentCandidates'
    | 'composerAttachmentPreviewItems'
    | 'previewComposerImageAttachment'
    | 'composerImageExpandedUrl'
    | 'isComposerImageExpanded'
    | 'isComposerImageExpandedVisible'
    | 'editingMessagePreview'
    | 'editingMessageAuthorLabel'
    | 'isEditingMessageFromCurrentUser'
    | 'replyingMessagePreview'
    | 'replyingMessageAuthorLabel'
    | 'isReplyingMessageFromCurrentUser'
    | 'replyingMessageId'
    | 'attachButtonRef'
    | 'attachModalRef'
    | 'attachmentPastePromptRef'
    | 'imageInputRef'
    | 'documentInputRef'
    | 'audioInputRef'
    | 'dismissAttachmentPastePrompt'
    | 'openAttachmentPastePrompt'
    | 'openComposerLinkPrompt'
    | 'handleEditAttachmentLink'
    | 'handleOpenAttachmentPastePromptLink'
    | 'handleCopyAttachmentPastePromptLink'
    | 'handleShortenAttachmentPastePromptLink'
    | 'handleUseAttachmentPasteAsUrl'
    | 'handleUseAttachmentPasteAsAttachment'
    | 'handleAttachButtonClick'
    | 'handleAttachImageClick'
    | 'handleAttachDocumentClick'
    | 'handleAttachAudioClick'
    | 'handleImageFileChange'
    | 'handleDocumentFileChange'
    | 'handleAudioFileChange'
    | 'handleComposerPaste'
    | 'closeComposerImagePreview'
    | 'cancelLoadingComposerAttachment'
    | 'removePendingComposerAttachment'
    | 'queueComposerImage'
    | 'handleMessageChange'
  >;
  previews: Pick<
    ChatSidebarRuntimeState['previews'],
    | 'openImageActionsAttachmentId'
    | 'imageActionsMenuPosition'
    | 'pdfCompressionMenuPosition'
    | 'imageActions'
    | 'pdfCompressionLevelActions'
    | 'imageActionsButtonRef'
    | 'imageActionsMenuRef'
    | 'pdfCompressionMenuRef'
    | 'isAttachmentMenuRepositionPaused'
    | 'setIsAttachmentMenuRepositionPaused'
    | 'isComposerAttachmentSelectionMode'
    | 'selectedComposerAttachmentIds'
    | 'handleToggleImageActionsMenu'
    | 'closeImageActionsMenu'
    | 'handleSelectAllComposerAttachments'
    | 'handleClearComposerAttachmentSelection'
    | 'handleDeleteSelectedComposerAttachments'
    | 'handleToggleComposerAttachmentSelection'
    | 'composerDocumentPreviewUrl'
    | 'composerDocumentPreviewName'
    | 'isComposerDocumentPreviewVisible'
    | 'closeComposerDocumentPreview'
  >;
  mutations: Pick<
    ChatSidebarRuntimeState['mutations'],
    | 'handleKeyPress'
    | 'handleSendMessage'
    | 'handleCancelEditMessage'
    | 'handleCancelReplyMessage'
  >;
  refs: Pick<
    ChatSidebarRuntimeState['refs'],
    'messageInputRef' | 'composerContainerRef'
  >;
  viewport: Pick<
    ChatSidebarRuntimeState['viewport'],
    'focusEditingTargetMessage' | 'focusReplyTargetMessage'
  >;
}

export interface ComposerAttachmentScrollState {
  hasOverflow: boolean;
  isAtTop: boolean;
  isAtBottom: boolean;
}
