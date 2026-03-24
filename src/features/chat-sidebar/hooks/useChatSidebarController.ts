import { useAuthStore } from '@/store/authStore';
import type {
  ChatHeaderModel,
  ComposerPanelModel,
  MessagesPaneModel,
} from '../models';
import type { ChatSidebarPanelProps } from '../types';
import { computeDmChannelId } from '../utils/channel';
import {
  useChatSidebarRuntimeState,
  type ChatSidebarRuntimeState,
} from './useChatSidebarRuntimeState';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useTargetProfilePhoto } from './useTargetProfilePhoto';

const buildChatHeaderModel = (
  runtime: ChatSidebarRuntimeState
): ChatHeaderModel => ({
  targetUser: runtime.targetUser,
  displayTargetPhotoUrl: runtime.displayTargetPhotoUrl,
  isTargetOnline: runtime.session.isTargetOnline,
  targetUserPresence: runtime.session.targetUserPresence,
  targetUserPresenceError: runtime.session.targetUserPresenceError,
  isSearchMode: runtime.interaction.isMessageSearchMode,
  searchQuery: runtime.interaction.messageSearchQuery,
  searchState: runtime.interaction.messageSearchState,
  searchResultCount: runtime.interaction.searchMatchedMessageIds.length,
  canNavigateSearchUp: runtime.interaction.canNavigateSearchUp,
  canNavigateSearchDown: runtime.interaction.canNavigateSearchDown,
  hasMoreSearchResults: runtime.interaction.hasMoreSearchResults,
  isSelectionMode: runtime.interaction.isSelectionMode,
  selectedMessageCount: runtime.interaction.selectedVisibleMessages.length,
  canDeleteSelectedMessages: runtime.interaction.canDeleteSelectedMessages,
  searchInputRef: runtime.interaction.searchInputRef,
  onEnterSearchMode: runtime.interaction.handleEnterMessageSearchMode,
  onExitSearchMode: runtime.interaction.handleExitMessageSearchMode,
  onEnterSelectionMode: runtime.interaction.handleEnterMessageSelectionMode,
  onClearSelectedMessages: runtime.interaction.handleClearSelectedMessages,
  onExitSelectionMode: runtime.interaction.handleExitMessageSelectionMode,
  onSearchQueryChange: runtime.interaction.handleMessageSearchQueryChange,
  onNavigateSearchUp: runtime.interaction.handleNavigateSearchUp,
  onNavigateSearchDown: runtime.interaction.handleNavigateSearchDown,
  onFocusSearchInput: runtime.interaction.handleFocusSearchInput,
  onCopySelectedMessages: runtime.interaction.handleCopySelectedMessages,
  onDeleteSelectedMessages: runtime.actions.handleDeleteSelectedMessages,
  onClose: runtime.actions.handleClose,
  getInitials: runtime.actions.getInitials,
  getInitialsColor: runtime.actions.getInitialsColor,
  activeSearchResultIndex: Math.max(
    runtime.interaction.activeSearchResultIndex,
    0
  ),
});

