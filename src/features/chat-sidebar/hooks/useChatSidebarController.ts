import { useAuthStore } from '@/store/authStore';
import { useCallback, useRef, useState } from 'react';
import type { ChatSidebarPanelProps } from '../types';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { generateChannelId } from '../utils/channel';
import { isPresenceFresh } from '../components/header/presence';
import { useChatComposer } from './useChatComposer';
import { useChatBulkDelete } from './useChatBulkDelete';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatViewport } from './useChatViewport';
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
    user && targetUser ? generateChannelId(user.id, targetUser.id) : null;
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

  const interaction = useChatInteractionModes({
    isOpen,
    currentChannelId,
    messages,
    setMessages,
    user,
    targetUser,
    closeMessageMenu,
    getAttachmentFileName,
  });

  const viewport = useChatViewport({
    isOpen,
    currentChannelId,
    messages,
    userId: user?.id,
    targetUserId: targetUser?.id,
    messagesCount: messages.length,
    loading,
    messageInputHeight: composer.messageInputHeight,
    composerContextualOffset: composer.composerContextualOffset,
    isMessageInputMultiline: composer.isMessageInputMultiline,
    pendingComposerAttachmentsCount: composer.pendingComposerAttachments.length,
    normalizedMessageSearchQuery: interaction.normalizedMessageSearchQuery,
    isMessageSearchMode: interaction.isMessageSearchMode,
    activeSearchMessageId: interaction.activeSearchMessageId,
    searchNavigationTick: interaction.searchNavigationTick,
    editingMessageId: composer.editingMessageId,
    focusMessageComposer,
    markMessageIdsAsRead,
    messagesContainerRef,
    messagesEndRef,
    composerContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
  });
  closeMessageMenuRef.current = viewport.closeMessageMenu;
  scheduleScrollMessagesToBottomRef.current =
    viewport.scheduleScrollMessagesToBottom;

  const toggleMessageMenu = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      composer.closeAttachModal();
      viewport.toggleMessageMenu(anchor, messageId, preferredSide);
    },
    [composer, viewport]
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
    selectedVisibleMessages: interaction.selectedVisibleMessages,
    setSelectedMessageIds: interaction.setSelectedMessageIds,
    deleteMessage: composer.handleDeleteMessage,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  const resolvedTargetOnline =
    typeof isTargetOnline === 'boolean'
      ? isTargetOnline
      : targetUserPresence?.is_online === true &&
        isPresenceFresh(targetUserPresence.last_seen);

  const headerModel = {
    targetUser,
    displayTargetPhotoUrl,
    isTargetOnline: resolvedTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    isSearchMode: interaction.isMessageSearchMode,
    searchQuery: interaction.messageSearchQuery,
    searchState: interaction.messageSearchState,
    searchResultCount: interaction.searchMatchedMessageIds.length,
    activeSearchResultIndex: Math.max(interaction.activeSearchResultIndex, 0),
    canNavigateSearchUp: interaction.canNavigateSearchUp,
    canNavigateSearchDown: interaction.canNavigateSearchDown,
    isSelectionMode: interaction.isSelectionMode,
    selectedMessageCount: interaction.selectedVisibleMessages.length,
    canDeleteSelectedMessages: interaction.canDeleteSelectedMessages,
    searchInputRef: interaction.searchInputRef,
    onEnterSearchMode: interaction.handleEnterMessageSearchMode,
    onExitSearchMode: interaction.handleExitMessageSearchMode,
    onEnterSelectionMode: interaction.handleEnterMessageSelectionMode,
    onExitSelectionMode: interaction.handleExitMessageSelectionMode,
    onSearchQueryChange: interaction.handleMessageSearchQueryChange,
    onNavigateSearchUp: interaction.handleNavigateSearchUp,
    onNavigateSearchDown: interaction.handleNavigateSearchDown,
    onFocusSearchInput: interaction.handleFocusSearchInput,
    onCopySelectedMessages: interaction.handleCopySelectedMessages,
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
    messageInputHeight: composer.messageInputHeight,
    composerContextualOffset: composer.composerContextualOffset,
    composerContainerHeight: viewport.composerContainerHeight,
    openMenuMessageId: viewport.openMenuMessageId,
    menuPlacement: viewport.menuPlacement,
    menuSideAnchor: viewport.menuSideAnchor,
    shouldAnimateMenuOpen: viewport.shouldAnimateMenuOpen,
    menuTransitionSourceId: viewport.menuTransitionSourceId,
    menuOffsetX: viewport.menuOffsetX,
    expandedMessageIds,
    flashingMessageId: viewport.flashingMessageId,
    isFlashHighlightVisible: viewport.isFlashHighlightVisible,
    isSelectionMode: interaction.isSelectionMode,
    selectedMessageIds: interaction.selectedMessageIds,
    searchQuery: interaction.isMessageSearchMode
      ? interaction.messageSearchQuery
      : '',
    searchMatchedMessageIds: interaction.isMessageSearchMode
      ? interaction.searchMatchedMessageIdSet
      : new Set<string>(),
    activeSearchMessageId: interaction.isMessageSearchMode
      ? interaction.activeSearchMessageId
      : null,
    showScrollToBottom: viewport.hasNewMessages || !viewport.isAtBottom,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    messagesContainerRef,
    messagesEndRef,
    messageBubbleRefs,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    closeMessageMenu: viewport.closeMessageMenu,
    toggleMessageMenu,
    handleToggleExpand,
    handleEditMessage: composer.handleEditMessage,
    handleCopyMessage: composer.handleCopyMessage,
    handleDownloadMessage: composer.handleDownloadMessage,
    handleDeleteMessage: composer.handleDeleteMessage,
    onToggleMessageSelection: interaction.handleToggleMessageSelection,
    getAttachmentFileName,
    getAttachmentFileKind,
    onScrollToBottom: viewport.scrollToBottom,
    onLoadOlderMessages: loadOlderMessages,
    onRetryLoadMessages: retryLoadMessages,
  };

  const composerModel = {
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
    messageInputRef,
    composerContainerRef,
    attachButtonRef: composer.attachButtonRef,
    attachModalRef: composer.attachModalRef,
    imageInputRef: composer.imageInputRef,
    documentInputRef: composer.documentInputRef,
    audioInputRef: composer.audioInputRef,
    onMessageChange: composer.setMessage,
    onKeyDown: composer.handleKeyPress,
    onPaste: composer.handleComposerPaste,
    onSendMessage: () => {
      void composer.handleSendMessage();
    },
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
    onRemovePendingComposerAttachment: composer.removePendingComposerAttachment,
    onQueueComposerImage: composer.queueComposerImage,
  };

  return {
    chatHeaderContainerRef,
    isAtTop: viewport.isAtTop,
    handleChatPortalBackgroundClick: viewport.handleChatPortalBackgroundClick,
    headerModel,
    messagesModel,
    composerModel,
  };
};
