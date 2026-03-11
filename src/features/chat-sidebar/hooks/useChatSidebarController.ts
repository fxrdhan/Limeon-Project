import { useAuthStore } from '@/store/authStore';
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
import { useChatSidebarComposerModel } from './useChatSidebarComposerModel';
import { useChatSidebarHeaderModel } from './useChatSidebarHeaderModel';
import { useChatSidebarMessagesModel } from './useChatSidebarMessagesModel';
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

  const headerModel = useChatSidebarHeaderModel({
    targetUser,
    displayTargetPhotoUrl,
    session: {
      isTargetOnline,
      targetUserPresence,
      targetUserPresenceError,
    },
    interaction: {
      isMessageSearchMode,
      messageSearchQuery,
      messageSearchState,
      searchMatchedMessageIds,
      activeSearchResultIndex,
      canNavigateSearchUp,
      canNavigateSearchDown,
      hasMoreSearchResults,
      isSelectionMode,
      selectedVisibleMessages,
      canDeleteSelectedMessages,
      searchInputRef,
      handleEnterMessageSearchMode,
      handleExitMessageSearchMode,
      handleEnterMessageSelectionMode,
      handleExitMessageSelectionMode,
      handleMessageSearchQueryChange,
      handleNavigateSearchUp,
      handleNavigateSearchDown,
      handleFocusSearchInput,
      handleCopySelectedMessages,
    },
    handleDeleteSelectedMessages,
    handleClose,
  });

  const messagesModel = useChatSidebarMessagesModel({
    user,
    session: {
      loading,
      loadError,
      messages,
      hasOlderMessages,
      isLoadingOlderMessages,
      olderMessagesError,
      loadOlderMessages,
      retryLoadMessages,
    },
    interaction: {
      normalizedMessageSearchQuery,
      isMessageSearchMode,
      searchMatchedMessageIdSet,
      activeSearchMessageId,
      isSelectionMode,
      selectedMessageIds,
      handleToggleMessageSelection,
    },
    composer: {
      messageInputHeight,
      composerContextualOffset,
      handleEditMessage,
      handleCopyMessage,
      handleDownloadMessage,
      handleDeleteMessage,
    },
    viewport: {
      isAtBottom,
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
      scrollToBottom,
    },
    previewState: {
      captionMessagesByAttachmentId,
      captionMessageIds,
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
    },
    refs,
    toggleMessageMenu,
  });

  const composerModel = useChatSidebarComposerModel({
    composer: {
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
      attachButtonRef,
      attachModalRef,
      imageInputRef,
      documentInputRef,
      audioInputRef,
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
      openComposerImagePreview,
      closeComposerImagePreview,
      removePendingComposerAttachment,
      queueComposerImage,
    },
    previewState: {
      openImageActionsAttachmentId,
      imageActionsMenuPosition,
      composerDocumentPreviewUrl,
      composerDocumentPreviewName,
      isComposerDocumentPreviewVisible,
      imageActionsButtonRef,
      imageActionsMenuRef,
      imageActions,
      closeComposerDocumentPreview,
      openDocumentAttachmentInPortal,
      handleToggleImageActionsMenu,
    },
    viewport: {
      focusEditingTargetMessage,
    },
    refs,
  });

  return {
    headerModel,
    messagesModel,
    composerModel,
    isAtTop,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    handleChatPortalBackgroundClick,
  };
};