const buildMessagesPaneModel = (
  runtime: ChatSidebarRuntimeState
): MessagesPaneModel => ({
  state: {
    loading: runtime.session.loading,
    loadError: runtime.session.loadError,
    messages: runtime.session.messages,
    user: runtime.user,
    normalizedSearchQuery: runtime.interaction.normalizedMessageSearchQuery,
    messageInputHeight: runtime.composer.messageInputHeight,
    composerContextualOffset: runtime.composer.composerContextualOffset,
    composerContainerHeight: runtime.viewport.composerContainerHeight,
    showScrollToBottom:
      runtime.viewport.hasNewMessages || !runtime.viewport.isAtBottom,
    hasOlderMessages: runtime.session.hasOlderMessages,
    isLoadingOlderMessages: runtime.session.isLoadingOlderMessages,
    olderMessagesError: runtime.session.olderMessagesError,
  },
  menu: {
    openMessageId: runtime.viewport.openMenuMessageId,
    placement: runtime.viewport.menuPlacement,
    sideAnchor: runtime.viewport.menuSideAnchor,
    shouldAnimateOpen: runtime.viewport.shouldAnimateMenuOpen,
    transitionSourceId: runtime.viewport.menuTransitionSourceId,
    offsetX: runtime.viewport.menuOffsetX,
    close: runtime.viewport.closeMessageMenu,
    toggle: runtime.actions.toggleMessageMenu,
  },
  interaction: {
    isSelectionMode: runtime.interaction.isSelectionMode,
    selectedMessageIds: runtime.interaction.selectedMessageIds,
    searchMatchedMessageIds: runtime.interaction.isMessageSearchMode
      ? runtime.interaction.searchMatchedMessageIdSet
      : new Set<string>(),
    activeSearchMessageId: runtime.interaction.isMessageSearchMode
      ? runtime.interaction.activeSearchMessageId
      : null,
    expandedMessageIds: runtime.refs.expandedMessageIds,
    flashingMessageId: runtime.viewport.flashingMessageId,
    isFlashHighlightVisible: runtime.viewport.isFlashHighlightVisible,
    onToggleMessageSelection: runtime.interaction.handleToggleMessageSelection,
    onToggleExpand: runtime.refs.handleToggleExpand,
  },
  refs: {
    messagesContainerRef: runtime.refs.messagesContainerRef,
    messagesContentRef: runtime.refs.messagesContentRef,
    messagesEndRef: runtime.refs.messagesEndRef,
    messageBubbleRefs: runtime.refs.messageBubbleRefs,
    initialMessageAnimationKeysRef: runtime.refs.initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef:
      runtime.refs.initialOpenJumpAnimationKeysRef,
  },
  previews: {
    captionMessagesByAttachmentId:
      runtime.previews.captionMessagesByAttachmentId,
    captionMessageIds: runtime.previews.captionMessageIds,
    getAttachmentFileName: runtime.actions.getAttachmentFileName,
    getAttachmentFileKind: runtime.actions.getAttachmentFileKind,
    getImageMessageUrl: runtime.previews.getImageMessageUrl,
    getPdfMessagePreview: runtime.previews.getPdfMessagePreview,
    documentPreviewUrl: runtime.previews.documentPreviewUrl,
    documentPreviewName: runtime.previews.documentPreviewName,
    isDocumentPreviewVisible: runtime.previews.isDocumentPreviewVisible,
    closeDocumentPreview: runtime.previews.closeDocumentPreview,
    isImagePreviewOpen: runtime.previews.isImagePreviewOpen,
    imagePreviewUrl: runtime.previews.imagePreviewUrl,
    imagePreviewBackdropUrl: runtime.previews.imagePreviewBackdropUrl,
    imagePreviewName: runtime.previews.imagePreviewName,
    isImagePreviewVisible: runtime.previews.isImagePreviewVisible,
    closeImagePreview: runtime.previews.closeImagePreview,
    imageGroupPreviewItems: runtime.previews.imageGroupPreviewItems,
    activeImageGroupPreviewId: runtime.previews.activeImageGroupPreviewId,
    isImageGroupPreviewVisible: runtime.previews.isImageGroupPreviewVisible,
    closeImageGroupPreview: runtime.previews.closeImageGroupPreview,
    selectImageGroupPreviewItem: runtime.previews.selectImageGroupPreviewItem,
    openImageInPortal: runtime.previews.openImageInPortal,
    openImageGroupInPortal: runtime.previews.openImageGroupInPortal,
    openDocumentInPortal: runtime.previews.openDocumentInPortal,
  },
  actions: {
    handleEditMessage: runtime.mutations.handleEditMessage,
    handleCopyMessage: runtime.mutations.handleCopyMessage,
    handleDownloadMessage: runtime.mutations.handleDownloadMessage,
    handleOpenForwardMessagePicker:
      runtime.mutations.handleOpenForwardMessagePicker,
    handleDeleteMessage: runtime.mutations.handleDeleteMessage,
    onScrollToBottom: runtime.viewport.scrollToBottom,
    onLoadOlderMessages: runtime.session.loadOlderMessages,
    onRetryLoadMessages: runtime.session.retryLoadMessages,
  },
  forwarding: {
    isOpen: runtime.mutations.isForwardPickerOpen,
    targetMessage: runtime.mutations.forwardTargetMessage,
    captionMessage: runtime.mutations.forwardCaptionMessage,
    availableUsers: runtime.mutations.availableForwardRecipients,
    selectedRecipientIds: runtime.mutations.selectedForwardRecipientIds,
    isDirectoryLoading: runtime.mutations.isForwardDirectoryLoading,
    directoryError: runtime.mutations.forwardDirectoryError,
    hasMoreDirectoryUsers: runtime.mutations.hasMoreForwardDirectoryUsers,
    isSubmitting: runtime.mutations.isSubmittingForwardMessage,
    onClose: runtime.mutations.handleCloseForwardMessagePicker,
    onToggleRecipient: runtime.mutations.handleToggleForwardRecipient,
    onRetryLoadDirectory: runtime.mutations.handleRetryLoadForwardDirectory,
    onLoadMoreDirectoryUsers:
      runtime.mutations.handleLoadMoreForwardDirectoryUsers,
    onSubmit: runtime.mutations.handleSubmitForwardMessage,
  },
});

