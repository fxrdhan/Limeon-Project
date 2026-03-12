import { useAuthStore } from '@/store/authStore';
import {
  buildChatHeaderModel,
  buildComposerPanelModel,
  buildMessagesPaneModel,
} from '../modelBuilders';
import { computeDmChannelId } from '../utils/channel';
import type { ChatSidebarPanelProps } from '../types';
import { useChatSidebarRuntimeState } from './useChatSidebarRuntimeState';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useTargetProfilePhoto } from './useTargetProfilePhoto';

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

  const headerModel = buildChatHeaderModel({
    targetUser: runtime.targetUser,
    displayTargetPhotoUrl: runtime.displayTargetPhotoUrl,
    isTargetOnline: runtime.session.isTargetOnline,
    targetUserPresence: runtime.session.targetUserPresence,
    targetUserPresenceError: runtime.session.targetUserPresenceError,
    isSearchMode: runtime.interaction.isMessageSearchMode,
    searchQuery: runtime.interaction.messageSearchQuery,
    searchState: runtime.interaction.messageSearchState,
    searchResultCount: runtime.interaction.searchMatchedMessageIds.length,
    activeSearchResultIndex: runtime.interaction.activeSearchResultIndex,
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
  });

  const messagesModel = buildMessagesPaneModel({
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
      expandedMessageIds: refs.expandedMessageIds,
      flashingMessageId: runtime.viewport.flashingMessageId,
      isFlashHighlightVisible: runtime.viewport.isFlashHighlightVisible,
      onToggleMessageSelection:
        runtime.interaction.handleToggleMessageSelection,
      onToggleExpand: refs.handleToggleExpand,
    },
    refs: {
      messagesContainerRef: refs.messagesContainerRef,
      messagesEndRef: refs.messagesEndRef,
      messageBubbleRefs: refs.messageBubbleRefs,
      initialMessageAnimationKeysRef: refs.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef: refs.initialOpenJumpAnimationKeysRef,
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
      imagePreviewUrl: runtime.previews.imagePreviewUrl,
      imagePreviewName: runtime.previews.imagePreviewName,
      isImagePreviewVisible: runtime.previews.isImagePreviewVisible,
      closeImagePreview: runtime.previews.closeImagePreview,
      openImageInPortal: runtime.previews.openImageInPortal,
      openDocumentInPortal: runtime.previews.openDocumentInPortal,
    },
    actions: {
      handleEditMessage: runtime.composer.handleEditMessage,
      handleCopyMessage: runtime.composer.handleCopyMessage,
      handleDownloadMessage: runtime.composer.handleDownloadMessage,
      handleDeleteMessage: runtime.composer.handleDeleteMessage,
      onScrollToBottom: runtime.viewport.scrollToBottom,
      onLoadOlderMessages: runtime.session.loadOlderMessages,
      onRetryLoadMessages: runtime.session.retryLoadMessages,
    },
  });

  const composerModel = buildComposerPanelModel({
    state: {
      message: runtime.composer.message,
      editingMessagePreview: runtime.composer.editingMessagePreview,
      messageInputHeight: runtime.composer.messageInputHeight,
      isMessageInputMultiline: runtime.composer.isMessageInputMultiline,
      isSendSuccessGlowVisible: runtime.composer.isSendSuccessGlowVisible,
    },
    attachments: {
      isAttachModalOpen: runtime.composer.isAttachModalOpen,
      pendingComposerAttachments: runtime.composer.pendingComposerAttachments,
      previewComposerImageAttachment:
        runtime.composer.previewComposerImageAttachment,
      isComposerImageExpanded: runtime.composer.isComposerImageExpanded,
      isComposerImageExpandedVisible:
        runtime.composer.isComposerImageExpandedVisible,
      openImageActionsAttachmentId:
        runtime.previews.openImageActionsAttachmentId,
      imageActionsMenuPosition: runtime.previews.imageActionsMenuPosition,
      imageActions: runtime.previews.imageActions,
    },
    documentPreview: {
      composerDocumentPreviewUrl: runtime.previews.composerDocumentPreviewUrl,
      composerDocumentPreviewName: runtime.previews.composerDocumentPreviewName,
      isComposerDocumentPreviewVisible:
        runtime.previews.isComposerDocumentPreviewVisible,
    },
    refs: {
      messageInputRef: refs.messageInputRef,
      composerContainerRef: refs.composerContainerRef,
      attachButtonRef: runtime.composer.attachButtonRef,
      attachModalRef: runtime.composer.attachModalRef,
      imageInputRef: runtime.composer.imageInputRef,
      documentInputRef: runtime.composer.documentInputRef,
      audioInputRef: runtime.composer.audioInputRef,
      imageActionsButtonRef: runtime.previews.imageActionsButtonRef,
      imageActionsMenuRef: runtime.previews.imageActionsMenuRef,
    },
    actions: {
      onMessageChange: runtime.composer.setMessage,
      onKeyDown: runtime.composer.handleKeyPress,
      onPaste: runtime.composer.handleComposerPaste,
      onSendMessage: runtime.composer.handleSendMessage,
      onAttachButtonClick: runtime.composer.handleAttachButtonClick,
      onAttachImageClick: runtime.composer.handleAttachImageClick,
      onAttachDocumentClick: runtime.composer.handleAttachDocumentClick,
      onAttachAudioClick: runtime.composer.handleAttachAudioClick,
      onImageFileChange: runtime.composer.handleImageFileChange,
      onDocumentFileChange: runtime.composer.handleDocumentFileChange,
      onAudioFileChange: runtime.composer.handleAudioFileChange,
      onCancelEditMessage: runtime.composer.handleCancelEditMessage,
      onFocusEditingTargetMessage: runtime.viewport.focusEditingTargetMessage,
      onOpenComposerImagePreview: runtime.composer.openComposerImagePreview,
      onCloseComposerImagePreview: runtime.composer.closeComposerImagePreview,
      onRemovePendingComposerAttachment:
        runtime.composer.removePendingComposerAttachment,
      onQueueComposerImage: runtime.composer.queueComposerImage,
      onCloseComposerDocumentPreview:
        runtime.previews.closeComposerDocumentPreview,
      onOpenDocumentAttachmentInPortal:
        runtime.previews.openDocumentAttachmentInPortal,
      onToggleImageActionsMenu: runtime.previews.handleToggleImageActionsMenu,
    },
  });

  return {
    headerModel,
    messagesModel,
    composerModel,
    isAtTop: runtime.viewport.isAtTop,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    handleChatPortalBackgroundClick:
      runtime.viewport.handleChatPortalBackgroundClick,
  };
};
