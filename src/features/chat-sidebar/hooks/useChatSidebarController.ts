import { useAuthStore } from '@/store/authStore';
import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatSidebarPanelProps } from '../types';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import { generateChannelId } from '../utils/channel';
import { useChatComposer } from './useChatComposer';
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
  /* c8 ignore next */
  const currentChannelId =
    user && targetUser ? generateChannelId(user.id, targetUser.id) : null;

  const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
  const {
    messages,
    setMessages,
    loading,
    targetUserPresence,
    performClose,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    broadcastDeletedMessage,
    markMessageIdsAsRead,
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

  const closeMessageMenuRef = useRef<() => void>(() => {});
  const scheduleScrollToBottomRef = useRef<() => void>(() => {});
  const proxyCloseMessageMenu = useCallback(() => {
    closeMessageMenuRef.current();
  }, []);
  const proxyScheduleScrollMessagesToBottom = useCallback(() => {
    scheduleScrollToBottomRef.current();
  }, []);

  const composer = useChatComposer({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
    closeMessageMenu: proxyCloseMessageMenu,
    scheduleScrollMessagesToBottom: proxyScheduleScrollMessagesToBottom,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    broadcastDeletedMessage,
    messageInputRef,
    focusMessageComposer,
  });

  const interaction = useChatInteractionModes({
    isOpen,
    currentChannelId,
    messages,
    user,
    targetUser,
    closeMessageMenu: proxyCloseMessageMenu,
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
  scheduleScrollToBottomRef.current = viewport.scheduleScrollMessagesToBottom;

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

  const handleDeleteSelectedMessages = useCallback(async () => {
    if (!user) return;

    const deletableMessages = interaction.selectedVisibleMessages.filter(
      messageItem => messageItem.sender_id === user.id
    );

    if (deletableMessages.length === 0) {
      toast.error('Pilih minimal 1 pesan Anda untuk dihapus', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    const deletionResults = await Promise.all(
      deletableMessages.map(messageItem =>
        composer.handleDeleteMessage(messageItem, {
          suppressErrorToast: true,
        })
      )
    );

    const deletedMessageIds = new Set(
      deletableMessages
        .filter((_, index) => deletionResults[index])
        .map(messageItem => messageItem.id)
    );
    interaction.setSelectedMessageIds(previousSelectedIds => {
      const nextSelectedIds = new Set<string>();
      previousSelectedIds.forEach(messageId => {
        if (!deletedMessageIds.has(messageId)) {
          nextSelectedIds.add(messageId);
        }
      });
      return nextSelectedIds;
    });

    const deletedCount = deletedMessageIds.size;
    if (deletedCount === deletableMessages.length) {
      toast.success(`${deletedCount} pesan berhasil dihapus`, {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    if (deletedCount === 0) {
      toast.error('Gagal menghapus pesan terpilih', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    toast.error(`${deletedCount} pesan dihapus, sebagian gagal`, {
      toasterId: CHAT_SIDEBAR_TOASTER_ID,
    });
  }, [composer, interaction, user]);

  const handleClose = useCallback(() => {
    void performClose();
    onClose();
  }, [onClose, performClose]);

  const headerProps = {
    targetUser,
    displayTargetPhotoUrl,
    targetUserPresence,
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

  const messagesPaneProps = {
    loading,
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
  };

  const composerPanelProps = {
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
    onRemovePendingComposerAttachment: composer.removePendingComposerAttachment,
    onQueueComposerImage: composer.queueComposerImage,
  };

  return {
    chatHeaderContainerRef,
    isAtTop: viewport.isAtTop,
    handleChatPortalBackgroundClick: viewport.handleChatPortalBackgroundClick,
    headerProps,
    messagesPaneProps,
    composerPanelProps,
  };
};
