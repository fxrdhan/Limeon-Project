import { useAuthStore } from '@/store/authStore';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import { useCallback } from 'react';
import type { ChatSidebarPanelProps } from '../types';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { computeDmChannelId } from '../utils/channel';
import { useChatBulkDelete } from './useChatBulkDelete';
import { useChatComposer } from './useChatComposer';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatSidebarPreviewState } from './useChatSidebarPreviewState';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useChatViewport } from './useChatViewport';
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
  const {
    messages,
    setMessages,
    loading,
    loadError,
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    markMessageIdsAsRead,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    loadOlderMessages,
    retryLoadMessages,
    mergeSearchContextMessages,
  } = useChatSession({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    initialMessageAnimationKeysRef: refs.initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef: refs.initialOpenJumpAnimationKeysRef,
  });

  const focusMessageComposer = useCallback(() => {
    const textarea = refs.messageInputRef.current;
    if (!textarea) return;

    textarea.focus();
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [refs.messageInputRef]);

  const composer = useChatComposer({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
    closeMessageMenu: refs.closeMessageMenu,
    scheduleScrollMessagesToBottom: refs.scheduleScrollMessagesToBottom,
    messageInputRef: refs.messageInputRef,
    focusMessageComposer,
  });
  const {
    message,
    setMessage,
    editingMessageId,
    messageInputHeight,
    isMessageInputMultiline,
    isSendSuccessGlowVisible,
    isAttachModalOpen,
    pendingComposerAttachments,
    previewComposerImageAttachment,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    editingMessagePreview,
    composerContextualOffset,
    attachButtonRef,
    attachModalRef,
    imageInputRef,
    documentInputRef,
    audioInputRef,
    closeAttachModal,
    handleAttachButtonClick,
    handleAttachImageClick,
    handleAttachDocumentClick,
    handleAttachAudioClick,
    handleImageFileChange,
    handleDocumentFileChange,
    handleAudioFileChange,
    handleComposerPaste,
    openComposerImagePreview,
    closeComposerImagePreview,
    removePendingComposerAttachment,
    queueComposerImage,
    handleEditMessage,
    handleDeleteMessage,
    handleDeleteMessages,
    handleCopyMessage,
    handleDownloadMessage,
    handleCancelEditMessage,
    handleSendMessage,
    handleKeyPress,
  } = composer;

  const interaction = useChatInteractionModes({
    isOpen,
    currentChannelId,
    messages,
    mergeSearchContextMessages,
    user,
    targetUser,
    closeMessageMenu: refs.closeMessageMenu,
    getAttachmentFileName,
  });
  const {
    isMessageSearchMode,
    messageSearchQuery,
    activeSearchMessageId,
    searchNavigationTick,
    normalizedMessageSearchQuery,
    searchMatchedMessageIds,
    searchMatchedMessageIdSet,
    activeSearchResultIndex,
    canNavigateSearchUp,
    canNavigateSearchDown,
    hasMoreSearchResults,
    messageSearchState,
    isSelectionMode,
    selectedMessageIds,
    selectedVisibleMessages,
    canDeleteSelectedMessages,
    searchInputRef,
    setSelectedMessageIds,
    handleEnterMessageSearchMode,
    handleExitMessageSearchMode,
    handleEnterMessageSelectionMode,
    handleExitMessageSelectionMode,
    handleToggleMessageSelection,
    handleFocusSearchInput,
    handleMessageSearchQueryChange,
    handleNavigateSearchUp,
    handleNavigateSearchDown,
    handleCopySelectedMessages,
  } = interaction;

  const viewport = useChatViewport({
    isOpen,
    currentChannelId,
    messages,
    userId: user?.id,
    targetUserId: targetUser?.id,
    messagesCount: messages.length,
    loading,
    messageInputHeight,
    composerContextualOffset,
    isMessageInputMultiline,
    pendingComposerAttachmentsCount: pendingComposerAttachments.length,
    normalizedMessageSearchQuery,
    isMessageSearchMode,
    activeSearchMessageId,
    searchNavigationTick,
    editingMessageId,
    focusMessageComposer,
    markMessageIdsAsRead,
    messagesContainerRef: refs.messagesContainerRef,
    messagesEndRef: refs.messagesEndRef,
    composerContainerRef: refs.composerContainerRef,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    messageBubbleRefs: refs.messageBubbleRefs,
  });
  const {
    isAtBottom,
    isAtTop,
    hasNewMessages,
    composerContainerHeight,
    openMenuMessageId,
    menuPlacement,
    menuSideAnchor,
    shouldAnimateMenuOpen,
    menuTransitionSourceId,
    menuOffsetX,
    flashingMessageId,
    isFlashHighlightVisible,
    closeMessageMenu: closeViewportMessageMenu,
    toggleMessageMenu: toggleViewportMessageMenu,
    scheduleScrollMessagesToBottom: scheduleViewportScrollMessagesToBottom,
    focusEditingTargetMessage,
    handleChatPortalBackgroundClick,
    scrollToBottom,
  } = viewport;
  refs.closeMessageMenuRef.current = closeViewportMessageMenu;
  refs.scheduleScrollMessagesToBottomRef.current =
    scheduleViewportScrollMessagesToBottom;

  const {
    documentPreviewUrl,
    documentPreviewName,
    isDocumentPreviewVisible,
    closeDocumentPreview,
    imagePreviewUrl,
    imagePreviewName,
    isImagePreviewVisible,
    closeImagePreview,
    openImageInPortal,
    openDocumentInPortal,
    getImageMessageUrl,
    getPdfMessagePreview,
    captionMessagesByAttachmentId,
    captionMessageIds,
    openImageActionsAttachmentId,
    imageActionsMenuPosition,
    composerDocumentPreviewUrl,
    composerDocumentPreviewName,
    isComposerDocumentPreviewVisible,
    imageActionsButtonRef,
    imageActionsMenuRef,
    imageActions,
    closeImageActionsMenu,
    closeComposerDocumentPreview,
    openDocumentAttachmentInPortal,
    handleToggleImageActionsMenu,
  } = useChatSidebarPreviewState({
    messages,
    pendingComposerAttachments,
    handleAttachImageClick,
    handleAttachDocumentClick,
    removePendingComposerAttachment,
    openComposerImagePreview,
    getAttachmentFileName,
    getAttachmentFileKind,
  });

  const toggleMessageMenu = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      closeAttachModal();
      closeImageActionsMenu();
      toggleViewportMessageMenu(anchor, messageId, preferredSide);
    },
    [closeAttachModal, closeImageActionsMenu, toggleViewportMessageMenu]
  );

  const handleDeleteSelectedMessages = useChatBulkDelete({
    user,
    selectedVisibleMessages,
    setSelectedMessageIds,
    deleteMessages: handleDeleteMessages,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const headerModel = {
    targetUser,
    displayTargetPhotoUrl,
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    isSearchMode: isMessageSearchMode,
    searchQuery: messageSearchQuery,
    searchState: messageSearchState,
    searchResultCount: searchMatchedMessageIds.length,
    activeSearchResultIndex: Math.max(activeSearchResultIndex, 0),
    canNavigateSearchUp,
    canNavigateSearchDown,
    hasMoreSearchResults,
    isSelectionMode,
    selectedMessageCount: selectedVisibleMessages.length,
    canDeleteSelectedMessages,
    searchInputRef,
    onEnterSearchMode: handleEnterMessageSearchMode,
    onExitSearchMode: handleExitMessageSearchMode,
    onEnterSelectionMode: handleEnterMessageSelectionMode,
    onExitSelectionMode: handleExitMessageSelectionMode,
    onSearchQueryChange: handleMessageSearchQueryChange,
    onNavigateSearchUp: handleNavigateSearchUp,
    onNavigateSearchDown: handleNavigateSearchDown,
    onFocusSearchInput: handleFocusSearchInput,
    onCopySelectedMessages: handleCopySelectedMessages,
    onDeleteSelectedMessages: handleDeleteSelectedMessages,
    onClose: handleClose,
    getInitials,
    getInitialsColor,
  };

  const messagesModel = {
    loading,
    loadError,
    messages,
    user,
    normalizedSearchQuery: normalizedMessageSearchQuery,
    messageInputHeight,
    composerContextualOffset,
    composerContainerHeight,
    openMenuMessageId,
    menuPlacement,
    menuSideAnchor,
    shouldAnimateMenuOpen,
    menuTransitionSourceId,
    menuOffsetX,
    expandedMessageIds: refs.expandedMessageIds,
    flashingMessageId,
    isFlashHighlightVisible,
    isSelectionMode,
    selectedMessageIds,
    searchMatchedMessageIds: isMessageSearchMode
      ? searchMatchedMessageIdSet
      : new Set<string>(),
    activeSearchMessageId: isMessageSearchMode ? activeSearchMessageId : null,
    showScrollToBottom: hasNewMessages || !isAtBottom,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    messagesContainerRef: refs.messagesContainerRef,
    messagesEndRef: refs.messagesEndRef,
    messageBubbleRefs: refs.messageBubbleRefs,
    initialMessageAnimationKeysRef: refs.initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef: refs.initialOpenJumpAnimationKeysRef,
    captionMessagesByAttachmentId,
    captionMessageIds,
    closeMessageMenu: closeViewportMessageMenu,
    toggleMessageMenu,
    handleToggleExpand: refs.handleToggleExpand,
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleDeleteMessage,
    onToggleMessageSelection: handleToggleMessageSelection,
    getAttachmentFileName,
    getAttachmentFileKind,
    getImageMessageUrl,
    getPdfMessagePreview,
    documentPreviewUrl,
    documentPreviewName,
    isDocumentPreviewVisible,
    closeDocumentPreview,
    imagePreviewUrl,
    imagePreviewName,
    isImagePreviewVisible,
    closeImagePreview,
    openImageInPortal,
    openDocumentInPortal,
    onScrollToBottom: scrollToBottom,
    onLoadOlderMessages: loadOlderMessages,
    onRetryLoadMessages: retryLoadMessages,
  };

  const composerModel = {
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
    messageInputRef: refs.messageInputRef,
    composerContainerRef: refs.composerContainerRef,
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
    onSendMessage: handleSendMessage,
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
  };

  return {
    headerModel,
    messagesModel,
    composerModel,
    isAtTop,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    handleChatPortalBackgroundClick,
  };
};