const buildComposerPanelModel = (
  runtime: ChatSidebarRuntimeState
): ComposerPanelModel => ({
  state: {
    message: runtime.composer.message,
    editingMessagePreview: runtime.composer.editingMessagePreview,
    messageInputHeight: runtime.composer.messageInputHeight,
    isMessageInputMultiline: runtime.composer.isMessageInputMultiline,
    isSendSuccessGlowVisible: runtime.composer.isSendSuccessGlowVisible,
    isSendDisabled: runtime.composer.isLoadingAttachmentComposerAttachments,
  },
  attachments: {
    isAttachModalOpen: runtime.composer.isAttachModalOpen,
    linkPrompt: {
      url: runtime.composer.linkPrompt.attachmentPastePromptUrl,
      isAttachmentCandidate:
        runtime.composer.linkPrompt.isAttachmentPastePromptAttachmentCandidate,
      isShortenable:
        runtime.composer.linkPrompt.isAttachmentPastePromptShortenable,
      hoverableCandidates:
        runtime.composer.linkPrompt.hoverableAttachmentCandidates,
      hoverableUrl: runtime.composer.linkPrompt.hoverableAttachmentUrl,
    },
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
  },
  documentPreview: {
    composerDocumentPreviewUrl: runtime.previews.composerDocumentPreviewUrl,
    composerDocumentPreviewName: runtime.previews.composerDocumentPreviewName,
    isComposerDocumentPreviewVisible:
      runtime.previews.isComposerDocumentPreviewVisible,
  },
  refs: {
    messageInputRef: runtime.refs.messageInputRef,
    composerContainerRef: runtime.refs.composerContainerRef,
    attachButtonRef: runtime.composer.attachButtonRef,
    attachModalRef: runtime.composer.attachModalRef,
    attachmentPastePromptRef: runtime.composer.attachmentPastePromptRef,
    imageInputRef: runtime.composer.imageInputRef,
    documentInputRef: runtime.composer.documentInputRef,
    audioInputRef: runtime.composer.audioInputRef,
    imageActionsButtonRef: runtime.previews.imageActionsButtonRef,
    imageActionsMenuRef: runtime.previews.imageActionsMenuRef,
    pdfCompressionMenuRef: runtime.previews.pdfCompressionMenuRef,
  },
  actions: {
    onMessageChange: runtime.composer.handleMessageChange,
    onKeyDown: runtime.mutations.handleKeyPress,
    onPaste: runtime.composer.handleComposerPaste,
    onDismissAttachmentPastePrompt:
      runtime.composer.dismissAttachmentPastePrompt,
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
    onCloseComposerDocumentPreview:
      runtime.previews.closeComposerDocumentPreview,
    onOpenDocumentAttachmentInPortal:
      runtime.previews.openDocumentAttachmentInPortal,
    onClosePdfCompressionMenu: runtime.previews.closePdfCompressionMenu,
  },
});

export const useChatSidebarController = ({
  isOpen,
  onClose,
  targetUser,
}: ChatSidebarPanelProps) => {
  const { user } = useAuthStore();
  const refs = useChatSidebarRefs();
  /* c8 ignore next */
  const currentChannelId =
    user && targetUser ? computeDmChannelId(user.id, targetUser.id) : null;

  const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
  const runtime = useChatSidebarRuntimeState({
    isOpen,
    onClose,
    targetUser,
    user,
    currentChannelId,
    refs,
    displayTargetPhotoUrl,
  });

  return {
    headerModel: buildChatHeaderModel(runtime),
    messagesModel: buildMessagesPaneModel(runtime),
    composerModel: buildComposerPanelModel(runtime),
    isAtTop: runtime.viewport.isAtTop,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    handleChatPortalBackgroundClick:
      runtime.viewport.handleChatPortalBackgroundClick,
  };
};
