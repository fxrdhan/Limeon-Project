import { useAuthStore } from '@/store/authStore';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChatHeaderModel } from '../components/ChatHeader';
import type { ComposerPanelModel } from '../components/ComposerPanel';
import type { MessagesPaneModel } from '../components/MessagesPane';
import { isPresenceFresh } from '../components/header/presence';
import type { ChatSidebarPanelProps } from '../types';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { computeDmChannelId } from '../utils/channel';
import { getAttachmentCaptionData } from '../utils/message-derivations';
import { useChatBulkDelete } from './useChatBulkDelete';
import { useChatComposer } from './useChatComposer';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatViewport } from './useChatViewport';
import { useComposerAttachmentPreview } from './useComposerAttachmentPreview';
import { useMessageImagePreviews } from './useMessageImagePreviews';
import { useMessagePdfPreviews } from './useMessagePdfPreviews';
import { useMessagesPanePreviews } from './useMessagesPanePreviews';
import { useTargetProfilePhoto } from './useTargetProfilePhoto';

export const useChatSidebarController = ({
  isOpen,
  onClose,
  targetUser,
}: ChatSidebarPanelProps) => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const { user } = useAuthStore();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const chatHeaderContainerRef = useRef<HTMLDivElement>(null);
  const messageBubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const initialMessageAnimationKeysRef = useRef<Set<string>>(new Set());
  const initialOpenJumpAnimationKeysRef = useRef<Set<string>>(new Set());
  const closeMessageMenuRef = useRef<() => void>(() => {});
  const scheduleScrollMessagesToBottomRef = useRef<() => void>(() => {});
  /* c8 ignore next */
  const currentChannelId =
    user && targetUser ? computeDmChannelId(user.id, targetUser.id) : null;
  const closeMessageMenu = useCallback(() => {
    closeMessageMenuRef.current();
  }, []);
  const scheduleScrollMessagesToBottom = useCallback(() => {
    scheduleScrollMessagesToBottomRef.current();
  }, []);

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
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
  });

  const focusMessageComposer = useCallback(() => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    textarea.focus();
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, []);

  const composer = useChatComposer({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
    closeMessageMenu,
    scheduleScrollMessagesToBottom,
    messageInputRef,
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
    closeMessageMenu,
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
    messagesContainerRef,
    messagesEndRef,
    composerContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
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
  closeMessageMenuRef.current = closeViewportMessageMenu;
  scheduleScrollMessagesToBottomRef.current =
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
  } = useMessagesPanePreviews();
  const { getImageMessageUrl } = useMessageImagePreviews({ messages });
  const { getPdfMessagePreview } = useMessagePdfPreviews({
    messages,
    getAttachmentFileName,
    getAttachmentFileKind,
  });
  const { captionMessagesByAttachmentId, captionMessageIds } = useMemo(
    () => getAttachmentCaptionData(messages),
    [messages]
  );
  const {
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
  } = useComposerAttachmentPreview({
    pendingComposerAttachments,
    onAttachImageClick: handleAttachImageClick,
    onAttachDocumentClick: handleAttachDocumentClick,
    onRemovePendingComposerAttachment: removePendingComposerAttachment,
    onOpenComposerImagePreview: openComposerImagePreview,
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

  const handleToggleExpand = useCallback((messageId: string) => {
    setExpandedMessageIds(previousIds => {
      const nextIds = new Set(previousIds);
      if (nextIds.has(messageId)) {
        nextIds.delete(messageId);
      } else {
        nextIds.add(messageId);
      }
      return nextIds;
    });
  }, []);

  const handleDeleteSelectedMessages = useChatBulkDelete({
    user,
    selectedVisibleMessages,
    setSelectedMessageIds,
    deleteMessage: handleDeleteMessage,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const headerModel = useMemo<ChatHeaderModel>(
    () => ({
      targetUser,
      displayTargetPhotoUrl,
      isTargetOnline:
        typeof isTargetOnline === 'boolean'
          ? isTargetOnline
          : targetUserPresence?.is_online === true &&
            isPresenceFresh(targetUserPresence.last_seen),
      targetUserPresence,
      targetUserPresenceError,
      isSearchMode: isMessageSearchMode,
      searchQuery: messageSearchQuery,
      searchState: messageSearchState,
      searchResultCount: searchMatchedMessageIds.length,
      activeSearchResultIndex: Math.max(activeSearchResultIndex, 0),
      canNavigateSearchUp,
      canNavigateSearchDown,
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
    }),
    [
      activeSearchResultIndex,
      canDeleteSelectedMessages,
      canNavigateSearchDown,
      canNavigateSearchUp,
      displayTargetPhotoUrl,
      handleClose,
      handleCopySelectedMessages,
      handleDeleteSelectedMessages,
      handleEnterMessageSearchMode,
      handleEnterMessageSelectionMode,
      handleExitMessageSearchMode,
      handleExitMessageSelectionMode,
      handleFocusSearchInput,
      handleMessageSearchQueryChange,
      handleNavigateSearchDown,
      handleNavigateSearchUp,
      isMessageSearchMode,
      isSelectionMode,
      isTargetOnline,
      messageSearchQuery,
      messageSearchState,
      searchInputRef,
      searchMatchedMessageIds.length,
      selectedVisibleMessages.length,
      targetUser,
      targetUserPresence,
      targetUserPresenceError,
    ]
  );

  const messagesModel = useMemo<MessagesPaneModel>(
    () => ({
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
      expandedMessageIds,
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
      messagesContainerRef,
      messagesEndRef,
      messageBubbleRefs,
      initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef,
      captionMessagesByAttachmentId,
      captionMessageIds,
      closeMessageMenu: closeViewportMessageMenu,
      toggleMessageMenu,
      handleToggleExpand,
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
    }),
    [
      activeSearchMessageId,
      captionMessageIds,
      captionMessagesByAttachmentId,
      closeDocumentPreview,
      closeImagePreview,
      closeViewportMessageMenu,
      composerContainerHeight,
      composerContextualOffset,
      documentPreviewName,
      documentPreviewUrl,
      expandedMessageIds,
      flashingMessageId,
      getImageMessageUrl,
      getPdfMessagePreview,
      handleCopyMessage,
      handleDeleteMessage,
      handleDownloadMessage,
      handleEditMessage,
      handleToggleExpand,
      handleToggleMessageSelection,
      hasNewMessages,
      hasOlderMessages,
      imagePreviewName,
      imagePreviewUrl,
      initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef,
      isAtBottom,
      isDocumentPreviewVisible,
      isFlashHighlightVisible,
      isImagePreviewVisible,
      isLoadingOlderMessages,
      isMessageSearchMode,
      isSelectionMode,
      loadError,
      loadOlderMessages,
      loading,
      menuOffsetX,
      menuPlacement,
      menuSideAnchor,
      menuTransitionSourceId,
      messageBubbleRefs,
      messageInputHeight,
      messages,
      messagesContainerRef,
      messagesEndRef,
      normalizedMessageSearchQuery,
      olderMessagesError,
      openDocumentInPortal,
      openImageInPortal,
      openMenuMessageId,
      retryLoadMessages,
      scrollToBottom,
      searchMatchedMessageIdSet,
      selectedMessageIds,
      shouldAnimateMenuOpen,
      toggleMessageMenu,
      user,
    ]
  );

  const composerModel = useMemo<ComposerPanelModel>(
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

  return {
    chatHeaderContainerRef,
    isAtTop,
    handleChatPortalBackgroundClick,
    headerModel,
    messagesModel,
    composerModel,
  };
};
